import { type NextRequest } from "next/server";
import { erroJson, exigirGestor, lerCorpo } from "@/lib/api";
import { clienteAdministrador } from "@/lib/supabase/administrador";

/**
 * POST /api/v1/lgpd — exclusão a pedido do titular (§9, F4-4).
 *
 * Só gestor. Diferente da retenção automática, que ANONIMIZA para preservar o
 * motivo da perda: aqui a pessoa pediu para sumir, então some mesmo, com os
 * eventos junto por cascade.
 *
 * Passa pela chave secreta porque a RLS não permite delete de lead já
 * excluído por soft delete, e o pedido do titular alcança esses também.
 */
export async function POST(request: NextRequest) {
  const sessao = await exigirGestor();
  if (!sessao.ok) return sessao.resposta;

  const corpo = (await lerCorpo(request)) as { contato?: string } | null;
  const contato = corpo?.contato?.trim();

  if (!contato) {
    return erroJson(422, "contato_ausente", "Informe o e-mail ou o telefone do titular.", "contato");
  }

  const { data, error } = await clienteAdministrador().rpc("excluir_titular", { contato });

  if (error) {
    return erroJson(500, "falha_exclusao", "Não conseguimos concluir a exclusão agora.");
  }

  const apagados = Number(data ?? 0);
  console.warn(`[lgpd] ${sessao.perfil.nome} excluiu ${apagados} lead(s) a pedido do titular`);

  return Response.json(
    {
      apagados,
      mensagem:
        apagados === 0
          ? "Nenhum lead encontrado com esse contato."
          : `${apagados} lead(s) removido(s) por completo, com histórico.`,
    },
    { status: 200 },
  );
}
