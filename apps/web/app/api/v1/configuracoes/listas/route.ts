import { type NextRequest } from "next/server";
import { erroJson, exigirGestor, lerCorpo } from "@/lib/api";
import { alternarItem, criarMotivoPerda } from "@/lib/configuracoes-admin";

const TABELAS = ["lost_reasons", "products", "lead_sources"] as const;
type Tabela = (typeof TABELAS)[number];

/** POST /api/v1/configuracoes/listas — acrescenta motivo de perda (§5.6). */
export async function POST(request: NextRequest) {
  const sessao = await exigirGestor();
  if (!sessao.ok) return sessao.resposta;

  const corpo = (await lerCorpo(request)) as { label?: string } | null;
  if (!corpo) return erroJson(400, "corpo_invalido", "Não conseguimos ler os dados enviados.");

  const r = await criarMotivoPerda(corpo.label);
  if (!r.ok) return erroJson(r.falha.status, r.falha.codigo, r.falha.mensagem, r.falha.campo);
  return Response.json(r.dados, { status: 201 });
}

/** PATCH — ativa ou desativa item de lista. Desativa, nunca apaga. */
export async function PATCH(request: NextRequest) {
  const sessao = await exigirGestor();
  if (!sessao.ok) return sessao.resposta;

  const corpo = (await lerCorpo(request)) as
    | { tabela?: string; id?: number; ativo?: boolean }
    | null;
  if (!corpo) return erroJson(400, "corpo_invalido", "Não conseguimos ler os dados enviados.");

  if (!TABELAS.includes(corpo.tabela as Tabela)) {
    return erroJson(422, "tabela_invalida", "Lista desconhecida.", "tabela");
  }

  const r = await alternarItem(corpo.tabela as Tabela, Number(corpo.id), Boolean(corpo.ativo));
  if (!r.ok) return erroJson(r.falha.status, r.falha.codigo, r.falha.mensagem, r.falha.campo);
  return Response.json(r.dados, { status: 200 });
}
