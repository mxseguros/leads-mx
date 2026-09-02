import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { perfilAtual } from "@/lib/supabase/servidor";
import { lerLeads, lerMetricas, lerReferencias } from "@/lib/leads/consulta";
import { lerConfiguracoes } from "@/lib/configuracoes";
import { Avatar } from "@/componentes/ui/avatar";
import { Quadro } from "./quadro";
import { FaixaMetricas } from "./metricas";
import { lerFiltrosDaUrl } from "@/lib/leads/filtros";

export const metadata: Metadata = { title: "Esteira" };

/**
 * A esteira é a home (§3, princípio 2): o consultor cai direto no board, não
 * em um dashboard.
 *
 * Server Component: busca leads, listas de referência e configurações, e
 * entrega tudo pronto ao `Quadro`, que cuida da interação. A faixa de métricas
 * é a Fase 3.
 */
export default async function PaginaEsteira({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const perfil = await perfilAtual();

  // O middleware já barrou quem não tem sessão. Este segundo cheque pega o
  // perfil desligado no meio da sessão — a RLS também barraria, mas uma tela
  // vazia sem explicação é pior que um redirect.
  if (!perfil) redirect("/entrar");

  const [{ leads, erro }, referencias, metricas, config, params] = await Promise.all([
    lerLeads(),
    lerReferencias(),
    lerMetricas(),
    lerConfiguracoes(),
    searchParams,
  ]);

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
            {["Lista", "Relatórios", "Configurações"].map((item) => (
              <span
                key={item}
                aria-disabled="true"
                title="Chega na Fase 3"
                className="px-3 py-2 text-[13.5px] text-[#6C819C]"
              >
                {item}
              </span>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2.5 border-t border-[rgba(202,227,247,.18)] px-1 pt-4">
          <Avatar iniciais={perfil.iniciais} nome={perfil.nome} />
          <div className="min-w-0">
            <p className="truncate text-[13px] font-[600] text-white">{perfil.nome}</p>
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

        <FaixaMetricas m={metricas} />

        {erro ? (
          <div
            role="alert"
            className="m-6 rounded-[8px] border border-warn bg-warn-soft p-4 text-[13.5px] text-texto"
          >
            Não foi possível carregar os leads agora. Recarregue a página; se continuar, o
            banco pode não estar acessível.
          </div>
        ) : (
          <Quadro
            leadsIniciais={leads}
            referencias={referencias}
            ehGestor={perfil.papel === "gestor"}
            numeroWhatsapp={config.numeroWhatsapp || null}
            filtrosIniciais={lerFiltrosDaUrl(params)}
          />
        )}
      </main>
    </div>
  );
}
