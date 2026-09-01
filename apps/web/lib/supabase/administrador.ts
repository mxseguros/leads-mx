import "server-only";

import { createClient } from "@supabase/supabase-js";
import { chaveServico, urlSupabase } from "../ambiente";

/**
 * Cliente com service role: IGNORA a RLS.
 *
 * Usar so onde nao existe sessao e a autoridade e da propria API — a captura
 * publica da Fase 1 (POST /leads/public), depois de validacao e anti-spam.
 * Nunca em componente de cliente, nunca no bundle do widget.
 */
export function clienteAdministrador() {
  return createClient(urlSupabase(), chaveServico(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
