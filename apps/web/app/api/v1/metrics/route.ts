import { erroJson, exigirPerfil } from "@/lib/api";
import { lerMetricas } from "@/lib/leads/consulta";

/**
 * GET /api/v1/metrics — faixa de métricas (§8).
 *
 * A esteira não consome esta rota: sendo Server Component, ela lê a view
 * direto e economiza uma ida ao servidor. A rota existe porque o contrato do
 * §8 a prevê, e porque um painel externo ou uma futura tela de relatórios
 * precisa de um lugar para perguntar.
 */
export async function GET() {
  const sessao = await exigirPerfil();
  if (!sessao.ok) return sessao.resposta;

  const metricas = await lerMetricas();
  if (!metricas) {
    return erroJson(503, "metricas_indisponiveis", "Não foi possível calcular as métricas agora.");
  }
  return Response.json(metricas, { status: 200 });
}
