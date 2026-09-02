import { type NextRequest } from "next/server";
import { erroJson, exigirGestor, lerCorpo } from "@/lib/api";
import { salvarAjustes } from "@/lib/configuracoes-admin";

/** PATCH /api/v1/configuracoes — número de WhatsApp, template e textos LGPD (§5.6). */
export async function PATCH(request: NextRequest) {
  const sessao = await exigirGestor();
  if (!sessao.ok) return sessao.resposta;

  const corpo = await lerCorpo(request);
  if (!corpo) return erroJson(400, "corpo_invalido", "Não conseguimos ler os dados enviados.");

  const r = await salvarAjustes(corpo, sessao.perfil);
  if (!r.ok) return erroJson(r.falha.status, r.falha.codigo, r.falha.mensagem, r.falha.campo);
  return Response.json(r.dados, { status: 200 });
}
