/**
 * Formatacao para a tela. O banco guarda cru (§5.7): telefone so com digitos,
 * e-mail em minusculas, nome com espacos aparados. A mascara vive aqui.
 */

/** `11999990000` -> `(11) 99999-0000`. Devolve o que recebeu se nao reconhecer. */
export function telefone(valor: string | null | undefined): string {
  const d = (valor ?? "").replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return valor ?? "";
}

/** Guarda somente digitos, no maximo 11. Aceita colar com +55, ponto ou espaco. */
export function telefoneCru(valor: string): string {
  let d = (valor ?? "").replace(/\D/g, "");
  if (d.length > 11 && d.startsWith("55")) d = d.slice(2);
  return d.slice(0, 11);
}

/** `1234.5` -> `R$ 1.235`. Sem centavos: premio anual nao se discute em centavo. */
export function moeda(valor: number | null | undefined): string {
  if (valor === null || valor === undefined) return "";
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

/** `2026-09-15` -> `15/09`. Data ISO, sem passar por Date: fuso nao muda o dia. */
export function dataCurta(iso: string | null | undefined): string {
  if (!iso) return "";
  const [, mes, dia] = iso.split("-");
  return mes && dia ? `${dia}/${mes}` : iso;
}

/** `2026-09-15` -> `15/09/2026`. */
export function dataLonga(iso: string | null | undefined): string {
  if (!iso) return "";
  const [ano, mes, dia] = iso.split("-");
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : iso;
}

/** Timestamp -> `15/09/26 14:32`. */
export function dataHora(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** `0` -> `hoje`, `1` -> `há 1 dia`, `5` -> `há 5 dias`. */
export function idade(dias: number): string {
  if (dias <= 0) return "hoje";
  if (dias === 1) return "há 1 dia";
  return `há ${dias} dias`;
}

/** Iniciais de quem nao tem perfil ainda; o banco calcula as dos que tem. */
export function iniciais(nome: string, sobrenome?: string): string {
  const a = (nome ?? "").trim()[0] ?? "";
  const b = (sobrenome ?? "").trim()[0] ?? "";
  return (a + b).toUpperCase() || "?";
}

/** `0.6666` -> `67%`. */
export function porcentagem(fracao: number | null | undefined): string {
  if (fracao === null || fracao === undefined) return "—";
  return `${Math.round(fracao * 100)}%`;
}

/**
 * Capitalizacao dos campos de nome (§5.7): "ana maria" -> "Ana Maria".
 * Preposicoes ficam minusculas — "Maria da Silva", nao "Maria Da Silva".
 *
 * A preposicao continua minuscula mesmo abrindo o texto, porque nome e
 * sobrenome sao campos SEPARADOS e sempre exibidos juntos: o sobrenome
 * "de oliveira" comeca a string, mas no cartao aparece como "Rodrigo de
 * Oliveira". Capitalizar por estar na posicao zero produzia "Rodrigo De
 * Oliveira", que esta errado em portugues — e esse nome vai para a saudacao
 * do WhatsApp.
 *
 * A excecao e a palavra sozinha: "de" isolado vira "De", porque ai nao ha
 * nome nenhum para ela acompanhar.
 */
const MINUSCULAS = new Set(["da", "de", "di", "do", "das", "dos", "e"]);

export function capitalizarNome(valor: string): string {
  const palavras = (valor ?? "")
    .replace(/\s+/g, " ")
    .trimStart()
    .toLocaleLowerCase("pt-BR")
    .split(" ");

  return palavras
    .map((palavra, i) => {
      if (!palavra) return palavra;
      const soPreposicao = palavras.filter(Boolean).length === 1;
      if (MINUSCULAS.has(palavra) && !soPreposicao) return palavra;
      return palavra[0]!.toLocaleUpperCase("pt-BR") + palavra.slice(1);
    })
    .join(" ");
}
