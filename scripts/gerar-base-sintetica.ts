/**
 * Base sintetica de desenvolvimento (item F0-13).
 *
 * Desenvolvimento NAO roda com dado real de cliente. Esta base cobre os casos
 * que quebram o board: as sete fases, follow-up atrasado, follow-up de hoje,
 * lead sem responsavel, valor alto em negociacao e um duplicado — que e
 * exatamente o que a Fase 1 precisa detectar.
 *
 * Uso:
 *   corepack pnpm base:sintetica            # insere
 *   corepack pnpm base:sintetica --limpar   # apaga so o que este script criou
 *
 * Recusa rodar contra producao: o e-mail de todo lead gerado termina em
 * @exemplo.test, e o --limpar apaga por esse sufixo.
 */

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

/**
 * Carrega o .env da raiz, se existir. O script roda fora do Next, que faria
 * isso sozinho — sem esta funcao a mensagem de erro mandaria preencher um
 * arquivo que ninguem leria.
 */
function carregarEnv(caminho = ".env") {
  let conteudo: string;
  try {
    conteudo = readFileSync(caminho, "utf8");
  } catch {
    return; // Sem .env: quem chamou pode ter exportado no shell.
  }

  for (const linha of conteudo.split("\n")) {
    const limpa = linha.trim();
    if (!limpa || limpa.startsWith("#")) continue;

    const igual = limpa.indexOf("=");
    if (igual === -1) continue;

    const chave = limpa.slice(0, igual).trim();
    // Variavel ja exportada no shell vence o arquivo.
    if (process.env[chave] !== undefined) continue;

    process.env[chave] = limpa
      .slice(igual + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
  }
}

carregarEnv();

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const CHAVE = process.env.SUPABASE_SECRET_KEY;

const DOMINIO = "exemplo.test";

if (!URL || !CHAVE) {
  console.error(
    "Faltam NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SECRET_KEY.\n" +
      "Copie .env.example para .env e preencha com o projeto de DESENVOLVIMENTO.",
  );
  process.exit(1);
}

const supabase = createClient(URL, CHAVE, {
  auth: { persistSession: false },
});

function dia(deslocamento: number): string {
  const d = new Date();
  d.setDate(d.getDate() + deslocamento);
  return d.toISOString().slice(0, 10);
}

type Semente = {
  nome: string;
  sobrenome: string;
  telefone: string;
  empresa: string;
  produto: string;
  origem: string;
  fase: string;
  proximaAcao?: string;
  proximaAcaoEm?: string;
  valorEstimado?: number;
  premioAnual?: number;
  seguradora?: string;
  motivoPerda?: string;
  retomarEm?: string;
  semResponsavel?: boolean;
};

const SEMENTES: Semente[] = [
  // Clientes potenciais — inclui os dois casos que o board tem que gritar
  { nome: "Beatriz", sobrenome: "Camargo", telefone: "11987650001", empresa: "Camargo Logística", produto: "Frota", origem: "landing", fase: "potenciais", proximaAcao: "1º contato", proximaAcaoEm: dia(1), semResponsavel: true },
  { nome: "Rogério", sobrenome: "Alves", telefone: "21987650002", empresa: "Transportes Alves", produto: "Transporte", origem: "widget-flutuante", fase: "potenciais", proximaAcao: "1º contato", proximaAcaoEm: dia(-2), semResponsavel: true },
  { nome: "Helena", sobrenome: "Prado", telefone: "31987650003", empresa: "Prado Indústria", produto: "Vida em Grupo", origem: "indicacao", fase: "potenciais", proximaAcao: "1º contato", proximaAcaoEm: dia(0) },

  // Reunião
  { nome: "Marcelo", sobrenome: "Tavares", telefone: "11987650004", empresa: "Tavares Alimentos", produto: "Saúde", origem: "landing", fase: "reuniao", proximaAcao: "Reunião online", proximaAcaoEm: dia(2) },
  { nome: "Silvia", sobrenome: "Nakamura", telefone: "41987650005", empresa: "Nakamura Metais", produto: "Frota", origem: "instagram", fase: "reuniao", proximaAcao: "Confirmar presença", proximaAcaoEm: dia(-1) },

  // Acompanhamento
  { nome: "Diego", sobrenome: "Moraes", telefone: "51987650006", empresa: "Moraes Distribuidora", produto: "Transporte", origem: "widget-inline", fase: "acompanhamento", proximaAcao: "Enviar cotação", proximaAcaoEm: dia(0) },
  { nome: "Patrícia", sobrenome: "Lemos", telefone: "11987650007", empresa: "Lemos Contabilidade", produto: "Auto", origem: "landing", fase: "acompanhamento", proximaAcao: "Cobrar retorno", proximaAcaoEm: dia(-5) },
  { nome: "Anderson", sobrenome: "Ribeiro", telefone: "62987650008", empresa: "Ribeiro Agro", produto: "Consórcio", origem: "manual", fase: "acompanhamento" },

  // Negociação — a coluna que soma valor no rodapé
  { nome: "Cláudia", sobrenome: "Fontes", telefone: "11987650009", empresa: "Fontes Frigorífico", produto: "Frota", origem: "landing", fase: "negociacao", proximaAcao: "Ajustar franquia", proximaAcaoEm: dia(3), valorEstimado: 148000 },
  { nome: "Eduardo", sobrenome: "Bianchi", telefone: "47987650010", empresa: "Bianchi Têxtil", produto: "Saúde", origem: "indicacao", fase: "negociacao", proximaAcao: "Aprovar proposta", proximaAcaoEm: dia(-3), valorEstimado: 92500 },

  // Ganhou — premio anual e seguradora, sem apagar a estimativa
  { nome: "Fernanda", sobrenome: "Queiroz", telefone: "11987650011", empresa: "Queiroz Engenharia", produto: "Vida em Grupo", origem: "landing", fase: "ganhou", valorEstimado: 60000, premioAnual: 64800, seguradora: "Porto Seguro" },
  { nome: "Ricardo", sobrenome: "Amaral", telefone: "19987650012", empresa: "Amaral Transportes", produto: "Transporte", origem: "widget-inline", fase: "ganhou", valorEstimado: 210000, premioAnual: 198000, seguradora: "Tokio Marine" },

  // Perdido — motivo obrigatorio
  { nome: "Juliana", sobrenome: "Peixoto", telefone: "11987650013", empresa: "Peixoto Comércio", produto: "Auto", origem: "landing", fase: "perdido", motivoPerda: "Preço acima do orçamento" },
  { nome: "Gustavo", sobrenome: "Ferraz", telefone: "85987650014", empresa: "Ferraz Serviços", produto: "Frota", origem: "instagram", fase: "perdido", motivoPerda: "Fechou com a corretora atual" },

  // Contato posterior — data de retomada
  { nome: "Letícia", sobrenome: "Barros", telefone: "11987650015", empresa: "Barros Educação", produto: "Saúde", origem: "landing", fase: "posterior", retomarEm: dia(21) },
  { nome: "Otávio", sobrenome: "Mendes", telefone: "27987650016", empresa: "Mendes Náutica", produto: "Consórcio", origem: "manual", fase: "posterior", retomarEm: dia(-1) },
];

async function referencia(tabela: string, coluna: string) {
  const { data, error } = await supabase.from(tabela).select(`id, ${coluna}`);
  if (error) throw new Error(`Não consegui ler ${tabela}: ${error.message}`);
  const mapa = new Map<string, number>();
  for (const linha of (data ?? []) as Array<Record<string, unknown>>) {
    mapa.set(String(linha[coluna]), Number(linha.id));
  }
  return mapa;
}

async function limpar() {
  const { error } = await supabase
    .from("leads")
    .delete()
    .like("email", `%@${DOMINIO}`);

  if (error) throw new Error(`Falha ao limpar: ${error.message}`);
  console.log(`Base sintética removida (todos os e-mails @${DOMINIO}).`);
}

async function inserir() {
  const [produtos, origens, motivos, equipe] = await Promise.all([
    referencia("products", "label"),
    referencia("lead_sources", "slug"),
    referencia("lost_reasons", "label"),
    supabase.from("profiles").select("id").eq("active", true),
  ]);

  const donos = (equipe.data ?? []).map((p) => String(p.id));
  if (donos.length === 0) {
    console.warn(
      "Nenhum perfil ativo ainda — todos os leads vão nascer sem responsável.\n" +
        "Entre uma vez pelo magic link e rode de novo para ver os avatares.",
    );
  }

  const linhas = SEMENTES.map((s, i) => ({
    first_name: s.nome,
    last_name: s.sobrenome,
    phone: s.telefone,
    email: `${s.nome}.${s.sobrenome}`
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/[^a-z.]/g, "") + `@${DOMINIO}`,
    company: s.empresa,
    product_id: produtos.get(s.produto) ?? null,
    source_id: origens.get(s.origem) ?? origens.get("manual") ?? 1,
    stage: s.fase,
    owner_id:
      s.semResponsavel || donos.length === 0
        ? null
        : donos[i % donos.length],
    next_action_label: s.proximaAcao ?? null,
    next_action_at: s.proximaAcaoEm ?? null,
    estimated_value: s.valorEstimado ?? null,
    won_value: s.premioAnual ?? null,
    insurer: s.seguradora ?? null,
    lost_reason_id: s.motivoPerda ? (motivos.get(s.motivoPerda) ?? null) : null,
    resume_at: s.retomarEm ?? null,
    won_at: s.fase === "ganhou" ? new Date().toISOString() : null,
    lost_at: s.fase === "perdido" ? new Date().toISOString() : null,
    consent_at: new Date().toISOString(),
    consent_text_version: "sintetica",
  }));

  const { data, error } = await supabase.from("leads").insert(linhas).select("id");
  if (error) throw new Error(`Falha ao inserir: ${error.message}`);

  const criados = data ?? [];
  const eventos = criados.map((lead) => ({
    lead_id: lead.id,
    type: "created" as const,
    actor_id: null,
    payload: { origem: "base sintética" },
  }));
  await supabase.from("lead_events").insert(eventos);

  // Duplicado de proposito: mesmo telefone da Beatriz, dentro da janela de 30
  // dias. A Fase 1 tem que reconhecer isto e NAO criar um segundo cartao.
  const beatriz = SEMENTES[0]!;
  await supabase.from("lead_events").insert({
    lead_id: criados[0]?.id,
    type: "duplicate_submission",
    actor_id: null,
    payload: { telefone: beatriz.telefone, canal: "landing" },
  });

  console.log(`Base sintética criada: ${criados.length} leads nas 7 fases.`);
  console.log("  atrasados: 4 · para hoje: 2 · sem responsável: 2 · 1 duplicata registrada");
}

async function principal() {
  if (process.argv.includes("--limpar")) {
    await limpar();
    return;
  }
  await inserir();
}

principal().catch((erro: unknown) => {
  console.error(erro instanceof Error ? erro.message : erro);
  process.exit(1);
});
