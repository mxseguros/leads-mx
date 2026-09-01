import "server-only";

import { clienteServidor } from "../supabase/servidor";
import { linhasParaLeads } from "../dominio/mapear";
import type { Lead, LinhaBoard } from "../dominio/tipos";

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
