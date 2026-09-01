"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Referencias } from "@/lib/leads/consulta";
import {
  algumFiltroAtivo,
  paraQueryString,
  FILTROS_VAZIOS,
  SEM_DONO,
  type EstadoFiltros,
} from "@/lib/leads/filtros";

/**
 * Linha de busca e filtros (§5.3, F2-11).
 *
 * A URL é a fonte da verdade: recarregar mantém a visão, e o gestor manda
 * "olha os atrasados do Rafael" como link em vez de descrever cliques.
 *
 * A lógica de filtragem em si vive em `lib/leads/filtros.ts`, fora deste
 * módulo, porque a página do servidor também precisa dela.
 */

export function Filtros({
  filtros,
  referencias,
  total,
  onMuda,
}: {
  filtros: EstadoFiltros;
  referencias: Referencias;
  total: number;
  onMuda: (f: EstadoFiltros) => void;
}) {
  const router = useRouter();
  const caminho = usePathname();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // `replace` e não `push`: cada tecla digitada não pode virar uma entrada no
  // histórico do navegador, senão voltar uma página vira voltar uma letra.
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const busca = paraQueryString(filtros);
      router.replace(busca ? `${caminho}?${busca}` : caminho, { scroll: false });
    }, 300);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [filtros, caminho, router]);

  const muda = (campo: keyof EstadoFiltros, valor: string) =>
    onMuda({ ...filtros, [campo]: valor });

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-line px-6 py-3">
      <input
        type="search"
        value={filtros.q}
        onChange={(e) => muda("q", e.target.value)}
        placeholder="Buscar por nome, telefone, e-mail ou empresa"
        aria-label="Buscar leads"
        className="h-9 min-w-[240px] flex-1 rounded-[6px] border border-line-strong bg-surface px-3 text-[14px] text-texto placeholder:text-faint"
      />

      <Seletor
        rotulo="Produto"
        valor={filtros.produto}
        onMuda={(v) => muda("produto", v)}
        opcoes={referencias.produtos.map((p) => ({ valor: p.label, texto: p.label }))}
      />

      <Seletor
        rotulo="Responsável"
        valor={filtros.responsavel}
        onMuda={(v) => muda("responsavel", v)}
        opcoes={[
          { valor: SEM_DONO, texto: "Sem responsável" },
          ...referencias.equipe.map((p) => ({ valor: p.id, texto: p.nome })),
        ]}
      />

      <Seletor
        rotulo="Origem"
        valor={filtros.origem}
        onMuda={(v) => muda("origem", v)}
        opcoes={referencias.origens.map((o) => ({ valor: o.slug, texto: o.label }))}
      />

      {algumFiltroAtivo(filtros) ? (
        <>
          <span className="tabular text-[12.5px] text-muted">{total} encontrados</span>
          <button
            type="button"
            onClick={() => onMuda(FILTROS_VAZIOS)}
            className="text-[12.5px] font-[600] text-muted underline underline-offset-2 hover:text-heading"
          >
            Limpar
          </button>
        </>
      ) : null}
    </div>
  );
}

function Seletor({
  rotulo,
  valor,
  opcoes,
  onMuda,
}: {
  rotulo: string;
  valor: string;
  opcoes: { valor: string; texto: string }[];
  onMuda: (v: string) => void;
}) {
  return (
    <select
      value={valor}
      aria-label={rotulo}
      onChange={(e) => onMuda(e.target.value)}
      className={
        "h-9 rounded-[6px] border bg-surface px-2.5 text-[13.5px] " +
        (valor ? "border-focus text-heading" : "border-line-strong text-muted")
      }
    >
      <option value="">{rotulo}</option>
      {opcoes.map((o) => (
        <option key={o.valor} value={o.valor}>
          {o.texto}
        </option>
      ))}
    </select>
  );
}
