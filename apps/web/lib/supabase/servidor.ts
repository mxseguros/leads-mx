import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

/** Forma que o @supabase/ssr entrega em setAll. */
type CookieParaGravar = { name: string; value: string; options: CookieOptions };
import { chavePublicavel, urlSupabase } from "../ambiente";

/**
 * Cliente de servidor com a sessao da pessoa logada.
 * Continua sujeito a RLS — e essa a intencao.
 */
export async function clienteServidor() {
  const armazem = await cookies();

  return createServerClient(urlSupabase(), chavePublicavel(), {
    cookies: {
      getAll() {
        return armazem.getAll();
      },
      setAll(lista: CookieParaGravar[]) {
        try {
          for (const { name, value, options } of lista) {
            armazem.set(name, value, options);
          }
        } catch {
          // Server Component nao pode escrever cookie. Server Action e Route
          // Handler podem — e e por isso que o login por senha funciona daqui.
          // O middleware ja renovou a sessao antes de chegar num Server
          // Component, entao ignorar ali e correto.
        }
      },
    },
  });
}

/** Perfil da pessoa logada, ou null. Nao lanca: quem chama decide o que fazer. */
export async function perfilAtual() {
  try {
    const supabase = await clienteServidor();
    const { data: sessao } = await supabase.auth.getUser();
    if (!sessao.user) return null;

    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, initials, role, active")
      .eq("id", sessao.user.id)
      .maybeSingle();

    if (!data || !data.active) return null;

    return {
      id: data.id as string,
      nome: data.full_name as string,
      iniciais: (data.initials as string) ?? "?",
      papel: data.role as "gestor" | "consultor",
      ativa: true as const,
    };
  } catch {
    return null;
  }
}
