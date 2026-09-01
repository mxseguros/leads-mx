import "server-only";

import { clienteServidor } from "../supabase/servidor";
import { ehFaseValida, fase, type FaseId } from "../dominio/fases";
import { efeitosDaEntrada, validarEntrada, type DadosDaMudanca } from "../dominio/regras";
import { proximoDiaUtil } from "../captura/registrar";
import type { Perfil } from "../api";

/**
 * Operações da esteira (§6, §8).
 *
 * Usa o cliente da SESSÃO, não a chave secreta: aqui existe uma pessoa
 * logada, e a RLS deve valer. É o oposto da captura pública, onde não há
 * sessão e a autoridade é a própria rota.
 *
 * Toda mudança grava evento em `lead_events` com autor e horário — sem isso o
 * histórico mente e o Desfazer não tem o que reverter.
 */

export type FalhaServico = { codigo: string; mensagem: string; campo?: string; status: number };

export type Resultado<T> = { ok: true; dados: T } | { ok: false; falha: FalhaServico };

function falha(status: number, codigo: string, mensagem: string, campo?: string): Resultado<never> {
  return { ok: false, falha: { status, codigo, mensagem, campo } };
}

/**
 * Colunas que uma mudança de fase pode sobrescrever.
 *
 * Antes de mover, o valor atual de cada uma é fotografado no evento. É o que
 * torna o Desfazer um desfazer de verdade: sem a foto, desfazer "Ganhou"
 * devolvia a fase mas deixava `won_value` e `insurer` gravados e a próxima
 * ação apagada — o lead voltava para Negociação invisível para o radar de
 * follow-up, que é justamente o que a regra de fase existe para impedir.
 */
const COLUNAS_DA_FASE = [
  "next_action_label",
  "next_action_at",
  "estimated_value",
  "won_value",
  "insurer",
  "won_at",
  "lost_at",
  "lost_reason_id",
  "resume_at",
] as const;

/** Campos que a ficha deixa editar direto, sem passar por regra de fase (§5.4). */
const CAMPOS_EDITAVEIS: Record<string, string> = {
  nome: "first_name",
  sobrenome: "last_name",
  telefone: "phone",
  email: "email",
  empresa: "company",
  cnpj: "cnpj",
  produtoId: "product_id",
  responsavelId: "owner_id",
  valorEstimado: "estimated_value",
  proximaAcao: "next_action_label",
  proximaAcaoEm: "next_action_at",
};

export async function moverFase(
  leadId: string,
  destino: string,
  dados: DadosDaMudanca,
  autor: Perfil,
): Promise<Resultado<{ de: FaseId; para: FaseId }>> {
  if (!ehFaseValida(destino)) {
    return falha(422, "fase_invalida", "Fase desconhecida.", "fase");
  }

  const supabase = await clienteServidor();

  // Uma string literal só, sem join e sem concatenação: o supabase-js infere o
  // tipo do retorno lendo o TEXTO do select em tempo de compilação, e qualquer
  // expressão no lugar dele derruba a inferência.
  const { data: atual, error: erroLeitura } = await supabase
    .from("leads")
    .select("id, stage, next_action_label, next_action_at, estimated_value, won_value, insurer, won_at, lost_at, lost_reason_id, resume_at")
    .eq("id", leadId)
    .is("deleted_at", null)
    .maybeSingle();

  if (erroLeitura) {
    return falha(500, "falha_leitura", "Não conseguimos ler o lead agora.");
  }
  if (!atual) {
    return falha(404, "lead_nao_encontrado", "Lead não encontrado.");
  }

  const de = atual.stage as FaseId;
  if (de === destino) {
    return falha(422, "mesma_fase", "O lead já está nesta fase.", "fase");
  }

  // A REGRA MORA AQUI. A interface desabilita o botão por conveniência; esta
  // checagem é o que recusa quem chama a rota direto (portão de aceite F2-6).
  const veredito = validarEntrada(destino, dados);
  if (!veredito.ok) {
    return falha(422, "dados_obrigatorios", veredito.mensagem, veredito.campo);
  }

  const efeitos = efeitosDaEntrada(destino, dados, proximoDiaUtil);

  // Fotografa só o que este movimento vai sobrescrever. Guardar o lead inteiro
  // encheria o histórico de ruído e ainda copiaria dado pessoal sem motivo.
  const anterior: Record<string, unknown> = {};
  const linha = atual as unknown as Record<string, unknown>;
  for (const coluna of COLUNAS_DA_FASE) {
    if (coluna in efeitos) anterior[coluna] = linha[coluna] ?? null;
  }

  const { error: erroUpdate } = await supabase
    .from("leads")
    .update({ stage: destino, ...efeitos })
    .eq("id", leadId);

  if (erroUpdate) {
    return falha(500, "falha_gravacao", `Não conseguimos mover o lead: ${erroUpdate.message}`);
  }

  await supabase.from("lead_events").insert({
    lead_id: leadId,
    type: "stage_changed",
    actor_id: autor.id,
    payload: {
      from: de,
      to: destino,
      de: fase(de).nome,
      para: fase(destino).nome,
      anterior,
      ...limparNulos(dados),
    },
  });

  return { ok: true, dados: { de, para: destino } };
}

