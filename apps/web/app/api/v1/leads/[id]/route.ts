import { type NextRequest } from "next/server";
import { erroJson, exigirGestor, exigirPerfil, lerCorpo } from "@/lib/api";
import { atualizarCampos, excluirLead } from "@/lib/leads/servico";

/** PATCH /api/v1/leads/:id — campos editáveis da ficha (§5.4, §8). */
export async function PATCH(
  request: NextRequest,
  contexto: { params: Promise<{ id: string }> },
) {
  const sessao = await exigirPerfil();
  if (!sessao.ok) return sessao.resposta;

  const { id } = await contexto.params;
  const corpo = (await lerCorpo(request)) as Record<string, unknown> | null;
  if (!corpo) return erroJson(400, "corpo_invalido", "Não conseguimos ler os dados enviados.");

  const resultado = await atualizarCampos(id, corpo, sessao.perfil);
  if (!resultado.ok) {
    const { status, codigo, mensagem, campo } = resultado.falha;
    return erroJson(status, codigo, mensagem, campo);
  }
  return Response.json(resultado.dados, { status: 200 });
}

/** DELETE /api/v1/leads/:id — soft delete, só gestor (§5.4). */
export async function DELETE(
  _request: NextRequest,
  contexto: { params: Promise<{ id: string }> },
) {
  const sessao = await exigirGestor();
  if (!sessao.ok) return sessao.resposta;

  const { id } = await contexto.params;
  const resultado = await excluirLead(id, sessao.perfil);
  if (!resultado.ok) {
    const { status, codigo, mensagem } = resultado.falha;
    return erroJson(status, codigo, mensagem);
  }
  return Response.json(resultado.dados, { status: 200 });
}
