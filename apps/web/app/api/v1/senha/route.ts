import { type NextRequest } from "next/server";
import { erroJson, exigirGestor, exigirPerfil, lerCorpo } from "@/lib/api";
import { clienteServidor } from "@/lib/supabase/servidor";
import { clienteAdministrador } from "@/lib/supabase/administrador";

/**
 * PATCH /api/v1/senha — troca de senha.
 *
 * Sem `id`: a própria pessoa troca a sua. Passa pela SESSÃO, então o Supabase
 * exige a sessão válida e ninguém troca a senha de outro por engano.
 *
 * Com `id`: um gestor define a senha de alguém da equipe. É o caminho para
 * quem perdeu o acesso — e existe porque o e-mail de recuperação depende de um
 * SMTP que pode estar no limite.
 */
export async function PATCH(request: NextRequest) {
  const corpo = (await lerCorpo(request)) as { senha?: string; id?: string } | null;
  const senha = corpo?.senha?.trim();

  if (!senha || senha.length < 8) {
    return erroJson(422, "senha_curta", "A senha precisa ter pelo menos 8 caracteres.", "senha");
  }

  // Trocar a senha de outra pessoa é ação de gestor.
  if (corpo?.id) {
    const sessao = await exigirGestor();
    if (!sessao.ok) return sessao.resposta;

    const { error } = await clienteAdministrador().auth.admin.updateUserById(corpo.id, {
      password: senha,
    });
    if (error) {
      return erroJson(500, "falha_troca", "Não conseguimos definir a senha agora.");
    }
    console.warn(`[senha] ${sessao.perfil.nome} definiu a senha de ${corpo.id}`);
    return Response.json({ ok: true }, { status: 200 });
  }

  const sessao = await exigirPerfil();
  if (!sessao.ok) return sessao.resposta;

  const supabase = await clienteServidor();
  const { error } = await supabase.auth.updateUser({ password: senha });

  if (error) {
    // O Supabase recusa senha fraca ou igual à anterior; a mensagem dele é em
    // inglês e não serve para a tela.
    const fraca = /weak|password/i.test(error.message);
    return erroJson(
      422,
      "senha_recusada",
      fraca ? "Escolha uma senha mais forte." : "Não conseguimos trocar a senha agora.",
      "senha",
    );
  }
  return Response.json({ ok: true }, { status: 200 });
}