/**
 * Desfazer (§6, F2-8): restaura a fase E os campos que a mudança sobrescreveu.
 *
 * Lê a foto guardada no último `stage_changed`, em vez de confiar no que o
 * cliente mandou. Sem isso, desfazer "Ganhou" devolvia a fase mas mantinha
 * `won_value` e `insurer` e deixava a próxima ação apagada — o lead voltava
 * para uma fase ativa sem data, invisível em "atrasados" e em "hoje".
 *
 * Não exige os dados da fase de destino: ela já estava lá antes, com o que
 * tinha. Cobrar de novo travaria justamente o botão que conserta o engano.
 *
 * Não apaga o evento desfeito. A pessoa moveu e depois voltou; as duas coisas
 * aconteceram, e o histórico registra as duas.
 */
export async function desfazerFase(
  leadId: string,
  autor: Perfil,
): Promise<Resultado<{ para: FaseId }>> {
  const supabase = await clienteServidor();

  const { data: eventos, error: erroBusca } = await supabase
    .from("lead_events")
    .select("id, payload")
    .eq("lead_id", leadId)
    .eq("type", "stage_changed")
    .order("created_at", { ascending: false })
    .limit(5);

  if (erroBusca) {
    return falha(500, "falha_leitura", "Não conseguimos ler o histórico agora.");
  }

  // Pula os que já são desfazer: desfazer duas vezes seguidas não deve
  // ping-pongar entre as mesmas duas fases.
  const alvo = (eventos ?? []).find(
    (e) => !(e.payload as Record<string, unknown> | null)?.desfazer,
  );

  const payload = (alvo?.payload ?? null) as Record<string, unknown> | null;
  const origem = payload?.from as string | undefined;

  if (!alvo || !origem || !ehFaseValida(origem)) {
    return falha(
      422,
      "nada_a_desfazer",
      "Não há movimentação recente para desfazer neste lead.",
    );
  }

  const anterior = (payload?.anterior ?? {}) as Record<string, unknown>;

  const { error } = await supabase
    .from("leads")
    .update({ stage: origem, ...anterior })
    .eq("id", leadId)
    .is("deleted_at", null);

  if (error) {
    return falha(500, "falha_gravacao", "Não conseguimos desfazer agora.");
  }

  await supabase.from("lead_events").insert({
    lead_id: leadId,
    type: "stage_changed",
    actor_id: autor.id,
    payload: {
      to: origem,
      para: fase(origem).nome,
      desfazer: true,
      revertendo: alvo.id,
    },
  });

  return { ok: true, dados: { para: origem } };
}

