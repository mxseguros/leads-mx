import { z } from "zod";
import { dddExiste, pareceDigitado } from "./ddd";
import { capitalizarNome } from "../formato";

/**
 * O ÚNICO schema de validação da captura pública (item F1-3).
 *
 * Roda no navegador por conveniência e no servidor por autoridade (§5.7).
 * Duas cópias da mesma regra divergem em menos de um mês — por isso este
 * arquivo não importa nada de `next/server` nem toca em `window`: precisa
 * carregar nos dois lados.
 *
 * As mensagens são as do §5.7, em português direto e sem culpar quem preencheu.
 */

const NOME_PERMITIDO = /^[\p{L}\s'-]+$/u;

const nome = (rotulo: string) =>
  z
    .string({ required_error: "Campo obrigatório." })
    .trim()
    .min(1, "Campo obrigatório.")
    .max(60, "No máximo 60 caracteres.")
    .refine((v) => v.replace(/[^\p{L}]/gu, "").length >= 2, {
      message: "Use pelo menos 2 letras.",
    })
    .refine((v) => NOME_PERMITIDO.test(v), {
      message: `${rotulo} deve conter apenas letras.`,
    })
    .transform(capitalizarNome);

export const telefoneEsquema = z
  .string({ required_error: "Informe o WhatsApp com DDD." })
  .transform((v) => v.replace(/\D/g, ""))
  // Cola com +55 na frente é comum: aceitar em vez de reclamar.
  .transform((v) => (v.length === 13 && v.startsWith("55") ? v.slice(2) : v))
  .superRefine((v, ctx) => {
    if (v.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Informe o WhatsApp com DDD." });
      return;
    }
    if (v.length < 11) {
      const faltam = 11 - v.length;
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          faltam === 1
            ? "Falta 1 dígito — use DDD + 9 números."
            : `Faltam ${faltam} dígitos — use DDD + 9 números.`,
      });
      return;
    }
    if (v.length > 11) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Número com dígitos demais." });
      return;
    }
    if (!dddExiste(v.slice(0, 2))) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "DDD inválido." });
      return;
    }
    if (v[2] !== "9") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Celular precisa começar com 9 depois do DDD.",
      });
      return;
    }
    if (pareceDigitado(v)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Confira o número informado." });
    }
  });

export const emailEsquema = z
  .string({ required_error: "Informe um e-mail." })
  .trim()
  .toLowerCase()
  .min(1, "Informe um e-mail.")
  .max(120, "No máximo 120 caracteres.")
  .email("E-mail incompleto — ex.: nome@empresa.com.br");

/**
 * Corpo aceito por POST /api/v1/leads/publico.
 *
 * `hp` é o honeypot: campo escondido que pessoa nenhuma preenche. Vem no
 * schema, e não numa checagem à parte, para que o servidor recuse a requisição
 * no mesmo lugar em que recusa qualquer outra coisa malformada.
 */
export const capturaEsquema = z.object({
  nome: nome("Nome"),
  sobrenome: nome("Sobrenome"),
  telefone: telefoneEsquema,
  email: emailEsquema,

  produto: z.string().trim().max(40).optional().nullable(),

  consentimento: z.literal(true, {
    errorMap: () => ({ message: "É preciso concordar para enviarmos sua cotação." }),
  }),

  origem: z.string().trim().max(40).default("landing"),
  origemDetalhe: z.string().trim().max(120).optional().nullable(),

  utm: z.record(z.string().max(200)).optional().nullable(),

  turnstile: z.string().optional().nullable(),
  hp: z.string().max(0, "Requisição inválida.").optional().nullable(),
});

export type Captura = z.infer<typeof capturaEsquema>;

/** O que o formulário manda antes de validar — tudo texto, tudo opcional. */
export type CapturaBruta = {
  nome?: string;
  sobrenome?: string;
  telefone?: string;
  email?: string;
  produto?: string | null;
  consentimento?: boolean;
  origem?: string;
  origemDetalhe?: string | null;
  utm?: Record<string, string> | null;
  turnstile?: string | null;
  hp?: string | null;
};

/**
 * Erros por campo, prontos para exibir. O primeiro campo inválido recebe foco
 * no envio (§5.7), então a ordem das chaves importa para quem consome.
 */
export type ErrosPorCampo = Partial<Record<keyof Captura, string>>;

export function validarCaptura(
  bruto: unknown,
): { ok: true; dados: Captura } | { ok: false; erros: ErrosPorCampo } {
  const r = capturaEsquema.safeParse(bruto);
  if (r.success) return { ok: true, dados: r.data };

  const erros: ErrosPorCampo = {};
  for (const problema of r.error.issues) {
    const campo = problema.path[0] as keyof Captura | undefined;
    // Só a primeira mensagem de cada campo: a pessoa corrige uma coisa por vez.
    if (campo && !erros[campo]) erros[campo] = problema.message;
  }
  return { ok: false, erros };
}
