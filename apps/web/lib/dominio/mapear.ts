import type { Lead, LinhaBoard, Metricas } from "./tipos";

/**
 * A fronteira entre o ingles do banco e o portugues do aplicativo (decisao D6).
 *
 * Tudo que sai do Supabase passa por aqui. Nenhum componente deve conhecer
 * `first_name` ou `next_action_at`: quando o schema mudar, so este arquivo
 * quebra, e o compilador aponta onde.
 */

/**
 * numeric do Postgres chega como string no driver, para nao perder precisao.
 * Converter cedo e uma vez evita "R$ NaN" no cartao.
 */
function paraNumero(valor: string | number | null | undefined): number | null {
  if (valor === null || valor === undefined || valor === "") return null;
  const n = typeof valor === "number" ? valor : Number(valor);
  return Number.isFinite(n) ? n : null;
}

export function linhaParaLead(linha: LinhaBoard): Lead {
  return {
    id: linha.id,
    nome: linha.first_name,
    sobrenome: linha.last_name,
    nomeCompleto: linha.full_name,
    telefone: linha.phone,
    email: linha.email,
    empresa: linha.company,

    fase: linha.stage,
    responsavel: linha.owner_id
      ? {
          id: linha.owner_id,
          nome: linha.owner_name ?? "",
          iniciais: linha.owner_initials ?? "?",
        }
      : null,

    produto: linha.product_label,
    origem: { slug: linha.source_slug, rotulo: linha.source_label },
    origemDetalhe: linha.source_detail,

    valorEstimado: paraNumero(linha.estimated_value),
    premioAnual: paraNumero(linha.won_value),
    seguradora: linha.insurer,

    proximaAcao: linha.next_action_label,
    proximaAcaoEm: linha.next_action_at,
    motivoPerda: linha.lost_reason_label,
    retomarEm: linha.resume_at,

    criadoEm: linha.created_at,

    atrasado: linha.is_late,
    paraHoje: linha.is_today,
    diasDeVida: linha.age_days,
    semResponsavel: linha.is_unassigned,
    terminal: linha.is_terminal,
  };
}

export function linhasParaLeads(linhas: readonly LinhaBoard[]): Lead[] {
  return linhas.map(linhaParaLead);
}

/** Espelho de uma linha da view v_pipeline_metrics. */
export type LinhaMetricas = {
  new_7d: number;
  unassigned: number;
  active: number;
  negotiating_value: string | number | null;
  won_30d: number;
  lost_30d: number;
  late: number;
  due_today: number;
};

export function linhaParaMetricas(linha: LinhaMetricas): Metricas {
  const fechados = linha.won_30d + linha.lost_30d;

  return {
    novos7d: linha.new_7d,
    semResponsavel: linha.unassigned,
    emAndamento: linha.active,
    valorEmNegociacao: paraNumero(linha.negotiating_value) ?? 0,
    ganhos30d: linha.won_30d,
    perdas30d: linha.lost_30d,
    // Sem nenhum fechamento no periodo, "0%" seria mentira: nao ha taxa ainda.
    taxaGanho30d: fechados === 0 ? null : linha.won_30d / fechados,
    atrasados: linha.late,
    paraHoje: linha.due_today,
  };
}

/**
 * Ordem dos cartoes na coluna (§5.3): atrasados primeiro, depois pela proxima
 * acao mais proxima, depois pelos mais antigos. Quem nao tem data vai para o
 * fim — nao e urgente, mas tambem nao pode sumir.
 */
export function ordenarCartoes(leads: readonly Lead[]): Lead[] {
  return [...leads].sort((a, b) => {
    if (a.atrasado !== b.atrasado) return a.atrasado ? -1 : 1;

    const da = a.proximaAcaoEm;
    const db = b.proximaAcaoEm;
    if (da && db && da !== db) return da < db ? -1 : 1;
    if (da && !db) return -1;
    if (!da && db) return 1;

    return a.criadoEm < b.criadoEm ? -1 : a.criadoEm > b.criadoEm ? 1 : 0;
  });
}
