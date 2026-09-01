/**
 * Máscaras aplicadas ENQUANTO a pessoa digita (§5.7).
 *
 * Regra que manda em tudo aqui: nunca atrapalhar quem está no meio da palavra.
 * Espaço em "ana " precisa sobreviver, senão a próxima letra cola na anterior.
 */

/** `119999` -> `(11) 9999`. Formata o que já foi digitado, sem completar nada. */
export function mascararTelefone(valor: string): string {
  let d = (valor ?? "").replace(/\D/g, "");
  if (d.length > 11 && d.startsWith("55")) d = d.slice(2);
  d = d.slice(0, 11);

  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/**
 * Nome enquanto digita: só letras, espaço, hífen e apóstrofo; sem espaço
 * duplo; máximo 60. A capitalização acontece no blur, não aqui — trocar a
 * letra embaixo do cursor faz a pessoa perder o lugar.
 */
export function mascararNome(valor: string): string {
  return (valor ?? "")
    .replace(/[^\p{L}\s'-]/gu, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^\s+/, "")
    .slice(0, 60);
}

/** E-mail: minúsculas, sem espaço, máximo 120. */
export function mascararEmail(valor: string): string {
  return (valor ?? "").replace(/\s/g, "").toLowerCase().slice(0, 120);
}
