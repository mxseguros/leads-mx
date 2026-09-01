import { NextResponse, type NextRequest } from "next/server";
import { clienteServidor } from "@/lib/supabase/servidor";

/**
 * Callback do magic link: troca o codigo do link pela sessao em cookie.
 *
 * Como o middleware, nao lanca: link expirado ou ja usado manda a pessoa de
 * volta ao login com um aviso, nao para uma tela de erro do Next.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const codigo = url.searchParams.get("code");
  const destino = url.searchParams.get("destino") ?? "/esteira";

  const paraLogin = (motivo: string) => {
    const login = url.clone();
    login.pathname = "/entrar";
    login.search = "";
    login.searchParams.set("erro", motivo);
    return NextResponse.redirect(login);
  };

  if (!codigo) return paraLogin("link");

  try {
    const supabase = await clienteServidor();
    const { error } = await supabase.auth.exchangeCodeForSession(codigo);
    if (error) return paraLogin("link");
  } catch {
    return paraLogin("sessao");
  }

  const pronto = url.clone();
  // Só caminho interno: destino vindo da query nao pode virar redirect aberto.
  pronto.pathname = destino.startsWith("/") ? destino : "/esteira";
  pronto.search = "";
  return NextResponse.redirect(pronto);
}
