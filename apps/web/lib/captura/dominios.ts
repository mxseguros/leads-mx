/**
 * Sugestão de domínio digitado errado (§5.7).
 *
 * É AVISO, nunca erro: "gmail.con" pode ser engano, mas "meudominio.con" pode
 * ser um domínio real que a gente não conhece. Bloquear o envio por causa de
 * um palpite custa um lead; sugerir custa nada.
 */

const CONHECIDOS = [
  "gmail.com",
  "hotmail.com",
  "outlook.com",
  "yahoo.com.br",
  "icloud.com",
  "bol.com.br",
  "uol.com.br",
  "terra.com.br",
  "live.com",
] as const;

/** Distância de edição, com corte cedo: só interessa "quase igual". */
function distancia(a: string, b: string, maximo: number): number {
  if (Math.abs(a.length - b.length) > maximo) return maximo + 1;

  let anterior = Array.from({ length: b.length + 1 }, (_, i) => i);

  for (let i = 1; i <= a.length; i++) {
    const atual = [i];
    let menor = i;
    for (let j = 1; j <= b.length; j++) {
      const custo = a[i - 1] === b[j - 1] ? 0 : 1;
      const v = Math.min(
        atual[j - 1]! + 1,
        anterior[j]! + 1,
        anterior[j - 1]! + custo,
      );
      atual.push(v);
      if (v < menor) menor = v;
    }
    // Nenhuma célula da linha ficou dentro do limite: não vai melhorar.
    if (menor > maximo) return maximo + 1;
    anterior = atual;
  }
  return anterior[b.length]!;
}

/**
 * Devolve o domínio provável, ou null quando não há palpite seguro.
 * Só sugere para distância 1 ou 2 — acima disso o palpite erra mais do que ajuda.
 */
export function sugerirDominio(email: string): string | null {
  const arroba = (email ?? "").lastIndexOf("@");
  if (arroba < 0) return null;

  const dominio = email.slice(arroba + 1).toLowerCase().trim();
  if (!dominio || CONHECIDOS.includes(dominio as (typeof CONHECIDOS)[number])) return null;

  let melhor: string | null = null;
  let melhorD = 3;

  for (const candidato of CONHECIDOS) {
    const d = distancia(dominio, candidato, 2);
    if (d > 0 && d < melhorD) {
      melhorD = d;
      melhor = candidato;
    }
  }
  return melhor;
}
