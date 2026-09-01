import "server-only";

/**
 * Rate limit por IP da captura pública (item F1-5).
 *
 * Duas implementações atrás da mesma função:
 *
 *   Upstash configurado  -> contador compartilhado, vale para todas as
 *                           instâncias. É o modo de produção.
 *   Upstash ausente      -> contador EM MEMÓRIA do processo.
 *
 * O modo em memória serve para desenvolvimento e não deve ser confundido com
 * proteção: em serverless cada instância tem a própria memória, então o limite
 * real vira (limite × instâncias vivas). Ele existe para o código ter um só
 * caminho e para o desenvolvimento se comportar como produção — não para
 * segurar um ataque.
 *
 * Por isso, em produção sem Upstash o log grita. Diferente do Turnstile, aqui
 * não recusamos: rate limit é a segunda linha, o Turnstile é a primeira, e
 * derrubar a captura por falta de Redis seria pior que o problema.
 */

const JANELA_MS = 60_000;
const MAXIMO = 5; // 5 envios por minuto por IP

type Registro = { contagem: number; expiraEm: number };
const memoria = new Map<string, Registro>();

let avisou = false;

export type ResultadoLimite = {
  permitido: boolean;
  restantes: number;
  /** Segundos até poder tentar de novo. Vira o header Retry-After. */
  esperarSegundos: number;
};

function emMemoria(chave: string): ResultadoLimite {
  const agora = Date.now();

  // Limpeza preguiçosa: sem isto o Map cresce para sempre num processo longo.
  if (memoria.size > 5000) {
    for (const [k, v] of memoria) if (v.expiraEm <= agora) memoria.delete(k);
  }

  const atual = memoria.get(chave);
  if (!atual || atual.expiraEm <= agora) {
    memoria.set(chave, { contagem: 1, expiraEm: agora + JANELA_MS });
    return { permitido: true, restantes: MAXIMO - 1, esperarSegundos: 0 };
  }

  atual.contagem += 1;
  const restantes = Math.max(0, MAXIMO - atual.contagem);
  return {
    permitido: atual.contagem <= MAXIMO,
    restantes,
    esperarSegundos: Math.ceil((atual.expiraEm - agora) / 1000),
  };
}

async function noUpstash(chave: string, url: string, token: string): Promise<ResultadoLimite> {
  // INCR + EXPIRE numa ida só. O EXPIRE é NX: renovar a cada requisição
  // transformaria a janela deslizante numa punição infinita para quem insiste.
  const comandos = [
    ["INCR", chave],
    ["EXPIRE", chave, String(Math.ceil(JANELA_MS / 1000)), "NX"],
    ["TTL", chave],
  ];

  const resposta = await fetch(`${url}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(comandos),
    signal: AbortSignal.timeout(2000),
  });

  if (!resposta.ok) throw new Error(`upstash HTTP ${resposta.status}`);

  const saida = (await resposta.json()) as Array<{ result: number }>;
  const contagem = Number(saida[0]?.result ?? 1);
  const ttl = Number(saida[2]?.result ?? JANELA_MS / 1000);

  return {
    permitido: contagem <= MAXIMO,
    restantes: Math.max(0, MAXIMO - contagem),
    esperarSegundos: ttl > 0 ? ttl : Math.ceil(JANELA_MS / 1000),
  };
}

export async function verificarLimite(ip: string | null): Promise<ResultadoLimite> {
  const chave = `captura:${ip ?? "sem-ip"}`;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    if (process.env.NODE_ENV === "production" && !avisou) {
      avisou = true;
      console.error(
        "[limite] Upstash ausente em produção: o rate limit está por instância " +
          "e NÃO protege de verdade. Configure a dependência E3.",
      );
    }
    return emMemoria(chave);
  }

  try {
    return await noUpstash(chave, url, token);
  } catch (erro) {
    // Redis fora do ar não pode derrubar a captura. Cai para a memória, que é
    // pior mas não é nada, e registra para aparecer no painel de saúde (F4-3).
    console.error("[limite] Upstash falhou, usando memória:", erro);
    return emMemoria(chave);
  }
}

/** Só para teste: zera o contador em memória entre casos. */
export function _limparMemoria() {
  memoria.clear();
}
