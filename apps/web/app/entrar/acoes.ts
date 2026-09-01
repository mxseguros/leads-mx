"use server";

import { z } from "zod";
import { clienteServidor } from "@/lib/supabase/servidor";
import { urlBase } from "@/lib/ambiente";

/**
 * Envio do magic link (item F0-11).
 *
 * O mesmo schema zod que valida aqui vale no cliente: o cliente e
 * conveniencia, o servidor e a autoridade (§5.7).
 */

const esquema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Informe seu e-mail.")
    .email("E-mail incompleto — ex.: nome@mxseguros.com.br"),
});

export type ResultadoEntrada =
  | { ok: true; email: string }
  | { ok: false; erro: string };

export async function enviarMagicLink(
  _anterior: ResultadoEntrada | null,
  dados: FormData,
): Promise<ResultadoEntrada> {
  const analise = esquema.safeParse({ email: dados.get("email") });

  if (!analise.success) {
    return {
      ok: false,
      erro: analise.error.issues[0]?.message ?? "Verifique o e-mail informado.",
    };
  }

  const destino = String(dados.get("destino") ?? "/esteira");

  try {
    const supabase = await clienteServidor();
    const { error } = await supabase.auth.signInWithOtp({
      email: analise.data.email,
      options: {
        // Convite e feito pelo gestor em Configuracoes (Fase 3). Ate lá, quem
        // nao foi cadastrado nao cria conta sozinho pelo formulario.
        shouldCreateUser: false,
        emailRedirectTo: `${urlBase()}/auth/confirmar?destino=${encodeURIComponent(destino)}`,
      },
    });

    if (error) {
      // Nao revelamos se o e-mail existe na base: isso entrega quem trabalha
      // na MX para quem estiver testando endereços.
      return {
        ok: false,
        erro: "Não foi possível enviar o link agora. Tente de novo em alguns minutos.",
      };
    }

    return { ok: true, email: analise.data.email };
  } catch {
    return {
      ok: false,
      erro: "Não foi possível enviar o link agora. Tente de novo em alguns minutos.",
    };
  }
}
