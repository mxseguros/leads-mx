import { FASES_ID } from "../dominio/fases";
import type { Lead } from "../dominio/tipos";

/**
 * Ordenação da visão Lista (§5.5, F3-2).
 *
 * Separada de `ordenarCartoes`, que serve ao board: lá a ordem é fixa e
 * orientada a urgência, aqui quem manda é a coluna que a pessoa clicou.
 */

export const COLUNAS = [
  "nome",
  "telefone",
  "email",
  "produto",
  "fase",
  "responsavel",
  "proximaAcao",
  "criado",
  "origem",
] as const;

export type Coluna = (typeof COLUNAS)[number];
export type Direcao = "asc" | "desc";

export function ehColuna(v: string): v is Coluna {
  return (COLUNAS as readonly string[]).includes(v);
}

/**
 * Chave de comparação de cada coluna.
 *
 * `null` significa "não tem valor" e vai sempre para o fim, nas duas direções:
 * inverter a ordem não pode encher o topo da tela de linhas vazias.
 */
function chave(lead: Lead, coluna: Coluna): string | number | null {
  switch (coluna) {
    case "nome":
      return lead.nomeCompleto.toLocaleLowerCase("pt-BR");
    case "telefone":
      return lead.telefone;
    case "email":
      return lead.email.toLocaleLowerCase("pt-BR");
    case "produto":
      return lead.produto?.toLocaleLowerCase("pt-BR") ?? null;
    case "fase":
      // Pela ordem do processo, não alfabética: "Ganhou" vindo antes de
      // "Negociação" não diz nada a ninguém.
      return FASES_ID.indexOf(lead.fase);
    case "responsavel":
      return lead.responsavel?.nome.toLocaleLowerCase("pt-BR") ?? null;
    case "proximaAcao":
      return lead.proximaAcaoEm ?? null;
    case "criado":
      return lead.criadoEm;
    case "origem":
      return lead.origem.rotulo.toLocaleLowerCase("pt-BR");
  }
}

export function ordenarLista(
  leads: readonly Lead[],
  coluna: Coluna,
  direcao: Direcao,
): Lead[] {
  const sinal = direcao === "asc" ? 1 : -1;

  return [...leads].sort((a, b) => {
    const ka = chave(a, coluna);
    const kb = chave(b, coluna);

    // Vazio no fim sempre, independente da direção.
    if (ka === null && kb === null) return 0;
    if (ka === null) return 1;
    if (kb === null) return -1;

    if (ka === kb) {
      // Desempate estável pelo nome, senão duas ordenações seguidas na mesma
      // coluna embaralham linhas equivalentes.
      return a.nomeCompleto.localeCompare(b.nomeCompleto, "pt-BR");
    }

    if (typeof ka === "number" && typeof kb === "number") {
      return (ka - kb) * sinal;
    }
    return String(ka).localeCompare(String(kb), "pt-BR") * sinal;
  });
}

/** Direção inicial de cada coluna ao clicar pela primeira vez. */
export function direcaoPadrao(coluna: Coluna): Direcao {
  // Data começa pelo mais recente; texto, por A-Z. É o que a pessoa espera
  // sem precisar clicar duas vezes.
  return coluna === "criado" ? "desc" : "asc";
}
