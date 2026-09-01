import "server-only";

import { clienteAdministrador } from "./supabase/administrador";

/**
 * Configurações que a MX edita sem deploy (§5.6): número de WhatsApp, template
 * da mensagem, texto de consentimento e sua versão.
 *
 * Cache curto em memória: a landing lê isto em toda visita, e ir ao banco a
 * cada requisição por um texto que muda uma vez por trimestre é desperdício.
 * 60s é curto o bastante para uma correção aparecer sozinha.
 */

export type Configuracoes = {
  numeroWhatsapp: string;
  templateWhatsapp: string;
  textoConsentimento: string;
  versaoConsentimento: string;
  urlPolitica: string;
};

const PADRAO: Configuracoes = {
  numeroWhatsapp: "",
  templateWhatsapp:
    "Olá {nome}, recebi seu pedido de cotação e queria entender melhor sua operação.",
  textoConsentimento:
    "Autorizo a MX Corretora de Seguros a entrar em contato comigo pelos dados informados.",
  versaoConsentimento: "sem-versao",
  urlPolitica: "#",
};

let cache: { valor: Configuracoes; expiraEm: number } | null = null;

export async function lerConfiguracoes(): Promise<Configuracoes> {
  if (cache && cache.expiraEm > Date.now()) return cache.valor;

  try {
    const supabase = clienteAdministrador();
    const { data, error } = await supabase.from("settings").select("key, value");
    if (error) throw error;

    const mapa = new Map<string, unknown>(
      (data ?? []).map((l) => [String(l.key), l.value]),
    );
    const texto = (chave: string, padrao: string) => {
      const v = mapa.get(chave);
      return typeof v === "string" && v.trim() ? v : padrao;
    };

    const valor: Configuracoes = {
      numeroWhatsapp: texto("whatsapp_number", PADRAO.numeroWhatsapp),
      templateWhatsapp: texto("wa_template", PADRAO.templateWhatsapp),
      textoConsentimento: texto("consent_text", PADRAO.textoConsentimento),
      versaoConsentimento: texto("consent_version", PADRAO.versaoConsentimento),
      urlPolitica: texto("privacy_policy_url", PADRAO.urlPolitica),
    };

    cache = { valor, expiraEm: Date.now() + 60_000 };
    return valor;
  } catch (erro) {
    // Banco indisponível não pode derrubar a landing: sem cotação a MX perde
    // um lead, com a página fora do ar perde todos.
    console.error("[configuracoes] falha ao ler, usando padrão:", erro);
    return PADRAO;
  }
}

/**
 * Monta o link do WhatsApp com a mensagem já preenchida (§5.4).
 * Sem número configurado devolve null — e quem chama esconde o botão, em vez
 * de oferecer um link quebrado.
 */
export function linkWhatsapp(
  config: Configuracoes,
  variaveis: { nome?: string; produto?: string | null },
): string | null {
  const numero = config.numeroWhatsapp.replace(/\D/g, "");
  if (!numero) return null;

  const texto = config.templateWhatsapp
    .replace(/\{nome\}/g, variaveis.nome ?? "")
    .replace(/\{produto\}/g, variaveis.produto ?? "seguro empresarial")
    .replace(/\s{2,}/g, " ")
    .trim();

  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
}
