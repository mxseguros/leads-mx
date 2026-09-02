import "server-only";

import { clienteAdministrador } from "../supabase/administrador";

/**
 * Registra o DESFECHO de cada envio da captura pública (F4-3).
 *
 * Sem isto, "pararam de chegar leads" não tem onde ser investigado: o que a
 * rota recusa só existe no console, e log de serverless some.
 *
 * Guarda o desfecho, nunca o dado. Nada de nome, telefone ou e-mail — uma
 * tabela de diagnóstico não pode virar uma segunda cópia da base de leads.
 *
 * Nunca lança e nunca é esperada: falhar ao registrar diagnóstico não pode
 * derrubar a captura que estava dando certo.
 */
export type Desfecho =
  | "criado"
  | "duplicado"
  | "invalido"
  | "honeypot"
  | "turnstile"
  | "limite"
  | "erro";

export function registrarTentativa(
  outcome: Desfecho,
  extra?: { campo?: string | null; origem?: string | null },
): void {
  void (async () => {
    try {
      await clienteAdministrador().from("capture_attempts").insert({
        outcome,
        campo: extra?.campo ?? null,
        origem: extra?.origem ?? null,
      });
    } catch {
      // Diagnóstico não pode atrapalhar o que está sendo diagnosticado.
    }
  })();
}
