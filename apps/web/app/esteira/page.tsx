import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { perfilAtual } from "@/lib/supabase/servidor";
import { lerLeads, lerMetricas, lerReferencias, lerSinaisSla } from "@/lib/leads/consulta";
import { lerConfiguracoes } from "@/lib/configuracoes";
import { Moldura, TopoAdmin } from "../_admin/moldura";
import { SinaisSlaFaixa } from "../_admin/sinais";
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

  const [{ leads, erro }, referencias, metricas, sinais, config, params] = await Promise.all([
    lerLeads(),
    lerReferencias(),
    lerMetricas(),
    lerSinaisSla(),
    lerConfiguracoes(),
    searchParams,
  ]);

  return (
    <Moldura perfil={perfil} atual="/esteira">
      <TopoAdmin
        titulo="Esteira"
        contagem={`${leads.length} ${leads.length === 1 ? "lead" : "leads"}`}
        atual="/esteira"
      />

      <SinaisSlaFaixa s={sinais} />
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
    </Moldura>
  );
}
