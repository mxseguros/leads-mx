import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

/**
 * Utilidades dos testes E2E.
 *
 * Falam com o banco pela chave secreta para preparar e limpar cenário — o que
 * a interface faz é o que está sendo testado, então montar fixture por ela
 * seria testar o teste.
 */

function carregarEnv() {
  for (const caminho of [".env.local", "../../.env"]) {
    try {
      const conteudo = readFileSync(resolve(process.cwd(), caminho), "utf8");
      for (const linha of conteudo.split("\n")) {
        const t = linha.trim();
        if (!t || t.startsWith("#")) continue;
        const i = t.indexOf("=");
        if (i > 0 && process.env[t.slice(0, i).trim()] === undefined) {
          process.env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
        }
      }
    } catch {
      // Arquivo ausente: as variáveis podem vir do ambiente.
    }
  }
}
carregarEnv();

export const DOMINIO_E2E = "e2e.test";

export function bancoAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.SUPABASE_SECRET_KEY;
  if (!url || !chave) {
    throw new Error(
      "E2E precisa de NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SECRET_KEY. " +
        "Copie .env.example e preencha com o projeto de DESENVOLVIMENTO.",
    );
  }
  return createClient(url, chave, { auth: { persistSession: false } });
}

/** E-mail único por execução, para dois testes nunca colidirem no dedupe. */
export function emailUnico(prefixo: string): string {
  return `${prefixo}.${Date.now()}.${Math.floor(Math.random() * 1000)}@${DOMINIO_E2E}`;
}

/** Telefone válido e único: DDD 11, terceiro dígito 9, sem repetição. */
export function telefoneUnico(): string {
  const meio = String(Math.floor(Math.random() * 9000) + 1000);
  const fim = String(Math.floor(Math.random() * 9000) + 1000);
  return `11 9${meio}-${fim}`;
}

export async function limparLeadsDoTeste() {
  const db = bancoAdmin();
  await db.from("leads").delete().like("email", `%@${DOMINIO_E2E}`);
}

export async function lerLeadPorEmail(email: string) {
  const db = bancoAdmin();
  const { data } = await db
    .from("leads")
    .select("id, first_name, last_name, stage, won_value, insurer, lost_reason_id, resume_at, next_action_label, next_action_at")
    .eq("email", email.toLowerCase())
    .maybeSingle();
  return data;
}

export async function contarEventos(leadId: string, tipo: string) {
  const db = bancoAdmin();
  const { count } = await db
    .from("lead_events")
    .select("*", { count: "exact", head: true })
    .eq("lead_id", leadId)
    .eq("type", tipo);
  return count ?? 0;
}
