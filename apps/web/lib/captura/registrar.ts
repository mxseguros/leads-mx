import "server-only";

import { clienteAdministrador } from "../supabase/administrador";
import type { Captura } from "./esquema";

/**
 * Grava o lead vindo do formulário público (itens F1-4 e F1-6).
 *
 * Passa pela chave secreta de propósito: a captura pública NÃO tem sessão, e a
 * RLS não tem como distinguir um visitante legítimo de um robô. A autoridade é
 * desta função — ela só é chamada depois de validação, honeypot, Turnstile e
 * rate limit.
 */

const JANELA_DEDUPE_DIAS = 30;

export type ResultadoRegistro =
  | { status: "criado"; id: string }
  | { status: "duplicado"; id: string };

type Contexto = {
  ip: string | null;
  textoConsentimento: string;
  versaoConsentimento: string;
};

async function idDaOrigem(slug: string): Promise<number | null> {
  const supabase = clienteAdministrador();
  const { data } = await supabase
    .from("lead_sources")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  return data ? Number(data.id) : null;
}

async function idDoProduto(label: string | null | undefined): Promise<number | null> {
  if (!label) return null;
  const supabase = clienteAdministrador();
  const { data } = await supabase
    .from("products")
    .select("id")
    .eq("label", label)
    .eq("active", true)
    .maybeSingle();
  return data ? Number(data.id) : null;
}

/**
 * Procura lead com o mesmo telefone OU e-mail nos últimos 30 dias (§6).
 *
 * Considera lead excluído também: se a mesma pessoa voltou, ressuscitar o
 * cartão antigo conta mais do que criar um novo do zero. Ordena pelo mais
 * recente porque é o que tem o histórico que interessa.
 */
async function procurarDuplicata(dados: Captura): Promise<string | null> {
  const supabase = clienteAdministrador();
  const desde = new Date(Date.now() - JANELA_DEDUPE_DIAS * 86_400_000).toISOString();

  const { data } = await supabase
    .from("leads")
    .select("id")
    .gte("created_at", desde)
    .or(`phone.eq.${dados.telefone},email.eq.${dados.email}`)
    .order("created_at", { ascending: false })
    .limit(1);

  return data?.[0]?.id ? String(data[0].id) : null;
}

export async function registrarCaptura(
  dados: Captura,
  ctx: Contexto,
): Promise<ResultadoRegistro> {
  const supabase = clienteAdministrador();

  const existente = await procurarDuplicata(dados);
  if (existente) {
    // Não cria cartão novo: registra o pedido no lead que já existe e o traz
    // para o topo do board (§6). Dois cartões da mesma empresa fazem dois
    // consultores ligarem para a mesma pessoa no mesmo dia.
    await supabase.from("lead_events").insert({
      lead_id: existente,
      type: "duplicate_submission",
      actor_id: null,
      payload: {
        origem: dados.origem,
        origem_detalhe: dados.origemDetalhe ?? null,
        produto: dados.produto ?? null,
        utm: dados.utm ?? null,
      },
    });

    // updated_at sobe pelo gatilho; é o que reordena o cartão.
    await supabase
      .from("leads")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", existente);

    return { status: "duplicado", id: existente };
  }

  const [origemId, produtoId] = await Promise.all([
    idDaOrigem(dados.origem),
    idDoProduto(dados.produto),
  ]);

  if (origemId === null) {
    // source_id é NOT NULL. Origem desconhecida não pode derrubar a
    // captura — cai para 'landing'.
    console.warn(`[captura] origem desconhecida: ${dados.origem}`);
  }

  const origemFinal = origemId ?? (await idDaOrigem("landing"));
  if (origemFinal === null) {
    throw new Error("Nenhuma origem cadastrada — o seed de lead_sources não rodou.");
  }

  const { data, error } = await supabase
    .from("leads")
    .insert({
      first_name: dados.nome,
      last_name: dados.sobrenome,
      phone: dados.telefone,
      email: dados.email,
      product_id: produtoId,
      source_id: origemFinal,
      source_detail: dados.origemDetalhe ?? null,
      utm: dados.utm ?? null,
      stage: "potenciais",
      next_action_label: "1º contato",
      next_action_at: proximoDiaUtil(),
      consent_at: new Date().toISOString(),
      consent_text_version: ctx.versaoConsentimento,
      consent_ip: ctx.ip,
    })
    .select("id")
    .single();

  if (error) throw new Error(`Falha ao gravar o lead: ${error.message}`);

  const id = String(data.id);

  await supabase.from("lead_events").insert({
    lead_id: id,
    type: "created",
    actor_id: null,
    payload: {
      origem: dados.origem,
      origem_detalhe: dados.origemDetalhe ?? null,
      produto: dados.produto ?? null,
      utm: dados.utm ?? null,
      consentimento: { versao: ctx.versaoConsentimento, texto: ctx.textoConsentimento },
    },
  });

  return { status: "criado", id };
}

/**
 * D+1 útil no fuso de São Paulo (§6): todo lead novo nasce com "1º contato"
 * agendado. É a automação que sustenta a meta de 90% de contato em 1 dia útil.
 *
 * Sexta vira segunda, sábado e domingo viram segunda. Feriado não é tratado —
 * a lista de feriados muda todo ano e o custo de errar é o consultor ver um
 * follow-up um dia antes, não um lead perdido.
 */
export function proximoDiaUtil(base = new Date()): string {
  const saoPaulo = new Date(
    base.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }),
  );
  saoPaulo.setDate(saoPaulo.getDate() + 1);

  const diaDaSemana = saoPaulo.getDay(); // 0 domingo, 6 sábado
  if (diaDaSemana === 0) saoPaulo.setDate(saoPaulo.getDate() + 1);
  if (diaDaSemana === 6) saoPaulo.setDate(saoPaulo.getDate() + 2);

  const ano = saoPaulo.getFullYear();
  const mes = String(saoPaulo.getMonth() + 1).padStart(2, "0");
  const dia = String(saoPaulo.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}
