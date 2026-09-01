import { type NextRequest } from "next/server";
import { erroJson, exigirPerfil, lerCorpo } from "@/lib/api";
import { criarManual } from "@/lib/leads/servico";

/**
 * POST /api/v1/leads — cadastro manual (§8, F2-10).
 *
 * Separada de /leads/publico: aqui existe sessão, a RLS vale e o autor fica
 * registrado no evento. A pública não tem sessão e usa a chave secreta.
 */
export async function POST(request: NextRequest) {
  const sessao = await exigirPerfil();
  if (!sessao.ok) return sessao.resposta;

  const corpo = await lerCorpo(request);
  if (!corpo) return erroJson(400, "corpo_invalido", "Não conseguimos ler os dados enviados.");

  const resultado = await criarManual(corpo, sessao.perfil);
  if (!resultado.ok) {
    const { status, codigo, mensagem, campo } = resultado.falha;
    return erroJson(status, codigo, mensagem, campo);
  }
  return Response.json(resultado.dados, { status: 201 });
}
