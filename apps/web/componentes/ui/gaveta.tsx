"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Gaveta lateral de 460px (§4.4 e §5.4).
 *
 * O board fica visivel atras — e isso que separa a gaveta de um modal: o
 * consultor nao perde o contexto da coluna de onde veio.
 *
 * Fecha com Esc e com clique no fundo. O foco entra na gaveta ao abrir e
 * volta para quem a abriu ao fechar, senao a navegacao por teclado se perde
 * no fim da pagina.
 */

export function Gaveta({
  aberta,
  titulo,
  onFechar,
  children,
  rodape,
}: {
  aberta: boolean;
  titulo: string;
  onFechar: () => void;
  children: ReactNode;
  rodape?: ReactNode;
}) {
  const painel = useRef<HTMLDivElement>(null);
  const focoAnterior = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!aberta) return;

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
  }, [aberta, onFechar]);

  if (!aberta) return null;

  return (
    <>
      <div
        aria-hidden="true"
        onClick={onFechar}
        className="fixed inset-0 z-40 bg-[color-mix(in_srgb,var(--heading)_45%,transparent)]"
      />
      <div
        ref={painel}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        tabIndex={-1}
        className={
          "fixed inset-y-0 right-0 z-50 flex w-full max-w-[460px] flex-col " +
          "border-l border-line bg-surface shadow-(--shadow-mx-3)"
        }
      >
        <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <h2 className="text-[19px] font-[800] leading-tight">{titulo}</h2>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar"
            className="rounded-[4px] px-2 text-[18px] leading-none text-muted hover:text-heading"
          >
            &times;
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {rodape ? (
          <footer className="border-t border-line px-5 py-3">{rodape}</footer>
        ) : null}
      </div>
    </>
  );
}
