import "server-only";

import { clienteServidor } from "../supabase/servidor";
import { linhaParaMetricas, linhasParaLeads, type LinhaMetricas } from "../dominio/mapear";
import type { Lead, LinhaBoard, Metricas } from "../dominio/tipos";

/**
 * Leituras da esteira. Tudo pela sessão, então a RLS vale.
 */

export type Evento = {
  id: number;
  tipo: string;
  autor: string | null;
  em: string;
  payload: Record<string, unknown>;
};

export type Referencias = {
  produtos: { id: number; label: string }[];
  motivosPerda: { id: number; label: string }[];
  origens: { id: number; slug: string; label: string }[];
  equipe: { id: string; nome: string; iniciais: string }[];
};

export async function lerLeads(): Promise<{ leads: Lead[]; erro: string | null }> {
  const supabase = await clienteServidor();
  const { data, error } = await supabase
    .from("v_leads_board")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return { leads: [], erro: error.message };
  return { leads: linhasParaLeads((data ?? []) as LinhaBoard[]), erro: null };
}

/**
 * Listas que alimentam os seletores da ficha e dos modais.
 *
 * Só as ativas: `widget-flutuante` e `widget-inline` continuam no banco por
 * causa de leads antigos, mas não têm por que aparecer num seletor.
 */
export async function lerReferencias(): Promise<Referencias> {
  const supabase = await clienteServidor();

  const [produtos, motivos, origens, equipe] = await Promise.all([
    supabase.from("products").select("id, label").eq("active", true).order("sort_order"),
    supabase.from("lost_reasons").select("id, label").eq("active", true).order("sort_order"),
    supabase.from("lead_sources").select("id, slug, label").eq("active", true).order("id"),
    supabase.from("profiles").select("id, full_name, initials").eq("active", true).order("full_name"),
  ]);

  return {
    produtos: (produtos.data ?? []).map((p) => ({ id: Number(p.id), label: String(p.label) })),
    motivosPerda: (motivos.data ?? []).map((m) => ({ id: Number(m.id), label: String(m.label) })),
    origens: (origens.data ?? []).map((o) => ({
      id: Number(o.id),
      slug: String(o.slug),
      label: String(o.label),
    })),
    equipe: (equipe.data ?? []).map((p) => ({
      id: String(p.id),
      nome: String(p.full_name),
      iniciais: String(p.initials ?? "?"),
    })),
  };
}

/**
 * Histórico do lead, do mais recente para o mais antigo (§5.4).
 *
 * O nome do autor vem junto: sem ele a timeline vira "alguém mudou alguma
 * coisa", que não serve para nada numa equipe de mais de uma pessoa.
 */
export async function lerHistorico(leadId: string): Promise<Evento[]> {
  const supabase = await clienteServidor();

  const { data, error } = await supabase
    .from("lead_events")
    .select("id, type, payload, created_at, profiles(full_name)")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });

  if (error) return [];

  return (data ?? []).map((e) => {
    const perfil = e.profiles as { full_name?: string } | null;
    return {
      id: Number(e.id),
      tipo: String(e.type),
      autor: perfil?.full_name ?? null,
      em: String(e.created_at),
      payload: (e.payload ?? {}) as Record<string, unknown>,
    };
  });
}

/**
 * Faixa de métricas (§5.3, F3-1).
 *
 * Lê da view, que é a fonte única (lacuna 08). Recalcular aqui criaria um
 * segundo número para a taxa de ganho, e a conversa vira "qual está certo?"
 * em vez de "por que estamos perdendo?".
 *
 * Falha devolve null em vez de zeros: uma faixa zerada mente, e o gestor
 * tomaria decisão em cima de "nenhum lead atrasado" quando na verdade a
 * consulta caiu.
 */
export async function lerMetricas(): Promise<Metricas | null> {
  const supabase = await clienteServidor();
  const { data, error } = await supabase.from("v_pipeline_metrics").select("*").maybeSingle();

  if (error || !data) return null;
  return linhaParaMetricas(data as unknown as LinhaMetricas);
}

/**
 * Sinais de SLA (F3-5).
 *
 * O plano previa alertas por e-mail; com o e-mail fora de escopo, eles passam
 * a ser lidos dentro do admin. A limitação é honesta e vale registrar: só
 * alcança quem está com a tela aberta. Um lead que chega às 18h e fica sem
 * responsável não acorda ninguém — quem sustenta a meta de 1 dia útil é a
 * próxima ação automática criada na captura.
 */
export type SinaisSla = {
  semDonoForaDoPrazo: number;
  followUpsAtrasados: number;
  maiorAtrasoEmDias: number;
  retomadasPendentes: number;
};

export async function lerSinaisSla(): Promise<SinaisSla | null> {
  const supabase = await clienteServidor();
  const { data, error } = await supabase.from("v_sinais_sla").select("*").maybeSingle();

  if (error || !data) return null;

  const linha = data as unknown as Record<string, number>;
  return {
    semDonoForaDoPrazo: Number(linha.sem_dono_fora_do_prazo ?? 0),
    followUpsAtrasados: Number(linha.follow_ups_atrasados ?? 0),
    maiorAtrasoEmDias: Number(linha.maior_atraso_em_dias ?? 0),
    retomadasPendentes: Number(linha.retomadas_pendentes ?? 0),
  };
}
