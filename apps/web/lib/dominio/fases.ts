/**
 * As sete fases da esteira (§6).
 *
 * `id` e o valor do enum lead_stage no Postgres — fica em ingles, como todo o
 * contrato do banco (decisao D6). `nome` e o que a pessoa le na tela.
 *
 * As fases sao FIXAS na v1: sao o processo da MX, nao uma preferencia de
 * board. A demanda por fases novas e coletada por 60 dias antes de abrir
 * customizacao (§11).
 */

export const FASES_ID = [
  "potenciais",
  "reuniao",
  "acompanhamento",
  "negociacao",
  "ganhou",
  "perdido",
  "posterior",
] as const;

export type FaseId = (typeof FASES_ID)[number];

/** O que a fase exige de quem entra nela (§6). */
export type Exigencia =
  | "nenhuma"
  | "data-proxima-acao"
  | "valor-estimado"
  | "premio-anual"
  | "motivo-perda"
  | "data-retomada";

export type Fase = {
  id: FaseId;
  nome: string;
  /** Token CSS da cor de identificacao (§4.1). */
  cor: string;
  /** Fases terminais fecham o cartao e limpam a proxima acao. */
  terminal: boolean;
  exige: Exigencia;
  /** Texto da coluna vazia — estado vazio ensina (§3, principio 9). */
  vazio: string;
};

export const FASES: readonly Fase[] = [
  {
    id: "potenciais",
    nome: "Clientes potenciais",
    cor: "var(--st-potenciais)",
    terminal: false,
    exige: "nenhuma",
    vazio: "Ninguém esperando atendimento. Novos pedidos caem aqui.",
  },
  {
    id: "reuniao",
    nome: "Reunião",
    cor: "var(--st-reuniao)",
    terminal: false,
    exige: "data-proxima-acao",
    vazio: "Marcou uma conversa? Arraste o cartão para cá.",
  },
  {
    id: "acompanhamento",
    nome: "Acompanhamento",
    cor: "var(--st-acomp)",
    terminal: false,
    exige: "data-proxima-acao",
    vazio: "Cotações em andamento aparecem aqui.",
  },
  {
    id: "negociacao",
    nome: "Negociação",
    cor: "var(--st-neg)",
    terminal: false,
    exige: "valor-estimado",
    vazio: "Proposta na mesa? Traga o cartão e informe o valor.",
  },
  {
    id: "ganhou",
    nome: "Ganhou",
    cor: "var(--st-ganhou)",
    terminal: true,
    exige: "premio-anual",
    vazio: "Nenhum fechamento ainda.",
  },
  {
    id: "perdido",
    nome: "Perdido",
    cor: "var(--st-perdido)",
    terminal: true,
    exige: "motivo-perda",
    vazio: "Nada perdido por aqui.",
  },
  {
    id: "posterior",
    nome: "Contato posterior",
    cor: "var(--st-post)",
    terminal: true,
    exige: "data-retomada",
    vazio: "Quem pediu para falar depois espera aqui até a data.",
  },
] as const;

const PORFASE = new Map<FaseId, Fase>(FASES.map((f) => [f.id, f]));

export function fase(id: FaseId): Fase {
  const encontrada = PORFASE.get(id);
  if (!encontrada) {
    throw new Error(`Fase desconhecida: ${id}`);
  }
  return encontrada;
}

export function ehFaseValida(valor: string): valor is FaseId {
  return PORFASE.has(valor as FaseId);
}

export function ehTerminal(id: FaseId): boolean {
  return fase(id).terminal;
}
