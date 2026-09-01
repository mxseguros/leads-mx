import { type NextRequest } from "next/server";
import { erroJson, exigirPerfil } from "@/lib/api";
import { desfazerFase } from "@/lib/leads/servico";

/**
 * POST /api/v1/leads/:id/desfazer — reverte a última mudança de fase (§6, F2-8).
 *
 * Não recebe corpo. A fase de destino e os campos a restaurar vêm da foto
 * guardada no próprio evento — confiar no que o cliente manda deixaria o
 * Desfazer virar "mover para qualquer lugar sem validar nada".
 */
export async function POST(
  _request: NextRequest,
  contexto: { params: Promise<{ id: string }> },
) {
  const sessao = await exigirPerfil();
  if (!sessao.ok) return sessao.resposta;

  const { id } = await contexto.params;

  const resultado = await desfazerFase(id, sessao.perfil);
  if (!resultado.ok) {
    const { status, codigo, mensagem, campo } = resultado.falha;
    return erroJson(status, codigo, mensagem, campo);
  }
  return Response.json(resultado.dados, { status: 200 });
}
