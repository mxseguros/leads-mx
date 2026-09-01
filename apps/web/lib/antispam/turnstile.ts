import "server-only";

/**
 * Cloudflare Turnstile (§5.2, item F1-5).
 *
 * As chaves são a dependência E2 e ainda não existem. Em vez de deixar a
 * verificação para depois — que é como um formulário público sobe sem
 * anti-spam e ninguém percebe até o board encher de lixo — ela já está
 * escrita, e o comportamento sem chave é explícito:
 *
 *   desenvolvimento sem chave -> passa, com aviso no log
 *   PRODUÇÃO sem chave        -> RECUSA tudo
 *
 * Falhar fechado em produção é o ponto. Se a MX subir para produção sem
 * configurar o Turnstile, o formulário para de aceitar envio e alguém liga
 * perguntando por quê — que é infinitamente melhor do que descobrir semanas
 * depois, com o board cheio de spam e sem saber desde quando.
 */

const VERIFICACAO = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export type ResultadoTurnstile =
  | { ok: true; modo: "verificado" | "ignorado-em-dev" }
  | { ok: false; motivo: string };

export async function verificarTurnstile(
  token: string | null | undefined,
  ip: string | null,
): Promise<ResultadoTurnstile> {
  const segredo = process.env.TURNSTILE_SECRET_KEY;

  if (!segredo) {
    if (process.env.NODE_ENV === "production") {
      console.error(
        "[turnstile] TURNSTILE_SECRET_KEY ausente em produção. " +
          "Recusando a captura pública — configure a dependência E2.",
      );
      return { ok: false, motivo: "anti-spam não configurado" };
    }
    console.warn("[turnstile] sem chave: verificação ignorada (apenas desenvolvimento)");
    return { ok: true, modo: "ignorado-em-dev" };
  }

  if (!token) return { ok: false, motivo: "token ausente" };

  try {
    const corpo = new URLSearchParams({ secret: segredo, response: token });
    if (ip) corpo.set("remoteip", ip);

    const resposta = await fetch(VERIFICACAO, {
      method: "POST",
      body: corpo,
      // Cloudflare fora do ar não pode segurar o formulário para sempre.
      signal: AbortSignal.timeout(5000),
    });

    const dados = (await resposta.json()) as {
      success?: boolean;
      "error-codes"?: string[];
    };

    if (dados.success) return { ok: true, modo: "verificado" };
    return { ok: false, motivo: (dados["error-codes"] ?? ["recusado"]).join(",") };
  } catch (erro) {
    // Timeout ou rede: recusa. Deixar passar transformaria uma queda da
    // Cloudflare em janela aberta para spam.
    console.error("[turnstile] falha na verificação:", erro);
    return { ok: false, motivo: "verificação indisponível" };
  }
}
