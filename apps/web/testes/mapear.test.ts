import { describe, expect, it } from "vitest";
import {
  linhaParaLead,
  linhaParaMetricas,
  ordenarCartoes,
  type LinhaMetricas,
} from "../lib/dominio/mapear";
import type { Lead, LinhaBoard } from "../lib/dominio/tipos";

function linha(sobrepor: Partial<LinhaBoard> = {}): LinhaBoard {
  return {
    id: "a1",
    first_name: "Carla",
    last_name: "Souza",
    full_name: "Carla Souza",
    phone: "11999990000",
    email: "carla@empresa.com.br",
    company: null,
    stage: "potenciais",
    owner_id: null,
    owner_name: null,
    owner_initials: null,
    product_label: "Frota",
    source_slug: "landing",
    source_label: "Landing page",
    source_detail: null,
    estimated_value: null,
    won_value: null,
    insurer: null,
    next_action_label: null,
    next_action_at: null,
    lost_reason_label: null,
    resume_at: null,
    created_at: "2026-09-01T10:00:00Z",
    is_late: false,
    is_today: false,
    age_days: 0,
    is_unassigned: true,
    is_terminal: false,
    ...sobrepor,
  };
}

describe("linhaParaLead", () => {
  it("traduz os campos do banco para o app", () => {
    const lead = linhaParaLead(linha());
    expect(lead.nome).toBe("Carla");
    expect(lead.sobrenome).toBe("Souza");
    expect(lead.produto).toBe("Frota");
    expect(lead.origem.rotulo).toBe("Landing page");
  });

  it("converte numeric que chega como string", () => {
    // O driver do Postgres entrega numeric como string para nao perder
    // precisao. Sem esta conversao o cartao mostraria "R$ NaN".
    const lead = linhaParaLead(
      linha({ estimated_value: "12500.00", won_value: "13200.50" }),
    );
    expect(lead.valorEstimado).toBe(12500);
    expect(lead.premioAnual).toBe(13200.5);
  });

  it("premio anual nao sobrescreve o valor estimado", () => {
    // Lacuna 02 do plano: sao duas colunas justamente para dar para medir
    // o quanto a estimativa errou.
    const lead = linhaParaLead(
      linha({ stage: "ganhou", estimated_value: "10000", won_value: "12000" }),
    );
    expect(lead.valorEstimado).toBe(10000);
    expect(lead.premioAnual).toBe(12000);
  });

  it("responsavel vira null quando o lead nao tem dono", () => {
    expect(linhaParaLead(linha()).responsavel).toBeNull();
  });

  it("monta o responsavel quando tem dono", () => {
    const lead = linhaParaLead(
      linha({
        owner_id: "u1",
        owner_name: "Marcos Lima",
        owner_initials: "ML",
        is_unassigned: false,
      }),
    );
    expect(lead.responsavel).toEqual({
      id: "u1",
      nome: "Marcos Lima",
      iniciais: "ML",
    });
  });
});

describe("linhaParaMetricas", () => {
  const base: LinhaMetricas = {
    new_7d: 4,
    unassigned: 2,
    active: 11,
    negotiating_value: "48000.00",
    won_30d: 3,
    lost_30d: 1,
    late: 5,
    due_today: 2,
  };

  it("calcula a taxa de ganho", () => {
    expect(linhaParaMetricas(base).taxaGanho30d).toBe(0.75);
  });

  it("devolve null quando nao houve nenhum fechamento", () => {
    // 0% diria que a MX perdeu tudo; a verdade e que ainda nao ha taxa.
    const m = linhaParaMetricas({ ...base, won_30d: 0, lost_30d: 0 });
    expect(m.taxaGanho30d).toBeNull();
  });

  it("converte o valor em negociacao", () => {
    expect(linhaParaMetricas(base).valorEmNegociacao).toBe(48000);
  });
});

describe("ordenarCartoes", () => {
  function lead(sobrepor: Partial<Lead>): Lead {
    return { ...linhaParaLead(linha()), ...sobrepor } as Lead;
  }

  it("poe atrasados primeiro", () => {
    const ordenados = ordenarCartoes([
      lead({ id: "no-prazo", proximaAcaoEm: "2026-09-20" }),
      lead({ id: "atrasado", atrasado: true, proximaAcaoEm: "2026-08-28" }),
    ]);
    expect(ordenados[0]?.id).toBe("atrasado");
  });

  it("depois ordena pela proxima acao mais proxima", () => {
    const ordenados = ordenarCartoes([
      lead({ id: "depois", proximaAcaoEm: "2026-09-25" }),
      lead({ id: "antes", proximaAcaoEm: "2026-09-10" }),
    ]);
    expect(ordenados.map((l) => l.id)).toEqual(["antes", "depois"]);
  });

  it("manda quem nao tem data para o fim, sem sumir", () => {
    const ordenados = ordenarCartoes([
      lead({ id: "sem-data", proximaAcaoEm: null }),
      lead({ id: "com-data", proximaAcaoEm: "2026-09-10" }),
    ]);
    expect(ordenados.map((l) => l.id)).toEqual(["com-data", "sem-data"]);
  });

  it("desempata pelo mais antigo", () => {
    const ordenados = ordenarCartoes([
      lead({ id: "novo", criadoEm: "2026-09-02T10:00:00Z" }),
      lead({ id: "velho", criadoEm: "2026-08-20T10:00:00Z" }),
    ]);
    expect(ordenados.map((l) => l.id)).toEqual(["velho", "novo"]);
  });

  it("nao muda o array recebido", () => {
    const entrada = [lead({ id: "b" }), lead({ id: "a" })];
    const copia = [...entrada];
    ordenarCartoes(entrada);
    expect(entrada).toEqual(copia);
  });
});
