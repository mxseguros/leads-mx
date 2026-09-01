import { describe, expect, it } from "vitest";
import {
  destinosPossiveis,
  efeitosDaEntrada,
  pedeConfirmacao,
  validarEntrada,
} from "../lib/dominio/regras";
import { FASES_ID } from "../lib/dominio/fases";

const diaUtil = () => "2026-09-02";

describe("validarEntrada — o que cada fase exige (§6)", () => {
  it("Clientes potenciais não exige nada", () => {
    expect(validarEntrada("potenciais", {})).toEqual({ ok: true });
  });

  it("Reunião e Acompanhamento exigem data da próxima ação", () => {
    for (const destino of ["reuniao", "acompanhamento"] as const) {
      const r = validarEntrada(destino, {});
      expect(r.ok, destino).toBe(false);
      if (!r.ok) expect(r.campo).toBe("proximaAcaoEm");
    }
    expect(validarEntrada("reuniao", { proximaAcaoEm: "2026-09-15" }).ok).toBe(true);
  });

  it("Negociação exige valor estimado", () => {
    const r = validarEntrada("negociacao", {});
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.campo).toBe("valorEstimado");
    expect(validarEntrada("negociacao", { valorEstimado: 12000 }).ok).toBe(true);
  });

  it("Ganhou exige prêmio anual; seguradora é opcional", () => {
    const r = validarEntrada("ganhou", {});
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.campo).toBe("premioAnual");
    expect(validarEntrada("ganhou", { premioAnual: 48000 }).ok).toBe(true);
  });

  it("Perdido exige motivo", () => {
    const r = validarEntrada("perdido", {});
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.campo).toBe("motivoPerdaId");
    expect(validarEntrada("perdido", { motivoPerdaId: 3 }).ok).toBe(true);
  });

  it("Contato posterior exige data de retomada", () => {
    const r = validarEntrada("posterior", {});
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.campo).toBe("retomarEm");
    expect(validarEntrada("posterior", { retomarEm: "2026-10-01" }).ok).toBe(true);
  });
});

describe("validarEntrada — recusa dado mal formado, não só ausente", () => {
  it("data em formato errado não passa", () => {
    for (const ruim of ["15/09/2026", "2026-9-5", "", "amanhã", "2026-09"]) {
      expect(validarEntrada("reuniao", { proximaAcaoEm: ruim }).ok, ruim).toBe(false);
    }
  });

  it("data que não existe no calendário não passa", () => {
    // O Postgres recusaria, mas com erro em inglês e 500 na cara do consultor.
    expect(validarEntrada("reuniao", { proximaAcaoEm: "2026-02-30" }).ok).toBe(false);
    expect(validarEntrada("reuniao", { proximaAcaoEm: "2026-13-01" }).ok).toBe(false);
  });

  it("valor zero ou negativo não conta como informado", () => {
    expect(validarEntrada("negociacao", { valorEstimado: 0 }).ok).toBe(false);
    expect(validarEntrada("negociacao", { valorEstimado: -500 }).ok).toBe(false);
    expect(validarEntrada("ganhou", { premioAnual: 0 }).ok).toBe(false);
  });

  it("motivo precisa ser id numérico, não texto solto", () => {
    expect(validarEntrada("perdido", { motivoPerdaId: "caro" as never }).ok).toBe(false);
  });
});

