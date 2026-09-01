import { type NextRequest } from "next/server";
import { erroJson, exigirPerfil, lerCorpo } from "@/lib/api";
import { moverFase } from "@/lib/leads/servico";

/**
 * POST /api/v1/leads/:id/fase — move o lead de fase (§8).
 *
 * Corpo: { para, proximaAcao?, proximaAcaoEm?, valorEstimado?, premioAnual?,
 *          seguradora?, motivoPerdaId?, retomarEm? }
 *
 * Esta rota é o portão da Fase 2: as regras do §6 são validadas AQUI, e não
 * apenas nos modais. Quem chamar direto com curl recebe a mesma recusa.
 */
export async function POST(
  request: NextRequest,
  contexto: { params: Promise<{ id: string }> },
) {
  const sessao = await exigirPerfil();
  if (!sessao.ok) return sessao.resposta;

  const { id } = await contexto.params;
  const corpo = (await lerCorpo(request)) as Record<string, unknown> | null;
  if (!corpo) return erroJson(400, "corpo_invalido", "Não conseguimos ler os dados enviados.");

  const para = String(corpo.para ?? "");

  const resultado = await moverFase(
    id,
    para,
    {
      proximaAcao: corpo.proximaAcao as string | null,
      proximaAcaoEm: corpo.proximaAcaoEm as string | null,
      valorEstimado: numero(corpo.valorEstimado),
      premioAnual: numero(corpo.premioAnual),
      seguradora: corpo.seguradora as string | null,
      motivoPerdaId: numero(corpo.motivoPerdaId),
      retomarEm: corpo.retomarEm as string | null,
    },
    sessao.perfil,
  );

  if (!resultado.ok) {
    const { status, codigo, mensagem, campo } = resultado.falha;
    return erroJson(status, codigo, mensagem, campo);
  }

  return Response.json(resultado.dados, { status: 200 });
}

/** Formulário manda string; o domínio espera número ou null. */
function numero(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}
