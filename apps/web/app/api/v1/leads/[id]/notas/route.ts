import { type NextRequest } from "next/server";
import { erroJson, exigirPerfil, lerCorpo } from "@/lib/api";
import { adicionarNota } from "@/lib/leads/servico";

/** POST /api/v1/leads/:id/notas — nota rápida do histórico (§5.4). */
export async function POST(
  request: NextRequest,
  contexto: { params: Promise<{ id: string }> },
) {
  const sessao = await exigirPerfil();
  if (!sessao.ok) return sessao.resposta;

  const { id } = await contexto.params;
  const corpo = (await lerCorpo(request)) as { texto?: string } | null;
  if (!corpo) return erroJson(400, "corpo_invalido", "Não conseguimos ler os dados enviados.");

  const resultado = await adicionarNota(id, corpo.texto ?? "", sessao.perfil);
  if (!resultado.ok) {
    const { status, codigo, mensagem, campo } = resultado.falha;
    return erroJson(status, codigo, mensagem, campo);
  }
  return Response.json(resultado.dados, { status: 201 });
}