describe("efeitosDaEntrada — o que a fase faz com o lead", () => {
  it("fases terminais limpam a próxima ação", () => {
    // Lead fechado que continua com follow-up aparece em "atrasados" para
    // sempre e envenena a métrica.
    for (const destino of ["ganhou", "perdido", "posterior"] as const) {
      const e = efeitosDaEntrada(destino, {
        premioAnual: 1000,
        motivoPerdaId: 1,
        retomarEm: "2026-10-01",
      }, diaUtil);
      expect(e.next_action_label, destino).toBeNull();
      expect(e.next_action_at, destino).toBeNull();
    }
  });

  it("Ganhou grava prêmio sem tocar na estimativa", () => {
    // Lacuna 02: são colunas separadas justamente para medir o erro do funil.
    const e = efeitosDaEntrada("ganhou", { premioAnual: 64800, seguradora: "Porto" }, diaUtil);
    expect(e.won_value).toBe(64800);
    expect(e.insurer).toBe("Porto");
    expect(e).not.toHaveProperty("estimated_value");
    expect(e.won_at).toBeTruthy();
  });

  it("Perdido limpa o que veio de um ganho anterior", () => {
    const e = efeitosDaEntrada("perdido", { motivoPerdaId: 2 }, diaUtil);
    expect(e.lost_reason_id).toBe(2);
    expect(e.won_at).toBeNull();
    expect(e.won_value).toBeNull();
    expect(e.insurer).toBeNull();
  });

  it("reabrir para potenciais devolve próxima ação", () => {
    // Sem isto o lead reaberto volta invisível: sem data, some do radar.
    const e = efeitosDaEntrada("potenciais", {}, diaUtil);
    expect(e.next_action_at).toBe("2026-09-02");
    expect(e.next_action_label).toBe("Retomar contato");
    expect(e.lost_reason_id).toBeNull();
    expect(e.lost_at).toBeNull();
  });

  it("reabrir de ganhou para acompanhamento limpa o fechamento", () => {
    const e = efeitosDaEntrada("acompanhamento", { proximaAcaoEm: "2026-09-20" }, diaUtil);
    expect(e.won_at).toBeNull();
    expect(e.lost_at).toBeNull();
    expect(e.next_action_at).toBe("2026-09-20");
  });

  it("reabrir limpa o premio INTEIRO, nao so a data do ganho", () => {
    // Limpar só won_at deixava o lead numa fase ativa ainda exibindo
    // "prêmio anual R$ 91.200" na ficha, num negócio que voltou a ser proposta.
    for (const destino of ["potenciais", "reuniao", "acompanhamento", "negociacao", "posterior"] as const) {
      const e = efeitosDaEntrada(
        destino,
        { proximaAcaoEm: "2026-09-20", valorEstimado: 5000, retomarEm: "2026-10-01" },
        diaUtil,
      );
      expect(e.won_at, destino).toBeNull();
      expect(e.won_value, destino).toBeNull();
      expect(e.insurer, destino).toBeNull();
    }
  });

  it("mas Ganhou continua gravando o premio", () => {
    const e = efeitosDaEntrada("ganhou", { premioAnual: 91200, seguradora: "Allianz" }, diaUtil);
    expect(e.won_value).toBe(91200);
    expect(e.insurer).toBe("Allianz");
  });

  it("usa o rótulo que a pessoa escreveu, e só cai no padrão se vier vazio", () => {
    const comTexto = efeitosDaEntrada(
      "reuniao",
      { proximaAcaoEm: "2026-09-20", proximaAcao: "Visita na fábrica" },
      diaUtil,
    );
    expect(comTexto.next_action_label).toBe("Visita na fábrica");

    const semTexto = efeitosDaEntrada(
      "reuniao",
      { proximaAcaoEm: "2026-09-20", proximaAcao: "   " },
      diaUtil,
    );
    expect(semTexto.next_action_label).toBe("Reunião marcada");
  });

  it("Contato posterior guarda a data sem virar atraso", () => {
    const e = efeitosDaEntrada("posterior", { retomarEm: "2026-12-01" }, diaUtil);
    expect(e.resume_at).toBe("2026-12-01");
    expect(e.next_action_at).toBeNull();
  });
});

describe("destinos e confirmação", () => {
  it("toda fase pode ir para as outras seis", () => {
    for (const origem of FASES_ID) {
      const destinos = destinosPossiveis(origem);
      expect(destinos, origem).toHaveLength(6);
      expect(destinos, origem).not.toContain(origem);
    }
  });

  it("só Clientes potenciais entra sem confirmação", () => {
    expect(pedeConfirmacao("potenciais")).toBe(false);
    for (const destino of FASES_ID.filter((f) => f !== "potenciais")) {
      expect(pedeConfirmacao(destino), destino).toBe(true);
    }
  });
});
