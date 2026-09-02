"use server";

import { z } from "zod";
import { clienteServidor } from "@/lib/supabase/servidor";
import { urlBase } from "@/lib/ambiente";

/**
 * Entrada da equipe (item F0-11).
 *
 * Dois caminhos, e a existência dos dois é deliberada:
 *
 * SENHA       não depende de nada externo. É o caminho do dia a dia, e o
 *             único que funciona enquanto o SMTP do Supabase estiver no
 *             limite de envios.
 *
 * MAGIC LINK  não exige lembrar de senha, e é o caminho de recuperação de
 *             quem esqueceu a dela. Depende de e-mail sair.
 *
 * O mesmo schema zod valida aqui e no cliente: o cliente é conveniência, o
 * servidor é a autoridade (§5.7).
 */

const email = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Informe seu e-mail.")
  .email("E-mail incompleto — ex.: nome@mxseguros.com.br");

const esquemaSenha = z.object({
  email,
  senha: z.string().min(1, "Informe sua senha."),
});

const esquemaLink = z.object({ email });

export type ResultadoEntrada =
  | { ok: true; modo: "link"; email: string }
  | { ok: false; erro: string; campo?: "email" | "senha" };

/** Mensagem única para credencial errada: dizer qual metade falhou entrega
 *  quem trabalha na MX a quem estiver testando endereços. */
const CREDENCIAL_INVALIDA = "E-mail ou senha incorretos.";

export async function entrarComSenha(
  _anterior: ResultadoEntrada | null,
  dados: FormData,
): Promise<ResultadoEntrada> {
  const analise = esquemaSenha.safeParse({
    email: dados.get("email"),
    senha: dados.get("senha"),
  });

  if (!analise.success) {
    const problema = analise.error.issues[0];
    return {
      ok: false,
      erro: problema?.message ?? "Confira os dados informados.",
      campo: problema?.path[0] as "email" | "senha" | undefined,
    };
  }

  try {
    const supabase = await clienteServidor();
    // Fronteira de idioma (decisão D6): o app fala português, o SDK do
    // Supabase espera `password`.
    const { error } = await supabase.auth.signInWithPassword({
      email: analise.data.email,
      password: analise.data.senha,
    });

    if (error) {
      // "Email not confirmed" e "Invalid login credentials" viram a mesma
      // resposta de propósito.
      return { ok: false, erro: CREDENCIAL_INVALIDA, campo: "senha" };
    }
  } catch {
    return { ok: false, erro: "Não foi possível entrar agora. Tente de novo." };
  }

  // Sem redirect() aqui: o middleware manda para /esteira assim que a sessão
  // existe, e quem chamou recarrega. Redirecionar de dentro da action tornaria
  // o teste do fluxo mais difícil sem ganhar nada.
  return { ok: true, modo: "link", email: analise.data.email };
}

export async function enviarMagicLink(
  _anterior: ResultadoEntrada | null,
  dados: FormData,
): Promise<ResultadoEntrada> {
  const analise = esquemaLink.safeParse({ email: dados.get("email") });

  if (!analise.success) {
    return {
      ok: false,
      erro: analise.error.issues[0]?.message ?? "Verifique o e-mail informado.",
      campo: "email",
    };
  }

  const destino = String(dados.get("destino") ?? "/esteira");

  try {
    const supabase = await clienteServidor();
    const { error } = await supabase.auth.signInWithOtp({
      email: analise.data.email,
      options: {
        // Quem não foi cadastrado pelo gestor não cria conta sozinho.
        shouldCreateUser: false,
        emailRedirectTo: `${urlBase()}/auth/confirmar?destino=${encodeURIComponent(destino)}`,
      },
    });

    if (error) {
      // O limite do SMTP embutido do Supabase é baixo e estourar é comum.
      // Dizer isso ajuda mais do que uma mensagem genérica.
      const limite = /rate|limit|too many/i.test(error.message);
      return {
        ok: false,
        erro: limite
          ? "Limite de e-mails atingido. Use a senha para entrar, ou tente daqui a pouco."
          : "Não foi possível enviar o link agora. Tente de novo em alguns minutos.",
      };
    }

    return { ok: true, modo: "link", email: analise.data.email };
  } catch {
    return { ok: false, erro: "Não foi possível enviar o link agora." };
  }
}
