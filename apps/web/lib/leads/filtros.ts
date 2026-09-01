import type { Lead } from "../dominio/tipos";

/**
 * Busca e filtros do board (§5.3, F2-11).
 *
 * Funções puras, fora de qualquer módulo `"use client"`: a página do servidor
 * lê o estado da URL e o componente do cliente aplica os filtros, e as duas
 * precisam da mesma implementação. Foi exatamente isso que quebrou quando elas
 * moravam no componente — o servidor não pode chamar função de um módulo de
 * cliente.
 */

export type EstadoFiltros = {
  q: string;
  produto: string;
  responsavel: string;
  origem: string;
};

export const FILTROS_VAZIOS: EstadoFiltros = {
  q: "",
  produto: "",
  responsavel: "",
  origem: "",
};

/** Valor especial do seletor de responsável: leads que ninguém pegou. */
export const SEM_DONO = "sem-dono";

export function lerFiltrosDaUrl(
  params: Record<string, string | string[] | undefined>,
): EstadoFiltros {
  const texto = (v: string | string[] | undefined) =>
    (Array.isArray(v) ? v[0] : v)?.toString().slice(0, 80) ?? "";

  return {
    q: texto(params.q),
    produto: texto(params.produto),
    responsavel: texto(params.resp),
    origem: texto(params.origem),
  };
}

export function paraQueryString(f: EstadoFiltros): string {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.produto) p.set("produto", f.produto);
  if (f.responsavel) p.set("resp", f.responsavel);
  if (f.origem) p.set("origem", f.origem);
  return p.toString();
}

export function algumFiltroAtivo(f: EstadoFiltros): boolean {
  return Boolean(f.q || f.produto || f.responsavel || f.origem);
}

/**
 * A busca cobre nome, e-mail, empresa, produto e telefone (§5.3).
 *
 * O telefone compara só dígitos: quem procura digita "(11) 99999" e o banco
 * guarda "11999990000". Exige 3 dígitos para não fazer "11" casar com meia
 * base por acidente.
 */
export function aplicarFiltros(leads: readonly Lead[], f: EstadoFiltros): Lead[] {
  const q = f.q.trim().toLowerCase();
  const digitos = q.replace(/\D/g, "");

  return leads.filter((lead) => {
    if (f.produto && lead.produto !== f.produto) return false;
    if (f.origem && lead.origem.slug !== f.origem) return false;

    if (f.responsavel === SEM_DONO) {
      if (!lead.semResponsavel) return false;
    } else if (f.responsavel && lead.responsavel?.id !== f.responsavel) {
      return false;
    }

    if (!q) return true;

    const alvo = [lead.nomeCompleto, lead.email, lead.empresa ?? "", lead.produto ?? ""]
      .join(" ")
      .toLowerCase();

    if (alvo.includes(q)) return true;
    return digitos.length >= 3 && lead.telefone.includes(digitos);
  });
}