export async function atualizarCampos(
  leadId: string,
  entrada: Record<string, unknown>,
  autor: Perfil,
): Promise<Resultado<{ alterados: string[] }>> {
  const supabase = await clienteServidor();

  const patch: Record<string, unknown> = {};
  const alterados: string[] = [];

  for (const [campoApp, valor] of Object.entries(entrada)) {
    const coluna = CAMPOS_EDITAVEIS[campoApp];
    if (!coluna) continue; // Campo desconhecido é ignorado, não é erro.
    patch[coluna] = valor === "" ? null : valor;
    alterados.push(campoApp);
  }

  if (alterados.length === 0) {
    return falha(422, "nada_a_atualizar", "Nenhum campo editável foi enviado.");
  }

  const { error } = await supabase
    .from("leads")
    .update(patch)
    .eq("id", leadId)
    .is("deleted_at", null);

  if (error) {
    // O check de telefone e o de CNPJ vivem no banco; a mensagem dele é em
    // inglês e não serve para a tela.
    if (error.message.includes("leads_phone_check")) {
      return falha(422, "telefone_invalido", "Telefone precisa ter DDD + 9 dígitos.", "telefone");
    }
    if (error.message.includes("leads_cnpj_check")) {
      return falha(422, "cnpj_invalido", "CNPJ precisa ter 14 dígitos.", "cnpj");
    }
    return falha(500, "falha_gravacao", "Não conseguimos salvar a alteração.");
  }

  // Atribuir responsável é evento próprio: é o que responde "quem pegou este
  // lead e quando" sem ler o diff de campos.
  const tipo = alterados.includes("responsavelId")
    ? "assigned"
    : alterados.some((c) => c.startsWith("proximaAcao"))
      ? "next_action"
      : "field_changed";

  await supabase.from("lead_events").insert({
    lead_id: leadId,
    type: tipo,
    actor_id: autor.id,
    payload: limparNulos(entrada),
  });

  return { ok: true, dados: { alterados } };
}

export async function adicionarNota(
  leadId: string,
  texto: string,
  autor: Perfil,
): Promise<Resultado<{ id: number }>> {
  const limpo = (texto ?? "").trim();
  if (!limpo) {
    return falha(422, "nota_vazia", "Escreva alguma coisa antes de adicionar.", "texto");
  }
  if (limpo.length > 2000) {
    return falha(422, "nota_longa", "A nota passou de 2000 caracteres.", "texto");
  }

  const supabase = await clienteServidor();
  const { data, error } = await supabase
    .from("lead_events")
    .insert({ lead_id: leadId, type: "note", actor_id: autor.id, payload: { text: limpo } })
    .select("id")
    .single();

  if (error) {
    return falha(500, "falha_gravacao", "Não conseguimos salvar a nota.");
  }
  return { ok: true, dados: { id: Number(data.id) } };
}

/**
 * Exclusão do §5.4: soft delete, só gestor, com auditoria.
 *
 * O evento fica porque `lead_events` tem cascade no lead — mas o lead não é
 * apagado de verdade, então o histórico sobrevive e uma auditoria futura
 * consegue responder quem excluiu e quando.
 */
export async function excluirLead(
  leadId: string,
  autor: Perfil,
): Promise<Resultado<{ id: string }>> {
  const supabase = await clienteServidor();

  await supabase.from("lead_events").insert({
    lead_id: leadId,
    type: "system",
    actor_id: autor.id,
    payload: { acao: "lead_excluido", por: autor.nome },
  });

  const { error } = await supabase
    .from("leads")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", leadId);

  if (error) {
    return falha(500, "falha_gravacao", "Não conseguimos excluir o lead.");
  }
  return { ok: true, dados: { id: leadId } };
}

/** Tira null e undefined do payload do evento, para o histórico não virar ruído. */
function limparNulos(objeto: Record<string, unknown>): Record<string, unknown> {
  const saida: Record<string, unknown> = {};
  for (const [chave, valor] of Object.entries(objeto)) {
    if (valor !== null && valor !== undefined && valor !== "") saida[chave] = valor;
  }
  return saida;
}
