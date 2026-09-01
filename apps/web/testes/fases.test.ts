import { describe, expect, it } from "vitest";
import { FASES, FASES_ID, ehFaseValida, ehTerminal, fase } from "../lib/dominio/fases";

describe("fases da esteira", () => {
  it("tem exatamente as sete fases do processo da MX", () => {
    expect(FASES).toHaveLength(7);
    expect(FASES.map((f) => f.id)).toEqual([...FASES_ID]);
  });

  it("os ids batem com o enum lead_stage do banco", () => {
    // Se esta lista divergir da migration, o mapeador quebra em runtime.
    expect([...FASES_ID]).toEqual([
      "potenciais",
      "reuniao",
      "acompanhamento",
      "negociacao",
      "ganhou",
      "perdido",
      "posterior",
    ]);
  });

  it("marca como terminais so ganhou, perdido e contato posterior", () => {
    expect(FASES.filter((f) => f.terminal).map((f) => f.id)).toEqual([
      "ganhou",
      "perdido",
      "posterior",
    ]);
  });

  it("cobra o que o §6 manda cobrar em cada entrada", () => {
    expect(fase("negociacao").exige).toBe("valor-estimado");
    expect(fase("ganhou").exige).toBe("premio-anual");
    expect(fase("perdido").exige).toBe("motivo-perda");
    expect(fase("posterior").exige).toBe("data-retomada");
  });

  it("toda coluna vazia ensina o que fazer", () => {
    for (const f of FASES) {
      expect(f.vazio.length).toBeGreaterThan(10);
    }
  });

  it("reconhece fase valida e rejeita invalida", () => {
    expect(ehFaseValida("negociacao")).toBe(true);
    expect(ehFaseValida("proposta")).toBe(false);
  });

  it("levanta erro claro para fase desconhecida", () => {
    // @ts-expect-error — o teste existe para o caso de vir string do banco
    expect(() => fase("inexistente")).toThrow(/Fase desconhecida/);
  });

  it("ehTerminal concorda com a tabela", () => {
    expect(ehTerminal("ganhou")).toBe(true);
    expect(ehTerminal("reuniao")).toBe(false);
  });
});
