import "server-only";

import { NextResponse } from "next/server";
import { perfilAtual } from "./supabase/servidor";

/**
 * Peças comuns das rotas do admin (§8).
 *
 * Erros saem sempre como {error:{code,message,field?}} com mensagem em
 * português pronta para exibir — a interface mostra o que vier, sem traduzir.
 */

export type Perfil = NonNullable<Awaited<ReturnType<typeof perfilAtual>>>;

export function erroJson(
  status: number,
  code: string,
  message: string,
  field?: string,
) {
  return NextResponse.json(
    { error: { code, message, ...(field ? { field } : {}) } },
    { status },
  );
}

/**
 * Exige sessão de perfil ATIVO.
 *
 * A RLS já barraria a consulta, mas ela devolveria zero linhas — que a
 * interface leria como "lead não existe". Barrar aqui dá 401 e a mensagem
 * certa. Defesa em profundidade: as duas camadas fazem a mesma pergunta.
 */
export async function exigirPerfil(): Promise<
  { ok: true; perfil: Perfil } | { ok: false; resposta: NextResponse }
> {
  const perfil = await perfilAtual();
  if (!perfil) {
    return {
      ok: false,
      resposta: erroJson(401, "sem_sessao", "Sua sessão expirou. Entre de novo."),
    };
  }
  return { ok: true, perfil };
}

export async function exigirGestor(): Promise<
  { ok: true; perfil: Perfil } | { ok: false; resposta: NextResponse }
> {
  const sessao = await exigirPerfil();
  if (!sessao.ok) return sessao;

  if (sessao.perfil.papel !== "gestor") {
    return {
      ok: false,
      resposta: erroJson(403, "sem_permissao", "Só o gestor comercial pode fazer isso."),
    };
  }
  return sessao;
}

/** Lê o corpo JSON sem deixar entrada malformada virar 500. */
export async function lerCorpo(request: Request): Promise<unknown | null> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
