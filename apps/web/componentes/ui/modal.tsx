"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Modal (§4.4). Usado pelos dialogos de Perdido, Contato posterior e Ganhou,
 * que abrem ANTES de confirmar a mudanca de fase (§6) — o custo minimo para o
 * funil ter dado util.
 */

export function Modal({
  aberto,
  titulo,
  descricao,
  onFechar,
  children,
  acoes,
}: {
  aberto: boolean;
  titulo: string;
  descricao?: string;
  onFechar: () => void;
  children?: ReactNode;
  acoes: ReactNode;
}) {
  const painel = useRef<HTMLDivElement>(null);
  const focoAnterior = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!aberto) return;

    focoAnterior.current = document.activeElement as HTMLElement | null;
    painel.current?.focus();

    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === "Escape") onFechar();
    }
    document.addEventListener("keydown", aoTeclar);

    return () => {
      document.removeEventListener("keydown", aoTeclar);
      focoAnterior.current?.focus();
    };
  }, [aberto, onFechar]);

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        aria-hidden="true"
        onClick={onFechar}
        className="absolute inset-0 bg-[color-mix(in_srgb,var(--heading)_45%,transparent)]"
      />
      <div
        ref={painel}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        tabIndex={-1}
        className="relative w-full max-w-[420px] rounded-[10px] border border-line bg-surface p-5 shadow-(--shadow-mx-3)"
      >
        <h2 className="text-[19px] font-[800]">{titulo}</h2>
        {descricao ? (
          <p className="mt-1.5 text-[13.5px] text-muted">{descricao}</p>
        ) : null}

        {children ? <div className="mt-4 flex flex-col gap-3">{children}</div> : null}

        <div className="mt-5 flex justify-end gap-2">{acoes}</div>
      </div>
    </div>
  );
}
