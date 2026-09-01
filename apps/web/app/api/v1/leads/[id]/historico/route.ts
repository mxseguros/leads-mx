import { type NextRequest } from "next/server";
import { exigirPerfil } from "@/lib/api";
import { lerHistorico } from "@/lib/leads/consulta";

/**
 * GET /api/v1/leads/:id/historico — timeline da ficha (§5.4).
 *
 * Separado do lead em si porque a gaveta abre com o cartão que o board já tem
 * em mãos e busca o histórico depois: assim ela aparece na hora, e a timeline
 * preenche em seguida, em vez de a gaveta inteira esperar pela consulta.
 */
export async function GET(
  _request: NextRequest,
  contexto: { params: Promise<{ id: string }> },
) {
  const sessao = await exigirPerfil();
  if (!sessao.ok) return sessao.resposta;

  const { id } = await contexto.params;
  return Response.json({ eventos: await lerHistorico(id) }, { status: 200 });
}
