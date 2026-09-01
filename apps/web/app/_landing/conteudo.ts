/**
 * Conteúdo da landing, parametrizado por produto (decisão D4).
 *
 * Na Fase 1 só a entrada `geral` é publicada, em `/`. As variantes por produto
 * do §5.1 (`/frota`, `/transporte`…) entram acrescentando itens a este mapa e
 * criando `app/[produto]/page.tsx` — a página lê daqui e não muda uma linha.
 *
 * Por isso a copy vive em dados, e não espalhada em JSX: quando as seis
 * landings entrarem, o trabalho é de texto, não de código.
 */

export type ConteudoLanding = {
  /** Segmento da URL. `null` é a landing principal, em `/`. */
  slug: string | null;
  /** Vai para `origem` do lead — é como a MX sabe qual página converteu. */
  origem: string;
  /** Pré-seleciona o produto no formulário. */
  produto: string | null;

  eyebrow: string;
  titulo: string;
  tituloDestaque: string;
  subtitulo: string;

  tituloSeo: string;
  descricaoSeo: string;
};

export const PROVAS = [
  { numero: "24", rotulo: "anos de corretora" },
  { numero: "+15", rotulo: "seguradoras parceiras" },
  { numero: "1 dia útil", rotulo: "para o primeiro contato" },
] as const;

export const PRODUTOS = [
  { nome: "Auto", descricao: "Veículos da empresa e dos sócios, com assistência 24h." },
  { nome: "Frota", descricao: "A partir de 4 veículos, com apólice única e gestão de sinistros." },
  { nome: "Transporte", descricao: "Carga própria ou de terceiros, nacional e internacional." },
  { nome: "Consórcio", descricao: "Renovação de frota sem juros, com carta de crédito." },
  { nome: "Saúde", descricao: "Planos empresariais a partir de 2 vidas." },
  { nome: "Vida em Grupo", descricao: "Benefício que segura talento e cumpre convenção coletiva." },
] as const;

export const DIFERENCIAIS = [
  {
    titulo: "Cotação em várias seguradoras",
    texto:
      "Uma conversa, várias propostas comparadas lado a lado. Você não precisa ligar para cada uma.",
  },
  {
    titulo: "Um consultor, do começo ao fim",
    texto:
      "A mesma pessoa que cota é quem acompanha a renovação e o sinistro. Sem central de atendimento.",
  },
  {
    titulo: "Sinistro acompanhado por nós",
    texto:
      "Quando acontece, a MX fala com a seguradora. Você cuida da operação, não do processo.",
  },
] as const;

const GERAL: ConteudoLanding = {
  slug: null,
  origem: "landing",
  produto: null,
  eyebrow: "Seguros para empresas · desde 2002",
  titulo: "Proteção para a sua empresa, com",
  tituloDestaque: "gente de verdade do outro lado",
  subtitulo:
    "Auto, Frota, Transporte, Consórcio, Saúde e Vida em Grupo. Você preenche quatro campos e " +
    "um consultor entra em contato pelo WhatsApp em até 1 dia útil.",
  tituloSeo: "Seguro para empresas · MX Corretora de Seguros",
  descricaoSeo:
    "Cotação de seguro empresarial: frota, transporte, saúde e vida em grupo. " +
    "Um consultor da MX responde pelo WhatsApp em até 1 dia útil.",
};

/**
 * Fase 1 publica só a geral. As entradas por produto entram aqui — o formato
 * já está pronto, falta a copy de cada uma (§5.1).
 */
export const LANDINGS: Record<string, ConteudoLanding> = {
  geral: GERAL,
};

export function landing(chave = "geral"): ConteudoLanding {
  return LANDINGS[chave] ?? GERAL;
}
