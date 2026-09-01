import type { Metadata } from "next";
import { lerConfiguracoes, linkWhatsapp } from "@/lib/configuracoes";
import { CartaoCaptura } from "./_landing/cartao";
import { DIFERENCIAIS, PRODUTOS, PROVAS, landing } from "./_landing/conteudo";

/**
 * Landing de captação (§5.1).
 *
 * Server Component: o texto de consentimento e o número de WhatsApp vêm do
 * banco, e a MX muda os dois em Configurações sem deploy (§5.6). Só o
 * formulário é cliente.
 */

const conteudo = landing("geral");

/**
 * Revalida a cada 60s em vez de ser estática ou dinâmica.
 *
 * Estática congelaria o texto de consentimento e o número de WhatsApp no
 * momento do build — a MX mudaria em Configurações e nada aconteceria até o
 * próximo deploy, que é o oposto do §5.6.
 *
 * Dinâmica resolveria isso cobrando uma ida ao banco em cada visita, e o §5.1
 * pede LCP abaixo de 2,5 s no 4G. 60s entrega HTML pronto do cache e ainda faz
 * uma correção de texto aparecer sozinha em um minuto.
 */
export const revalidate = 60;

export const metadata: Metadata = {
  title: conteudo.tituloSeo,
  description: conteudo.descricaoSeo,
  // A raiz é a única página pública que DEVE ser indexada — o layout marca
  // noindex para o admin, e aqui a gente desfaz.
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "MX Corretora de Seguros",
    title: conteudo.tituloSeo,
    description: conteudo.descricaoSeo,
  },
};

export default async function PaginaLanding() {
  const config = await lerConfiguracoes();
  const wa = linkWhatsapp(config, { nome: "", produto: conteudo.produto });

  return (
    <>
      <a
        href="#formulario"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-[6px] focus:bg-brand focus:px-4 focus:py-2 focus:text-on-brand"
      >
        Ir para o formulário
      </a>

      {/* ---------- Hero navy ---------- */}
      <header className="bg-[var(--mx-navy)] text-[#EEF3FA]">
        <div className="mx-auto max-w-[1120px] px-6 pb-24 pt-7 sm:pb-28">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-[7px] bg-[var(--mx-sky)] font-(family-name:--font-display) text-[14px] font-[800] text-[var(--mx-navy)]">
              MX
            </span>
            <span className="font-(family-name:--font-display) text-[10.5px] font-[700] uppercase tracking-[.14em] text-[#8FA8C4]">
              Corretora de seguros
            </span>
          </div>

          <div className="mt-14 grid gap-12 lg:grid-cols-[1.05fr_minmax(0,420px)] lg:gap-16">
            <div>
              <p className="font-(family-name:--font-display) text-[11px] font-[700] uppercase tracking-[.14em] text-[#8FA8C4]">
                {conteudo.eyebrow}
              </p>

              <h1 className="mt-4 max-w-[16ch] text-[clamp(32px,5vw,52px)] font-[800] leading-[1.08] tracking-[-.02em] text-white">
                {conteudo.titulo}{" "}
                <em className="not-italic text-[var(--mx-sky)]">{conteudo.tituloDestaque}</em>
              </h1>

              <p className="mt-5 max-w-[54ch] text-[17px] leading-[1.62] text-[#C3D2E4]">
                {conteudo.subtitulo}
              </p>

              <dl className="mt-10 flex flex-wrap gap-x-9 gap-y-5 border-t border-[rgba(202,227,247,.2)] pt-6">
                {PROVAS.map((prova) => (
                  <div key={prova.rotulo}>
                    <dt className="sr-only">{prova.rotulo}</dt>
                    <dd>
                      <span className="tabular block font-(family-name:--font-display) text-[26px] font-[800] leading-tight text-white">
                        {prova.numero}
                      </span>
                      <span className="mt-0.5 block font-(family-name:--font-display) text-[10.5px] font-[700] uppercase tracking-[.13em] text-[#8FA8C4]">
                        {prova.rotulo}
                      </span>
                    </dd>
                  </div>
                ))}
              </dl>

              {/* Selo de confiança — nunca como logo principal (§4.3). */}
              <div className="mt-9 inline-flex items-center gap-3 rounded-full border border-[rgba(202,227,247,.28)] px-4 py-2">
                <span aria-hidden="true" className="size-1.5 rounded-full bg-[var(--mx-sky)]" />
                <span className="font-(family-name:--font-display) text-[11px] font-[700] uppercase tracking-[.12em] text-[#C3D2E4]">
                  Corretora de seguros · desde 2002
                </span>
              </div>
            </div>

            <div id="formulario" className="lg:-mb-40">
              <CartaoCaptura
                origem={conteudo.origem}
                produtoPadrao={conteudo.produto}
                textoConsentimento={config.textoConsentimento}
                urlPolitica={config.urlPolitica}
                turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? null}
                linkWhatsapp={wa}
              />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1120px] px-6">
        {/* ---------- Diferenciais ---------- */}
        <section className="grid gap-8 pb-4 pt-16 sm:grid-cols-3 sm:gap-10 lg:pt-24">
          {DIFERENCIAIS.map((item) => (
            <div key={item.titulo}>
              <h2 className="text-[16px] font-[700] leading-snug text-heading">{item.titulo}</h2>
              <p className="mt-2 text-[14px] leading-relaxed text-muted">{item.texto}</p>
            </div>
          ))}
        </section>

        {/* ---------- Os seis seguros PJ ---------- */}
        <section className="border-t border-line py-16">
          <p className="rotulo">O que a MX cota para empresas</p>
          <h2 className="mt-3 max-w-[20ch] text-[clamp(24px,3.4vw,34px)] font-[800] leading-tight tracking-[-.015em]">
            Seis seguros, um consultor só
          </h2>

          <ul className="mt-10 grid gap-x-10 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
            {PRODUTOS.map((produto) => (
              <li key={produto.nome} className="border-t border-line pt-4">
                <h3 className="text-[15px] font-[700] text-heading">{produto.nome}</h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">
                  {produto.descricao}
                </p>
              </li>
            ))}
          </ul>

          <a
            href="#formulario"
            className="mt-10 inline-flex h-[46px] items-center rounded-[6px] bg-brand px-6 font-(family-name:--font-display) text-[15px] font-[700] text-on-brand hover:bg-brand-hover"
          >
            Pedir cotação
          </a>
        </section>
      </main>

      {/* ---------- Rodapé ---------- */}
      <footer className="border-t border-line bg-surface-2">
        <div className="mx-auto flex max-w-[1120px] flex-col gap-6 px-6 py-10 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-[7px] bg-brand font-(family-name:--font-display) text-[14px] font-[800] text-on-brand">
              MX
            </span>
            <span className="font-(family-name:--font-display) text-[10.5px] font-[700] uppercase tracking-[.14em] text-muted">
              Corretora de seguros
            </span>
          </div>

          <div className="max-w-[46ch] text-[12.5px] leading-relaxed text-muted">
            <p>MX Corretora de Seguros · CNPJ 00.000.000/0001-00</p>
            <p className="mt-1">Registro SUSEP nº 000000000000000</p>
            <p className="mt-3 text-faint">
              A MX é corretora e representa você junto às seguradoras. A aceitação do
              seguro é da seguradora, conforme as condições da apólice.
            </p>
            <a
              href={config.urlPolitica}
              className="mt-3 inline-block underline underline-offset-2 hover:text-heading"
            >
              Política de Privacidade
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}
