import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Manrope } from "next/font/google";
import "./globals.css";

/**
 * Tipografia do §4.2. Manrope nos titulos, numeros e botoes; IBM Plex Sans no
 * texto corrido, formularios e tabelas; Plex Mono onde digito precisa alinhar.
 *
 * next/font hospeda as fontes junto do app: sem ida ao Google no runtime, sem
 * salto de layout e com `display: swap` — os tres pontos que o §5.1 cobra para
 * o LCP ficar abaixo de 2,5 s no 4G.
 */

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  display: "swap",
  variable: "--fonte-titulo",
});

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--fonte-texto",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--fonte-mono",
});

export const metadata: Metadata = {
  title: {
    default: "MX Leads",
    template: "%s · MX Leads",
  },
  description:
    "Captura e prospecção de leads para a MX Corretora de Seguros.",
  // O admin nunca deve aparecer em busca. A landing da Fase 1 sobrescreve isto.
  robots: { index: false, follow: false },
};

export default function LayoutRaiz({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="pt-BR"
      // O alternador de tema escreve data-theme antes da hidratacao.
      suppressHydrationWarning
      className={`${manrope.variable} ${plexSans.variable} ${plexMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
