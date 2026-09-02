import "server-only";

import { z } from "zod";
import { clienteServidor } from "./supabase/servidor";
import type { Perfil } from "./api";

/**
 * Escrita das Configurações (§5.6, F3-6).
 *
 * Leitura fica em `configuracoes.ts`, que a landing também usa. Aqui só o que
 * exige sessão de gestor — e a RLS já garante isso do lado do banco, com as
 * políticas `*_write` que pedem `is_manager()`.
 */

export type FalhaConfig = { status: number; codigo: string; mensagem: string; campo?: string };
export type ResultadoConfig<T> = { ok: true; dados: T } | { ok: false; falha: FalhaConfig };

function falha(status: number, codigo: string, mensagem: string, campo?: string) {
  return { ok: false as const, falha: { status, codigo, mensagem, campo } };
}

const esquemaAjustes = z.object({
  numeroWhatsapp: z
    .string()
    .trim()
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => v === "" || (v.length >= 12 && v.length <= 13), {
      message: "Use o número com país e DDD — ex.: 5511999990000.",
    })
    .optional(),
  templateWhatsapp: z.string().trim().max(600).optional(),
  textoConsentimento: z.string().trim().min(20, "O texto está curto demais para valer como consentimento.").max(1000).optional(),
  urlPolitica: z.string().trim().url("Informe uma URL completa, com https://").optional(),
});

const CHAVES: Record<string, string> = {
  numeroWhatsapp: "whatsapp_number",
  templateWhatsapp: "wa_template",
  textoConsentimento: "consent_text",
  urlPolitica: "privacy_policy_url",
};

/**
 * Salva os ajustes de texto e número.
 *
 * Mexer no texto de consentimento gera uma VERSÃO NOVA, com a data de hoje.
 * Sem isso, os leads já capturados passariam a apontar para um texto que
 * ninguém leu — e a versão registrada em cada lead é o que sustenta a resposta
 * a um pedido do titular.
 */
export async function salvarAjustes(
  entrada: unknown,
  autor: Perfil,
): Promise<ResultadoConfig<{ alterados: string[]; novaVersao: string | null }>> {
  const r = esquemaAjustes.safeParse(entrada);
  if (!r.success) {
    const problema = r.error.issues[0];
    return falha(422, "dados_invalidos", problema?.message ?? "Confira os campos.", String(problema?.path[0] ?? ""));
  }

  const supabase = await clienteServidor();
  const alterados: string[] = [];
  let novaVersao: string | null = null;

  for (const [campo, valor] of Object.entries(r.data)) {
    if (valor === undefined) continue;

    const chave = CHAVES[campo];
    if (!chave) continue;

    const { error } = await supabase
      .from("settings")
      .upsert({ key: chave, value: JSON.stringify(valor) }, { onConflict: "key" });

    if (error) {
      return falha(
        error.code === "42501" ? 403 : 500,
        "falha_gravacao",
        error.code === "42501"
          ? "Só o gestor comercial pode alterar as configurações."
          : "Não conseguimos salvar a configuração.",
      );
    }
    alterados.push(campo);
  }

  if (alterados.includes("textoConsentimento")) {
    novaVersao = new Date().toISOString().slice(0, 10);
    await supabase
      .from("settings")
      .upsert({ key: "consent_version", value: JSON.stringify(novaVersao) }, { onConflict: "key" });
  }

  if (alterados.length === 0) {
    return falha(422, "nada_a_salvar", "Nenhum campo foi alterado.");
  }

  console.info(`[config] ${autor.nome} alterou: ${alterados.join(", ")}`);
  return { ok: true, dados: { alterados, novaVersao } };
}

/**
 * Ativa ou desativa um item de lista (motivos, produtos, origens).
 *
 * Desativar, e nunca apagar: lead antigo aponta para o motivo de perda, e
 * apagar quebraria a chave estrangeira ou apagaria a explicação de por que a
 * MX perdeu aquele negócio.
 */
export async function alternarItem(
  tabela: "lost_reasons" | "products" | "lead_sources",
  id: number,
  ativo: boolean,
): Promise<ResultadoConfig<{ id: number; ativo: boolean }>> {
  const supabase = await clienteServidor();
  const { error } = await supabase.from(tabela).update({ active: ativo }).eq("id", id);

  if (error) {
    return falha(
      error.code === "42501" ? 403 : 500,
      "falha_gravacao",
      error.code === "42501"
        ? "Só o gestor comercial pode alterar estas listas."
        : "Não conseguimos salvar a alteração.",
    );
  }
  return { ok: true, dados: { id, ativo } };
}

/** Acrescenta um motivo de perda novo à lista editável do §5.6. */
export async function criarMotivoPerda(
  label: unknown,
): Promise<ResultadoConfig<{ id: number; label: string }>> {
  const r = z.string().trim().min(3, "Escreva um motivo com pelo menos 3 letras.").max(80).safeParse(label);
  if (!r.success) {
    return falha(422, "dados_invalidos", r.error.issues[0]?.message ?? "Motivo inválido.", "label");
  }

  const supabase = await clienteServidor();
  const { data, error } = await supabase
    .from("lost_reasons")
    .insert({ label: r.data })
    .select("id, label")
    .single();

  if (error) {
    if (error.code === "23505") {
      return falha(409, "motivo_repetido", "Esse motivo já está na lista.", "label");
    }
    return falha(
      error.code === "42501" ? 403 : 500,
      "falha_gravacao",
      error.code === "42501"
        ? "Só o gestor comercial pode adicionar motivos."
        : "Não conseguimos salvar o motivo.",
    );
  }
  return { ok: true, dados: { id: Number(data.id), label: String(data.label) } };
}

/** Muda papel ou ativação de alguém da equipe. */
export async function atualizarPessoa(
  id: string,
  patch: { papel?: "gestor" | "consultor"; ativa?: boolean },
  autor: Perfil,
): Promise<ResultadoConfig<{ id: string }>> {
  // Um gestor que se rebaixa ou se desliga sozinho tranca a própria porta —
  // e pode deixar a MX sem nenhum gestor ativo.
  if (id === autor.id && (patch.papel === "consultor" || patch.ativa === false)) {
    return falha(
      422,
      "nao_pode_em_si",
      "Você não pode remover o próprio acesso de gestor. Peça a outro gestor.",
    );
  }

  const supabase = await clienteServidor();
  const campos: Record<string, unknown> = {};
  if (patch.papel) campos.role = patch.papel;
  if (patch.ativa !== undefined) campos.active = patch.ativa;

  const { error } = await supabase.from("profiles").update(campos).eq("id", id);
  if (error) {
    return falha(
      error.code === "42501" ? 403 : 500,
      "falha_gravacao",
      error.code === "42501"
        ? "Só o gestor comercial pode alterar a equipe."
        : "Não conseguimos salvar a alteração.",
    );
  }
  return { ok: true, dados: { id } };
}
