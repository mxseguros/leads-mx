import { ehTerminal, fase, type FaseId } from "./fases";

/**
 * Regras de movimentação da esteira (§6).
 *
 * Este módulo é puro: não fala com banco, não lê sessão, não importa nada do
 * Next. É de propósito — a mesma função decide o que a interface desabilita e
 * o que a API recusa, e uma regra que existe em dois lugares diverge.
 *
 * A autoridade é o servidor (§5.7). A interface usa isto para não deixar a
 * pessoa cair num erro evitável; a API usa para recusar quem tentar pular a
 * interface.
 */

/** O que o modal de cada fase terminal coleta antes de confirmar (§6). */
export type DadosDaMudanca = {
  /** Data da próxima ação — exigida por reuniao e acompanhamento. */
  proximaAcaoEm?: string | null;
  proximaAcao?: string | null;
  /** Exigido por negociacao. */
  valorEstimado?: number | null;
  /** Exigido por ganhou. */
  premioAnual?: number | null;
  seguradora?: string | null;
  /** Exigido por perdido. */
  motivoPerdaId?: number | null;
  /** Exigida por posterior. */
  retomarEm?: string | null;
};

export type Recusa = { ok: false; campo: keyof DadosDaMudanca; mensagem: string };
export type Aprovacao = { ok: true };
export type Veredito = Recusa | Aprovacao;

const OK: Aprovacao = { ok: true };

function vazio(v: unknown): boolean {
  return v === null || v === undefined || (typeof v === "string" && v.trim() === "");
}

/** `2026-09-15` — recusa formato errado antes de o Postgres reclamar. */
function dataValida(v: unknown): boolean {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const [ano, mes, dia] = v.split("-").map(Number) as [number, number, number];
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  return (
    d.getUTCFullYear() === ano && d.getUTCMonth() === mes - 1 && d.getUTCDate() === dia
  );
}

function valorPositivo(v: unknown): boolean {
  return typeof v === "number" && Number.isFinite(v) && v > 0;
}

/**
 * O lead pode entrar nesta fase com estes dados?
 *
 * Devolve o CAMPO que falta, não só uma mensagem: a interface usa para focar o
 * campo certo, e a API para preencher `field` no corpo do erro (§8).
 */
export function validarEntrada(destino: FaseId, dados: DadosDaMudanca): Veredito {
  switch (destino) {
    case "potenciais":
      return OK;

    case "reuniao":
    case "acompanhamento":
      // Sem data, o lead some do radar: não aparece em atrasados nem em hoje,
      // e é exatamente assim que um lead ativo é esquecido.
      if (!dataValida(dados.proximaAcaoEm)) {
        return {
          ok: false,
          campo: "proximaAcaoEm",
          mensagem: "Informe a data da próxima ação.",
        };
      }
      return OK;

    case "negociacao":
      if (!valorPositivo(dados.valorEstimado)) {
        return {
          ok: false,
          campo: "valorEstimado",
          mensagem: "Informe o valor estimado da negociação.",
        };
      }
      return OK;

    case "ganhou":
      // Prêmio anual é o número que alimenta a taxa de ganho e a comparação
      // com a estimativa. Sem ele, "Ganhou" vira só uma coluna bonita.
      if (!valorPositivo(dados.premioAnual)) {
        return {
          ok: false,
          campo: "premioAnual",
          mensagem: "Informe o prêmio anual fechado.",
        };
      }
      return OK;

    case "perdido":
      if (vazio(dados.motivoPerdaId) || typeof dados.motivoPerdaId !== "number") {
        return {
          ok: false,
          campo: "motivoPerdaId",
          mensagem: "Escolha o motivo da perda.",
        };
      }
      return OK;

    case "posterior":
      if (!dataValida(dados.retomarEm)) {
        return {
          ok: false,
          campo: "retomarEm",
          mensagem: "Informe a data para retomar o contato.",
        };
      }
      return OK;
  }
}

/**
 * Reabrir um lead desfaz o ganho por inteiro, e não pela metade.
 *
 * Limpar só `won_at` deixava o lead numa fase ativa ainda exibindo "prêmio
 * anual R$ 91.200" na ficha. A métrica já não contava (ela olha `won_at`), mas
 * o consultor via um número de fechamento num negócio que voltou a ser
 * proposta.
 */
