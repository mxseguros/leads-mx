import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FASES } from "@/lib/dominio/fases";
import { linhasParaLeads, ordenarCartoes } from "@/lib/dominio/mapear";
import type { LinhaBoard } from "@/lib/dominio/tipos";
import { clienteServidor, perfilAtual } from "@/lib/supabase/servidor";
import { Avatar } from "@/componentes/ui/avatar";
import { BadgeProximaAcao, ChipOrigem, ChipProduto } from "@/componentes/ui/chip";
import { dataCurta, moeda, telefone } from "@/lib/formato";

export const metadata: Metadata = { title: "Esteira" };

/**
 * A esteira e a home (§3, principio 2): o consultor cai direto no board, nao
 * em um dashboard.
 *
 * Fase 0 entrega a casca: sete colunas, contagens, estados vazios e o cartao
 * em modo leitura. Arrastar, ficha e regras de fase sao a Fase 2; a faixa de
 * metricas e a Fase 3.
 */
export default async function PaginaEsteira() {
  const perfil = await perfilAtual();

  // O middleware ja barrou quem nao tem sessao. Este segundo cheque pega o
  // caso de perfil desligado no meio da sessao — a RLS tambem barraria, mas
  // uma tela vazia sem explicacao e pior que um redirect.
  if (!perfil) redirect("/entrar");

  const supabase = await clienteServidor();
  const { data, error } = await supabase
    .from("v_leads_board")
    .select("*")
    .order("created_at", { ascending: false });

  const leads = error ? [] : linhasParaLeads((data ?? []) as LinhaBoard[]);

  return (
    <div className="flex min-h-screen">
      {/* Sidebar navy de 232px (§5.3) */}
      <aside className="hidden w-[232px] shrink-0 flex-col justify-between bg-[var(--mx-navy)] px-4 py-5 md:flex">
        <div>
          <div className="mb-8 flex items-center gap-2.5 px-1">
            <span className="grid size-8 place-items-center rounded-[6px] bg-[var(--mx-sky)] font-(family-name:--font-display) text-[13px] font-[800] text-[var(--mx-navy)]">
              MX
            </span>
            <span className="font-(family-name:--font-display) text-[10.5px] font-[700] uppercase tracking-[.13em] text-[#8FA8C4]">
              Leads
            </span>
          </div>

          <nav className="flex flex-col gap-0.5">
            <span className="rounded-[6px] bg-[rgba(202,227,247,.14)] px-3 py-2 text-[13.5px] font-[600] text-white">
              Esteira
            </span>
            {["Contatos", "Relatórios", "Landing", "Widget", "Configurações"].map(
              (item) => (
                <span
                  key={item}
                  aria-disabled="true"
                  title="Chega nas próximas fases"
                  className="px-3 py-2 text-[13.5px] text-[#6C819C]"
                >
                  {item}
                </span>
              ),
            )}
          </nav>
        </div>

        <div className="flex items-center gap-2.5 border-t border-[rgba(202,227,247,.18)] px-1 pt-4">
          <Avatar iniciais={perfil.iniciais} nome={perfil.nome} />
          <div className="min-w-0">
            <p className="truncate text-[13px] font-[600] text-white">
              {perfil.nome}
            </p>
            <p className="text-[11px] capitalize text-[#8FA8C4]">{perfil.papel}</p>
          </div>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-line px-6 py-4">
          <h1 className="text-[22px] font-[800]">Esteira</h1>
          <span className="tabular text-[13px] text-muted">
            {leads.length} {leads.length === 1 ? "lead" : "leads"}
          </span>
        </header>

        {error ? (
          <div
            role="alert"
            className="m-6 rounded-[8px] border border-warn bg-warn-soft p-4 text-[13.5px] text-texto"
          >
            Não foi possível carregar os leads agora. Recarregue a página; se
            continuar, o banco pode não estar acessível.
          </div>
        ) : null}

        {/* Board: 7 colunas de 272px com rolagem horizontal (§5.3) */}
        <div className="min-h-0 flex-1 overflow-x-auto px-6 py-5">
          <div className="flex h-full gap-3">
            {FASES.map((fase) => {
              const daFase = ordenarCartoes(
                leads.filter((lead) => lead.fase === fase.id),
              );
              const atrasados = daFase.filter((lead) => lead.atrasado).length;
              const soma = daFase.reduce(
                (total, lead) => total + (lead.valorEstimado ?? 0),
                0,
              );

              return (
                <section
                  key={fase.id}
                  aria-label={fase.nome}
                  className="flex w-[272px] shrink-0 flex-col rounded-[8px] border border-line bg-surface-2"
                >
                  <header className="flex items-center gap-2 border-b border-line px-3 py-2.5">
                    <i
                      aria-hidden="true"
                      className="size-[9px] shrink-0 rounded-full"
                      style={{ backgroundColor: fase.cor }}
                    />
                    <h2 className="min-w-0 flex-1 truncate text-[13px] font-[700]">
                      {fase.nome}
                    </h2>
                    <span className="tabular text-[12px] text-muted">
                      {daFase.length}
                    </span>
                    {atrasados > 0 ? (
                      <span
                        className="tabular rounded-[4px] bg-bad-soft px-1.5 text-[11px] font-[600] text-bad"
                        title={`${atrasados} atrasado(s)`}
                      >
                        {atrasados}
                      </span>
                    ) : null}
                  </header>

                  <div className="flex min-h-[120px] flex-1 flex-col gap-2 overflow-y-auto p-2">
                    {daFase.length === 0 ? (
                      // Estado vazio ensina o que fazer (§3, principio 9)
                      <p className="px-1 py-3 text-[12.5px] leading-relaxed text-faint">
                        {fase.vazio}
                      </p>
                    ) : (
                      daFase.map((lead) => (
                        <article
                          key={lead.id}
                          className={
                            "rounded-[6px] border border-line bg-surface p-3 shadow-(--shadow-mx-1) " +
                            (lead.semResponsavel
                              ? "border-l-[3px] border-l-[var(--st-potenciais)]"
                              : "")
                          }
                        >
                          <div className="mb-2 flex items-center gap-2">
                            {lead.produto ? (
                              <ChipProduto>{lead.produto}</ChipProduto>
                            ) : null}
                            <ChipOrigem>{lead.origem.rotulo}</ChipOrigem>
                          </div>

                          <p className="text-[14px] font-[700] leading-snug text-heading">
                            {lead.nomeCompleto}
                          </p>
                          <p className="tabular mt-0.5 text-[12.5px] text-muted">
                            {telefone(lead.telefone)}
                          </p>

                          <div className="mt-2.5 flex items-center justify-between gap-2">
                            {lead.proximaAcao ? (
                              <BadgeProximaAcao
                                texto={lead.proximaAcao}
                                data={dataCurta(lead.proximaAcaoEm)}
                                estado={
                                  lead.terminal
                                    ? "fechado"
                                    : lead.atrasado
                                      ? "atrasado"
                                      : lead.paraHoje
                                        ? "hoje"
                                        : "normal"
                                }
                              />
                            ) : (
                              <span className="text-[11.5px] text-faint">
                                Sem próxima ação
                              </span>
                            )}
                            <Avatar
                              iniciais={lead.responsavel?.iniciais ?? "?"}
                              nome={lead.responsavel?.nome}
                              semDono={lead.semResponsavel}
                            />
                          </div>

                          {lead.valorEstimado ? (
                            <p className="tabular mt-2 text-[12.5px] font-[600] text-heading">
                              {moeda(lead.valorEstimado)}
                            </p>
                          ) : null}
                        </article>
                      ))
                    )}
                  </div>

                  {fase.id === "negociacao" && soma > 0 ? (
                    <footer className="tabular border-t border-line px-3 py-2 text-[12px] font-[600] text-muted">
                      {moeda(soma)}
                    </footer>
                  ) : null}
                </section>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
