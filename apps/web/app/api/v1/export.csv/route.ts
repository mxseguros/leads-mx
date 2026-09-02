import { type NextRequest } from "next/server";
import { exigirPerfil } from "@/lib/api";
import { lerLeads } from "@/lib/leads/consulta";
import { aplicarFiltros, lerFiltrosDaUrl } from "@/lib/leads/filtros";
import { ordenarLista, ehColuna, type Direcao } from "@/lib/leads/ordenacao";
import { fase } from "@/lib/dominio/fases";
import { dataLonga, telefone } from "@/lib/formato";

/**
 * GET /api/v1/export.csv — exporta a lista (§5.5, §8, F3-3).
 *
 * RESPEITA OS FILTROS ATIVOS, e isso não é conveniência: exportar a base
 * inteira quando a pessoa pediu "os leads do Rafael" é como um vazamento
 * acontece sem ninguém perceber. O que está na tela é o que sai no arquivo.
 *
 * Passa pela sessão, então a RLS vale — perfil desligado não exporta nada.
 */
export async function GET(request: NextRequest) {
  const sessao = await exigirPerfil();
  if (!sessao.ok) return sessao.resposta;

  const { leads, erro } = await lerLeads();
  if (erro) {
    return new Response("Não foi possível gerar a exportação agora.", { status: 503 });
  }

  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  const filtrados = aplicarFiltros(leads, lerFiltrosDaUrl(params));

  const coluna = params.ord && ehColuna(params.ord) ? params.ord : "criado";
  const direcao: Direcao = params.dir === "asc" ? "asc" : "desc";
  const ordenados = ordenarLista(filtrados, coluna, direcao);

  const cabecalho = [
    "Nome", "Sobrenome", "WhatsApp", "E-mail", "Empresa", "Produto", "Fase",
    "Responsavel", "Proxima acao", "Data da proxima acao", "Valor estimado",
    "Premio anual", "Seguradora", "Motivo da perda", "Retomar em", "Origem", "Criado em",
  ];

  const linhas = ordenados.map((l) => [
    l.nome, l.sobrenome, telefone(l.telefone), l.email, l.empresa ?? "",
    l.produto ?? "", fase(l.fase).nome, l.responsavel?.nome ?? "",
    l.proximaAcao ?? "", l.proximaAcaoEm ? dataLonga(l.proximaAcaoEm) : "",
    l.valorEstimado ?? "", l.premioAnual ?? "", l.seguradora ?? "",
    l.motivoPerda ?? "", l.retomarEm ? dataLonga(l.retomarEm) : "",
    l.origem.rotulo, dataLonga(l.criadoEm.slice(0, 10)),
  ]);

  const csv = [cabecalho, ...linhas].map((linha) => linha.map(celula).join(";")).join("\r\n");

  const hoje = new Date().toISOString().slice(0, 10);
  return new Response(
    // BOM na frente: sem ele o Excel em português abre acento como "Ã§".
    "\uFEFF" + csv,
    {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="mx-leads-${hoje}.csv"`,
        // Exportação carrega dado pessoal: nada de cache em proxy nenhum.
        "Cache-Control": "no-store, private",
      },
    },
  );
}

/**
 * Ponto e vírgula como separador, que é o que o Excel em pt-BR espera.
 *
 * O prefixo em valores que começam com =, +, - ou @ evita injeção de fórmula:
 * um lead chamado "=HYPERLINK(...)" viraria fórmula executável ao abrir a
 * planilha, e o nome vem de um formulário público.
 */
function celula(valor: unknown): string {
  const texto = String(valor ?? "");
  const seguro = /^[=+\-@\t\r]/.test(texto) ? `'${texto}` : texto;
  return `"${seguro.replace(/"/g, '""')}"`;
}
