import { type NextRequest } from "next/server";
import { erroJson, exigirGestor, lerCorpo } from "@/lib/api";
import { atualizarPessoa } from "@/lib/configuracoes-admin";
import { clienteAdministrador } from "@/lib/supabase/administrador";
import { urlBase } from "@/lib/ambiente";

/**
 * POST /api/v1/configuracoes/equipe — convida alguém para a equipe (§5.6).
 *
 * NÃO manda e-mail: o SMTP embutido do Supabase é limitado e o e-mail
 * transacional saiu do escopo. A rota cria o usuário e devolve um link de
 * acesso para o gestor repassar pelo canal que quiser.
 *
 * Menos automático, e mais honesto que um convite que falha em silêncio
 * porque a caixa de saída estourou o limite.
 */
export async function POST(request: NextRequest) {
  const sessao = await exigirGestor();
  if (!sessao.ok) return sessao.resposta;

  const corpo = (await lerCorpo(request)) as
    | { email?: string; nome?: string; papel?: string }
    | null;
  if (!corpo?.email || !corpo?.nome) {
    return erroJson(422, "dados_invalidos", "Informe nome e e-mail.", "email");
  }

  const papel = corpo.papel === "gestor" ? "gestor" : "consultor";
  const admin = clienteAdministrador();

  const { data: criado, error: erroCriacao } = await admin.auth.admin.createUser({
    email: corpo.email.trim().toLowerCase(),
    email_confirm: true,
    // Sem senha: o acesso é por magic link, e conta sem senha não tem
    // credencial para vazar.
    user_metadata: { full_name: corpo.nome.trim(), role: papel },
  });

  if (erroCriacao) {
    const jaExiste = /already|registered|exists/i.test(erroCriacao.message);
    return erroJson(
      jaExiste ? 409 : 500,
      jaExiste ? "email_em_uso" : "falha_convite",
      jaExiste ? "Esse e-mail já está cadastrado." : "Não conseguimos criar o acesso agora.",
      "email",
    );
  }

  const { data: link } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: corpo.email.trim().toLowerCase(),
  });

  const token = link?.properties?.hashed_token;
  return Response.json(
    {
      id: criado.user.id,
      link: token
        ? `${urlBase()}/auth/confirmar?token_hash=${token}&type=magiclink&destino=%2Festeira`
        : null,
    },
    { status: 201 },
  );
}

/** PATCH — muda papel ou desliga alguém. */
export async function PATCH(request: NextRequest) {
  const sessao = await exigirGestor();
  if (!sessao.ok) return sessao.resposta;

  const corpo = (await lerCorpo(request)) as
    | { id?: string; papel?: "gestor" | "consultor"; ativa?: boolean }
    | null;
  if (!corpo?.id) return erroJson(422, "dados_invalidos", "Informe quem alterar.", "id");

  const r = await atualizarPessoa(
    corpo.id,
    { papel: corpo.papel, ativa: corpo.ativa },
    sessao.perfil,
  );
  if (!r.ok) return erroJson(r.falha.status, r.falha.codigo, r.falha.mensagem, r.falha.campo);
  return Response.json(r.dados, { status: 200 });
}
