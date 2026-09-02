import { describe, expect, it } from "vitest";
import { COLUNAS, direcaoPadrao, ehColuna, ordenarLista } from "../lib/leads/ordenacao";
import type { Lead } from "../lib/dominio/tipos";

function lead(sobrepor: Partial<Lead>): Lead {
  return {
    id: "x",
    nome: "Ana",
    sobrenome: "Silva",
    nomeCompleto: "Ana Silva",
    telefone: "11999990000",
    email: "ana@empresa.com.br",
    empresa: null,
    fase: "potenciais",
    responsavel: null,
    produto: null,
    origem: { slug: "landing", rotulo: "Landing page" },
    origemDetalhe: null,
    valorEstimado: null,
    premioAnual: null,
    seguradora: null,
    proximaAcao: null,
    proximaAcaoEm: null,
    motivoPerda: null,
    retomarEm: null,
    criadoEm: "2026-09-01T10:00:00Z",
    atrasado: false,
    paraHoje: false,
    diasDeVida: 0,
    semResponsavel: true,
    terminal: false,
    ...sobrepor,
  };
}

describe("ordenarLista", () => {
  it("ordena por nome nas duas direções", () => {
    const base = [
      lead({ id: "c", nomeCompleto: "Carla Souza" }),
      lead({ id: "a", nomeCompleto: "Ana Prado" }),
      lead({ id: "b", nomeCompleto: "Bruno Lima" }),
    ];
    expect(ordenarLista(base, "nome", "asc").map((l) => l.id)).toEqual(["a", "b", "c"]);
    expect(ordenarLista(base, "nome", "desc").map((l) => l.id)).toEqual(["c", "b", "a"]);
  });

  it("respeita acento na ordem do português", () => {
    const base = [
      lead({ id: "otavio", nomeCompleto: "Otávio Mendes" }),
      lead({ id: "oscar", nomeCompleto: "Oscar Lima" }),
    ];
    // Com comparação byte a byte, "Otávio" cairia depois de tudo.
    expect(ordenarLista(base, "nome", "asc").map((l) => l.id)).toEqual(["oscar", "otavio"]);
  });

  it("ordena fase pela ordem do processo, não alfabética", () => {
    // "Ganhou" antes de "Negociação" não diz nada a ninguém.
    const base = [
      lead({ id: "ganhou", fase: "ganhou" }),
      lead({ id: "potenciais", fase: "potenciais" }),
      lead({ id: "negociacao", fase: "negociacao" }),
    ];
    expect(ordenarLista(base, "fase", "asc").map((l) => l.id)).toEqual([
      "potenciais",
      "negociacao",
      "ganhou",
    ]);
  });

  it("manda vazio para o fim nas DUAS direções", () => {
    // Inverter a ordem não pode encher o topo da tela de linhas vazias.
    const base = [
      lead({ id: "sem", produto: null }),
      lead({ id: "com", produto: "Frota" }),
    ];
    expect(ordenarLista(base, "produto", "asc").map((l) => l.id)).toEqual(["com", "sem"]);
    expect(ordenarLista(base, "produto", "desc").map((l) => l.id)).toEqual(["com", "sem"]);
  });

  it("desempata pelo nome, para a ordem ser estável", () => {
    const base = [
      lead({ id: "b", produto: "Frota", nomeCompleto: "Bruno Lima" }),
      lead({ id: "a", produto: "Frota", nomeCompleto: "Ana Prado" }),
    ];
    expect(ordenarLista(base, "produto", "asc").map((l) => l.id)).toEqual(["a", "b"]);
    expect(ordenarLista(base, "produto", "desc").map((l) => l.id)).toEqual(["a", "b"]);
  });

  it("ordena data da próxima ação como data, não como texto", () => {
    const base = [
      lead({ id: "dez", proximaAcaoEm: "2026-12-01" }),
      lead({ id: "set", proximaAcaoEm: "2026-09-30" }),
    ];
    expect(ordenarLista(base, "proximaAcao", "asc").map((l) => l.id)).toEqual(["set", "dez"]);
  });

  it("não muda o array recebido", () => {
    const entrada = [lead({ id: "b" }), lead({ id: "a" })];
    const copia = [...entrada];
    ordenarLista(entrada, "nome", "asc");
    expect(entrada).toEqual(copia);
  });
});

describe("colunas", () => {
  it("reconhece coluna válida e rejeita inventada", () => {
    for (const c of COLUNAS) expect(ehColuna(c), c).toBe(true);
    expect(ehColuna("cpf")).toBe(false);
  });

  it("data começa pelo mais recente; texto, por A-Z", () => {
    // Senão a pessoa precisa clicar duas vezes para ver o que espera.
    expect(direcaoPadrao("criado")).toBe("desc");
    expect(direcaoPadrao("nome")).toBe("asc");
  });
});
