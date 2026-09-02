import "server-only";

/**
 * Captura de erro e log estruturado (F4-2).
 *
 * O Sentry ainda não tem DSN, e a MX pode nunca contratar. Em vez de deixar a
 * observabilidade para depois — que é como um erro em produção fica três dias
 * sem ninguém saber — o ponto de captura já existe e o comportamento sem DSN é
 * explícito: cai no log estruturado, que a Vercel indexa.
 *
 * Quando o DSN aparecer, `SENTRY_DSN` no ambiente liga o envio sem tocar em
 * nenhuma chamada.
 */

type Contexto = Record<string, string | number | boolean | null | undefined>;

function limpar(ctx: Contexto | undefined): Contexto {
  if (!ctx) return {};
  const saida: Contexto = {};
  for (const [k, v] of Object.entries(ctx)) {
    // Nunca deixa dado pessoal virar contexto de erro: um Sentry cheio de
    // telefone de cliente e uma base de leads paralela, fora da RLS.
    if (/email|telefone|phone|nome|cpf|cnpj/i.test(k)) continue;
    if (v !== undefined) saida[k] = v;
  }
  return saida;
}

export function capturarErro(erro: unknown, contexto?: Contexto): void {
  const ctx = limpar(contexto);
  const mensagem = erro instanceof Error ? erro.message : String(erro);
  const pilha = erro instanceof Error ? erro.stack : undefined;

  // Uma linha por evento, em JSON: o que a Vercel consegue filtrar.
  console.error(
    JSON.stringify({
      nivel: "erro",
      mensagem,
      pilha: pilha?.split("\n").slice(0, 6).join(" | "),
      ...ctx,
      em: new Date().toISOString(),
    }),
  );

  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  void enviarAoSentry(dsn, mensagem, pilha, ctx);
}

export function registrar(evento: string, contexto?: Contexto): void {
  console.info(JSON.stringify({ nivel: "info", evento, ...limpar(contexto), em: new Date().toISOString() }));
}

/**
 * Envio direto pela API de store do Sentry.
 *
 * Sem o SDK de propósito: `@sentry/nextjs` traz instrumentação de build,
 * arquivos de configuração e peso, e ainda não há DSN para justificar isso.
 * Este caminho cobre o essencial — erro com pilha e contexto — e o SDK entra
 * depois, se a MX quiser tracing e replay.
 */
async function enviarAoSentry(
  dsn: string,
  mensagem: string,
  pilha: string | undefined,
  ctx: Contexto,
): Promise<void> {
  try {
    const url = new URL(dsn);
    const chave = url.username;
    const projeto = url.pathname.replace("/", "");
    const endpoint = `${url.protocol}//${url.host}/api/${projeto}/store/`;

    await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Sentry-Auth": `Sentry sentry_version=7, sentry_key=${chave}`,
      },
      body: JSON.stringify({
        message: mensagem,
        level: "error",
        platform: "javascript",
        environment: process.env.NODE_ENV,
        extra: { ...ctx, pilha },
        timestamp: Date.now() / 1000,
      }),
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    // Observabilidade fora do ar não pode derrubar o que ela observa.
  }
}
