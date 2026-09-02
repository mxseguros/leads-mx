import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { clienteServidor, perfilAtual } from "@/lib/supabase/servidor";
import { lerConfiguracoes } from "@/lib/configuracoes";
import { Moldura } from "../_admin/moldura";
import { Painel } from "./painel";

export const metadata: Metadata = { title: "Configurações" };

/**
 * Configurações (§5.6, F3-6). Só gestor.
 *
 * A checagem aqui é a segunda camada: a RLS já recusa a escrita pelas
 * políticas `*_write`, e as rotas exigem gestor. Barrar na porta evita que o
 * consultor veja uma tela inteira de campos que não consegue salvar.
 */
export default async function PaginaConfiguracoes() {
  const perfil = await perfilAtual();
  if (!perfil) redirect("/entrar");
  if (perfil.papel !== "gestor") redirect("/esteira");

  const supabase = await clienteServidor();
  const [config, motivos, produtos, origens, equipe] = await Promise.all([
    lerConfiguracoes(),
    supabase.from("lost_reasons").select("id, label, active").order("sort_order").order("id"),
    supabase.from("products").select("id, label, active").order("sort_order").order("id"),
    supabase.from("lead_sources").select("id, label, active").order("id"),
    supabase.from("profiles").select("id, full_name, initials, role, active").order("full_name"),
  ]);

  const item = (linhas: { id: unknown; label: unknown; active: unknown }[] | null) =>
    (linhas ?? []).map((l) => ({
      id: Number(l.id),
      label: String(l.label),
      ativo: Boolean(l.active),
    }));

  return (
    <Moldura perfil={perfil} atual="/configuracoes">
      <header className="border-b border-line px-4 py-3 sm:px-6">
        <h1 className="text-[20px] font-[800] sm:text-[22px]">Configurações</h1>
        <p className="mt-0.5 text-[13px] text-muted">
          O que a MX muda sem depender de deploy.
        </p>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <Painel
          config={config}
          motivos={item(motivos.data)}
          produtos={item(produtos.data)}
          origens={item(origens.data)}
          equipe={(equipe.data ?? []).map((p) => ({
            id: String(p.id),
            nome: String(p.full_name),
            iniciais: String(p.initials ?? "?"),
            papel: p.role as "gestor" | "consultor",
            ativa: Boolean(p.active),
          }))}
          euId={perfil.id}
        />
      </div>
    </Moldura>
  );
}
