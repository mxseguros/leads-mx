"use client";

import { createBrowserClient } from "@supabase/ssr";
import { chaveAnonima, urlSupabase } from "../ambiente";

/** Cliente do navegador. Usa a chave anonima: tudo que ele ve passa pela RLS. */
export function clienteNavegador() {
  return createBrowserClient(urlSupabase(), chaveAnonima());
}