const FECHAMENTO_LIMPO = {
  won_at: null,
  won_value: null,
  insurer: null,
} as const;

/**
 * O que acontece com o lead ao entrar na fase, além dos campos coletados (§6).
 *
 * Devolve um objeto no formato do BANCO — é o único ponto da camada de domínio
 * que fala inglês, porque vai direto para o update.
 */
export function efeitosDaEntrada(
  destino: FaseId,
  dados: DadosDaMudanca,
  proximoDiaUtil: () => string,
): Record<string, unknown> {
  const agora = new Date().toISOString();

  switch (destino) {
    case "potenciais":
      // Reabrir um perdido devolve o lead ao começo do processo, e ele precisa
      // de próxima ação de novo — senão volta invisível.
      return {
        next_action_label: "Retomar contato",
        next_action_at: proximoDiaUtil(),
        lost_reason_id: null,
        lost_at: null,
        resume_at: null,
        ...FECHAMENTO_LIMPO,
      };

    case "reuniao":
    case "acompanhamento":
      return {
        next_action_label: dados.proximaAcao?.trim() || rotuloPadrao(destino),
        next_action_at: dados.proximaAcaoEm,
        // Reabrir de ganhou/perdido precisa limpar o fechamento anterior.
        lost_at: null,
        lost_reason_id: null,
        resume_at: null,
        ...FECHAMENTO_LIMPO,
      };

    case "negociacao":
      return {
        estimated_value: dados.valorEstimado,
        next_action_label: dados.proximaAcao?.trim() || rotuloPadrao(destino),
        next_action_at: dados.proximaAcaoEm ?? null,
        lost_at: null,
        lost_reason_id: null,
        resume_at: null,
        ...FECHAMENTO_LIMPO,
      };

    case "ganhou":
      return {
        won_value: dados.premioAnual,
        insurer: dados.seguradora?.trim() || null,
        won_at: agora,
        lost_at: null,
        lost_reason_id: null,
        resume_at: null,
        // Fase terminal limpa a próxima ação (§6): lead fechado não pode
        // continuar aparecendo em "follow-ups atrasados".
        next_action_label: null,
        next_action_at: null,
      };

    case "perdido":
      return {
        lost_reason_id: dados.motivoPerdaId,
        lost_at: agora,
        won_at: null,
        won_value: null,
        insurer: null,
        resume_at: null,
        next_action_label: null,
        next_action_at: null,
      };

    case "posterior":
      return {
        resume_at: dados.retomarEm,
        lost_at: null,
        lost_reason_id: null,
        ...FECHAMENTO_LIMPO,
        // A retomada vira próxima ação quando o job da Fase 3 mover o lead.
        // Até lá ele não conta como atrasado.
        next_action_label: null,
        next_action_at: null,
      };
  }
}

function rotuloPadrao(destino: FaseId): string {
  switch (destino) {
    case "reuniao":
      return "Reunião marcada";
    case "acompanhamento":
      return "Acompanhar";
    case "negociacao":
      return "Avançar negociação";
    default:
      return "Próximo contato";
  }
}

/**
 * Movimentos permitidos a partir de uma fase.
 *
 * O §6 diz que fases ativas vão para qualquer uma, e que terminais têm saída
 * de "reabrir". Na prática toda transição é permitida — o que muda é o que
 * cada destino EXIGE. Manter isto explícito evita que alguém confunda
 * "exige dados" com "é proibido".
 */
export function destinosPossiveis(origem: FaseId): FaseId[] {
  const todas: FaseId[] = [
    "potenciais",
    "reuniao",
    "acompanhamento",
    "negociacao",
    "ganhou",
    "perdido",
    "posterior",
  ];
  return todas.filter((d) => d !== origem);
}

/** O destino abre modal antes de confirmar? (§6, F2-7) */
export function pedeConfirmacao(destino: FaseId): boolean {
  return (
    ehTerminal(destino) || destino === "negociacao" || fase(destino).exige !== "nenhuma"
  );
}
