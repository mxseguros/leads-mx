import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { perfilAtual } from "@/lib/supabase/servidor";
import { lerLeads, lerReferencias, lerSinaisSla } from "@/lib/leads/consulta";
import { lerConfiguracoes } from "@/lib/configuracoes";
import { lerFiltrosDaUrl } from "@/lib/leads/filtros";
import { Moldura, TopoAdmin } from "../_admin/moldura";
import { SinaisSlaFaixa } from "../_admin/sinais";
import { Tabela } from "./tabela";

export const metadata: Metadata = { title: "Lista" };

/** Visão Lista (§5.5). Mesma esteira, outro ângulo. */
export default async function PaginaLista({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const perfil = await perfilAtual();
  if (!perfil) redirect("/entrar");

  const [{ leads, erro }, referencias, sinais, config, params] = await Promise.all([
    lerLeads(),
    lerReferencias(),
    lerSinaisSla(),
    lerConfiguracoes(),
    searchParams,
  ]);

  return (
    <Moldura perfil={perfil} atual="/lista">
      <TopoAdmin
        titulo="Lista"
        contagem={`${leads.length} ${leads.length === 1 ? "lead" : "leads"}`}
        atual="/lista"
      />

      <SinaisSlaFaixa s={sinais} />

      {erro ? (
        <div role="alert" className="m-6 rounded-[8px] border border-warn bg-warn-soft p-4 text-[13.5px] text-texto">
          Não foi possível carregar os leads agora. Recarregue a página.
        </div>
      ) : (
        <Tabela
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
