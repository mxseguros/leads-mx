import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "MX Leads",
  robots: { index: false, follow: false },
};

/**
 * Marcador de lugar. A landing publica e a Fase 1 (§5.1) — hero navy, selo,
 * cartao do formulario de quatro campos e os seis seguros PJ.
 *
 * Fica explicito em vez de redirecionar para /esteira: a raiz e um dominio
 * publico (cotacao.mxseguros.com.br) e nao pode dar a entender que o admin
 * mora aqui.
 */
export default function PaginaInicial() {
  return (
    <main className="grid min-h-screen place-items-center px-6 text-center">
      <div className="max-w-[420px]">
        <span className="grid size-10 place-items-center justify-self-center rounded-[8px] bg-brand font-(family-name:--font-display) text-[15px] font-[800] text-on-brand">
          MX
        </span>
        <h1 className="mt-5 text-[26px] font-[800]">MX Leads</h1>
        <p className="mt-2 text-[14px] text-muted">
          A landing de captação entra no ar na Fase 1. Por enquanto, só a área
          da equipe está de pé.
        </p>
        <Link
          href="/entrar"
          className="mt-6 inline-block text-[14px] font-[600] text-heading underline underline-offset-4"
        >
          Entrar
        </Link>
      </div>
    </main>
  );
}
