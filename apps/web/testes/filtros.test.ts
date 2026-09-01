import { describe, expect, it } from "vitest";
import {
  algumFiltroAtivo,
  aplicarFiltros,
  lerFiltrosDaUrl,
  paraQueryString,
  FILTROS_VAZIOS,
  SEM_DONO,
} from "../lib/leads/filtros";
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

const base = [
  lead({ id: "a", nomeCompleto: "Cláudia Fontes", produto: "Frota", telefone: "11987650009" }),
  lead({
    id: "b",
    nomeCompleto: "Rogério Alves",
    produto: "Transporte",
    origem: { slug: "indicacao", rotulo: "Indicação" },
    responsavel: { id: "u1", nome: "Carla", iniciais: "CS" },
    semResponsavel: false,
  }),
  lead({ id: "c", nomeCompleto: "Helena Prado", empresa: "Prado Indústria", produto: "Frota" }),
];

describe("aplicarFiltros", () => {
  it("sem filtro devolve tudo", () => {
    expect(aplicarFiltros(base, FILTROS_VAZIOS)).toHaveLength(3);
  });

  it("busca por nome", () => {
    const r = aplicarFiltros(base, { ...FILTROS_VAZIOS, q: "fontes" });
    expect(r.map((l) => l.id)).toEqual(["a"]);
  });

  it("busca por empresa", () => {
    const r = aplicarFiltros(base, { ...FILTROS_VAZIOS, q: "prado ind" });
    expect(r.map((l) => l.id)).toEqual(["c"]);
  });

  it("busca por telefone digitado com máscara", () => {
    // Quem procura digita "(11) 98765-0009"; o banco guarda "11987650009".
    const r = aplicarFiltros(base, { ...FILTROS_VAZIOS, q: "(11) 98765-0009" });
    expect(r.map((l) => l.id)).toEqual(["a"]);
  });

  it("não casa telefone com menos de 3 dígitos", () => {
    // "11" casaria com meia base e faria a busca parecer quebrada.
    const r = aplicarFiltros(base, { ...FILTROS_VAZIOS, q: "11" });
    expect(r).toHaveLength(0);
  });

  it("filtra por produto", () => {
    const r = aplicarFiltros(base, { ...FILTROS_VAZIOS, produto: "Frota" });
    expect(r.map((l) => l.id)).toEqual(["a", "c"]);
  });

  it("filtra por origem", () => {
    const r = aplicarFiltros(base, { ...FILTROS_VAZIOS, origem: "indicacao" });
    expect(r.map((l) => l.id)).toEqual(["b"]);
  });

  it("filtra por responsável", () => {
    const r = aplicarFiltros(base, { ...FILTROS_VAZIOS, responsavel: "u1" });
    expect(r.map((l) => l.id)).toEqual(["b"]);
  });

  it("filtra quem não tem dono", () => {
    const r = aplicarFiltros(base, { ...FILTROS_VAZIOS, responsavel: SEM_DONO });
    expect(r.map((l) => l.id)).toEqual(["a", "c"]);
  });

  it("combina busca com filtro", () => {
    const r = aplicarFiltros(base, { ...FILTROS_VAZIOS, q: "prado", produto: "Frota" });
    expect(r.map((l) => l.id)).toEqual(["c"]);
  });
});

describe("estado na URL", () => {
  it("lê os parâmetros do endereço", () => {
    const f = lerFiltrosDaUrl({ q: "fontes", produto: "Frota", resp: "u1", origem: "landing" });
    expect(f).toEqual({ q: "fontes", produto: "Frota", responsavel: "u1", origem: "landing" });
  });

  it("aceita ausência e array sem quebrar", () => {
    expect(lerFiltrosDaUrl({})).toEqual(FILTROS_VAZIOS);
    expect(lerFiltrosDaUrl({ q: ["a", "b"] }).q).toBe("a");
  });

  it("corta valor gigante vindo da URL", () => {
    expect(lerFiltrosDaUrl({ q: "x".repeat(500) }).q).toHaveLength(80);
  });

  it("ida e volta preserva o estado", () => {
    const f = { q: "fontes", produto: "Frota", responsavel: "u1", origem: "landing" };
    const qs = paraQueryString(f);
    expect(lerFiltrosDaUrl(Object.fromEntries(new URLSearchParams(qs)))).toEqual(f);
  });

  it("filtro vazio não sujja a URL", () => {
    expect(paraQueryString(FILTROS_VAZIOS)).toBe("");
    expect(algumFiltroAtivo(FILTROS_VAZIOS)).toBe(false);
    expect(algumFiltroAtivo({ ...FILTROS_VAZIOS, q: "a" })).toBe(true);
  });
});
