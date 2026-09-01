import { NextResponse, type NextRequest } from "next/server";
import { validarCaptura } from "@/lib/captura/esquema";
import { registrarCaptura } from "@/lib/captura/registrar";
import { verificarTurnstile } from "@/lib/antispam/turnstile";
import { verificarLimite } from "@/lib/antispam/limite";
import { avisarNovoLead } from "@/lib/notificar/email";
import { lerConfiguracoes } from "@/lib/configuracoes";

/**
 * POST /api/v1/leads/publico — captura pública da landing (§8).
 *
 * A ordem das checagens é deliberada, da mais barata para a mais cara:
 *   1. rate limit      — sem I/O externo
 *   2. formato + honeypot — CPU local
 *   3. Turnstile       — ida à Cloudflare
 *   4. dedupe + gravação — ida ao banco
 *
 * Um robô que dispara mil requisições para no passo 1 e nunca custa uma
 * consulta ao Supabase.
 *
 * Erros saem como {error:{code,message,field?}} com mensagem em português
 * pronta para exibir (§8). Nunca 500 numa entrada malformada.
 */

export const runtime = "nodejs";

/*
 * Sem CORS, de propósito.
 *
 * Esta rota tinha `Access-Control-Allow-Origin: *` para o widget poder
 * chamá-la de dentro do site da MX. Com o widget fora de escopo, o único
 * chamador legítimo é o formulário da própria landing, que é mesma origem e
 * não precisa de CORS nenhum.
 *
 * Manter o curinga seria deixar qualquer site do mundo gravar lead no board
 * da MX pelo navegador de quem o visitasse. Como o corpo vai em
 * `application/json`, o navegador exige preflight — e sem o OPTIONS e sem o
 * cabeçalho, a chamada de outra origem simplesmente não sai.
 *
 * Isso não vale para curl e afins, que ignoram CORS: contra esses quem
 * responde são o Turnstile e o rate limit.
 */

function erro(
  status: number,
  code: string,
  message: string,
  field?: string,
  extra?: Record<string, string>,
) {
  return NextResponse.json(
    { error: { code, message, ...(field ? { field } : {}) } },
    { status, headers: extra },
  );
}

function ipDaRequisicao(request: NextRequest): string | null {
  // Na Vercel o IP real vem em x-forwarded-for; o primeiro da lista é o cliente.
  const encaminhado = request.headers.get("x-forwarded-for");
  if (encaminhado) return encaminhado.split(",")[0]!.trim();
  return request.headers.get("x-real-ip");
}

export async function POST(request: NextRequest) {
  const ip = ipDaRequisicao(request);

  // 1. Rate limit
  const limite = await verificarLimite(ip);
  if (!limite.permitido) {
    return erro(
      429,
      "muitas_tentativas",
      "Muitas tentativas seguidas. Aguarde um minuto e envie de novo.",
      undefined,
      { "Retry-After": String(limite.esperarSegundos) },
    );
  }

  // 2. Formato, honeypot e regras do §5.7
  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    return erro(400, "corpo_invalido", "Não conseguimos ler os dados enviados.");
  }

  const validacao = validarCaptura(corpo);
  if (!validacao.ok) {
    // O honeypot sai ANTES, e sem nomear o campo. Devolver field:"hp" entrega
    // ao robô exatamente qual campo o denunciou — na tentativa seguinte ele
    // deixa aquele em branco e passa. Para quem tropeçar nele por acidente
    // (preenchimento automático agressivo), a mensagem genérica ainda serve.
    if (validacao.erros.hp) {
      console.warn(`[captura] honeypot preenchido ip=${ip ?? "?"}`);
      return erro(422, "dados_invalidos", "Confira os dados informados.");
    }

    const [campo, mensagem] = Object.entries(validacao.erros)[0] ?? [];
    return erro(
      422,
      "dados_invalidos",
      mensagem ?? "Confira os dados informados.",
      campo,
    );
  }

  const dados = validacao.dados;

  // 3. Turnstile
  const desafio = await verificarTurnstile(dados.turnstile, ip);
  if (!desafio.ok) {
    console.warn(`[captura] Turnstile recusou (${desafio.motivo}) ip=${ip ?? "?"}`);
    return erro(
      403,
      "verificacao_falhou",
      "Não foi possível confirmar que você não é um robô. Recarregue a página e tente de novo.",
    );
  }

  // 4. Dedupe e gravação
  try {
    const config = await lerConfiguracoes();
    const resultado = await registrarCaptura(dados, {
      ip,
      textoConsentimento: config.textoConsentimento,
      versaoConsentimento: config.versaoConsentimento,
    });

    if (resultado.status === "duplicado") {
      // 200, não 201: nada foi criado. O visitante não precisa saber disso —
      // para ele o pedido chegou, e chegou mesmo.
      return NextResponse.json(
        { id: resultado.id, duplicate: true },
        { status: 200 },
      );
    }

    // Não segura a resposta esperando o e-mail: o visitante não tem nada a ver
    // com a caixa de entrada do gestor.
    void avisarNovoLead({
      id: resultado.id,
      nome: `${dados.nome} ${dados.sobrenome}`,
      telefone: dados.telefone,
      email: dados.email,
      produto: dados.produto ?? null,
      origem: dados.origem,
    });

    return NextResponse.json({ id: resultado.id }, { status: 201 });
  } catch (falha) {
    console.error("[captura] falha ao registrar:", falha);
    return erro(
      500,
      "falha_interna",
      "Tivemos um problema ao registrar seu pedido. Tente de novo em instantes.",
    );
  }
}
