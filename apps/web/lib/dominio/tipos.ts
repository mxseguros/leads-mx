import type { FaseId } from "./fases";

/**
 * Tipos do APLICATIVO, em portugues (decisao D6).
 *
 * A forma do banco fica em `LinhaBoard` e nao vaza para o resto do codigo:
 * quem converte e o mapeador em ./mapear.ts. A fronteira e explicita de
 * proposito — quando o schema mudar, quebra em um arquivo so.
 */

export type Papel = "gestor" | "consultor";

export type Pessoa = {
  id: string;
  nome: string;
  iniciais: string;
  papel: Papel;
  ativa: boolean;
};

export type Lead = {
  id: string;
  nome: string;
  sobrenome: string;
  nomeCompleto: string;
  /** Somente digitos: DDD + 9. A mascara e da interface. */
  telefone: string;
  email: string;
  empresa: string | null;

  fase: FaseId;
  responsavel: { id: string; nome: string; iniciais: string } | null;

  produto: string | null;
  origem: { slug: string; rotulo: string };
  origemDetalhe: string | null;

  valorEstimado: number | null;
  premioAnual: number | null;
  seguradora: string | null;

  proximaAcao: string | null;
  proximaAcaoEm: string | null;
  motivoPerda: string | null;
  retomarEm: string | null;

  criadoEm: string;

  /* Derivados — vem prontos da view v_leads_board, nao sao recalculados aqui.
     O "hoje" e o de Sao Paulo, resolvido no banco. */
  atrasado: boolean;
  paraHoje: boolean;
  diasDeVida: number;
  semResponsavel: boolean;
  terminal: boolean;
};

/** Espelho fiel de uma linha da view v_leads_board. Nao usar fora do mapeador. */
export type LinhaBoard = {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone: string;
  email: string;
  company: string | null;
  stage: FaseId;
  owner_id: string | null;
  owner_name: string | null;
  owner_initials: string | null;
  product_label: string | null;
  source_slug: string;
  source_label: string;
  source_detail: string | null;
  estimated_value: string | number | null;
  won_value: string | number | null;
  insurer: string | null;
  next_action_label: string | null;
  next_action_at: string | null;
  lost_reason_label: string | null;
  resume_at: string | null;
  created_at: string;
  is_late: boolean;
  is_today: boolean;
  age_days: number;
  is_unassigned: boolean;
  is_terminal: boolean;
};

export type Metricas = {
  novos7d: number;
  semResponsavel: number;
  emAndamento: number;
  valorEmNegociacao: number;
  ganhos30d: number;
  perdas30d: number;
  /** null quando ainda nao houve nenhum fechamento: 0% mentiria. */
  taxaGanho30d: number | null;
  atrasados: number;
  paraHoje: number;
};
