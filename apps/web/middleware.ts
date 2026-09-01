import { NextResponse, type NextRequest } from "next/server";
import { renovarSessao } from "@/lib/supabase/middleware";

/**
 * Guarda das rotas do admin.
 *
 * Regra que este arquivo existe para cumprir (item F0-12): o middleware NAO
 * pode lancar. Um throw aqui devolve 500 em toda rota que passa pelo matcher,
 * nao so naquela que falhou — inclusive a tela de login, e ai ninguem
 * consegue nem entrar para consertar. Falha de auth vira redirect, sempre.
 */

const ROTAS_PROTEGIDAS = ["/esteira", "/lista", "/configuracoes"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  try {
    const { resposta, autenticado } = await renovarSessao(request);

    const protegida = ROTAS_PROTEGIDAS.some(
      (rota) => pathname === rota || pathname.startsWith(`${rota}/`),
    );

    if (protegida && !autenticado) {
      const destino = request.nextUrl.clone();
      destino.pathname = "/entrar";
      // Preserva para onde a pessoa queria ir, para voltar depois do login.
      destino.searchParams.set("destino", pathname);
      return NextResponse.redirect(destino);
    }

    if (pathname === "/entrar" && autenticado) {
      const destino = request.nextUrl.clone();
      destino.pathname = "/esteira";
      destino.search = "";
      return NextResponse.redirect(destino);
    }

    return resposta;
  } catch {
    // Ultima linha de defesa. Se ate o tratamento falhou, a pessoa vai para o
    // login em vez de receber 500 — e o resto do site continua de pe.
    const destino = request.nextUrl.clone();
    destino.pathname = "/entrar";
    destino.searchParams.set("erro", "sessao");
    return NextResponse.redirect(destino);
  }
}

export const config = {
  matcher: [
    /*
     * Tudo, menos estaticos, imagens e o widget.js (que e publico por
     * definicao e nao pode carregar cookie de sessao).
     */
    "/((?!_next/static|_next/image|favicon.ico|widget.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2)$).*)",
  ],
};
