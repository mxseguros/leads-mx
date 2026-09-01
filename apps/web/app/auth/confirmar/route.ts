import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { clienteServidor } from "@/lib/supabase/servidor";

/**
 * Callback do magic link: troca o link por uma sessão em cookie.
 *
 * Aceita as DUAS formas, porque elas chegam de origens diferentes:
 *
 *   ?code=...        Fluxo PKCE. É o que o formulário de /entrar gera: o
 *                    navegador guardou um code_verifier ao pedir o link, e só
 *                    ele consegue completar a troca. Mais seguro, e o padrão.
 *
 *   ?token_hash=...  Fluxo OTP. É o que um link gerado no servidor produz
 *                    (convite da equipe, recuperação de acesso) e o que o
 *                    template de e-mail do Supabase manda quando configurado
 *                    com {{ .TokenHash }}. Não depende de estado no navegador.
 *
 * Como o middleware, não lança: link expirado ou já usado manda a pessoa de
 * volta ao login com um aviso, nunca para uma tela de erro do Next.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const codigo = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const tipo = (url.searchParams.get("type") ?? "magiclink") as EmailOtpType;
  const destino = url.searchParams.get("destino") ?? "/esteira";

  const paraLogin = (motivo: string) => {
    const login = url.clone();
    login.pathname = "/entrar";
    login.search = "";
    login.searchParams.set("erro", motivo);
    return NextResponse.redirect(login);
  };

  if (!codigo && !tokenHash) return paraLogin("link");

  try {
    const supabase = await clienteServidor();

    const { error } = codigo
      ? await supabase.auth.exchangeCodeForSession(codigo)
      : await supabase.auth.verifyOtp({ token_hash: tokenHash!, type: tipo });

    if (error) return paraLogin("link");
  } catch {
    return paraLogin("sessao");
  }

  const pronto = url.clone();
  // Só caminho interno: destino vindo da query não pode virar redirect aberto
  // para um site de fora.
  pronto.pathname = destino.startsWith("/") ? destino : "/esteira";
  pronto.search = "";
  return NextResponse.redirect(pronto);
}
