/**
 * DDDs em operação no Brasil (§5.7).
 *
 * A lista existe para recusar erro de digitação, não para bloquear ninguém:
 * "(01) 99999-0000" é engano, e avisar na hora vale mais do que descobrir na
 * primeira tentativa de ligação, três dias depois.
 *
 * Fonte: plano de numeração da Anatel. Nem todo par de 11 a 99 existe — 20,
 * 23, 25, 26, 29, 30, 36, 39, 40, 50, 52, 56 a 60, 70, 72, 76, 78, 80, 90 não
 * estão em uso.
 */

export const DDDS: ReadonlySet<number> = new Set([
  // São Paulo
  11, 12, 13, 14, 15, 16, 17, 18, 19,
  // Rio de Janeiro e Espírito Santo
  21, 22, 24, 27, 28,
  // Minas Gerais
  31, 32, 33, 34, 35, 37, 38,
  // Paraná e Santa Catarina
  41, 42, 43, 44, 45, 46, 47, 48, 49,
  // Rio Grande do Sul
  51, 53, 54, 55,
  // Centro-Oeste e Norte
  61, 62, 63, 64, 65, 66, 67, 68, 69,
  // Bahia e Sergipe
  71, 73, 74, 75, 77, 79,
  // Nordeste
  81, 82, 83, 84, 85, 86, 87, 88, 89,
  // Norte
  91, 92, 93, 94, 95, 96, 97, 98, 99,
]);

export function dddExiste(ddd: number | string): boolean {
  return DDDS.has(Number(ddd));
}

/**
 * Rejeita telefone de dígito repetido: 11 99999-9999, 11 98888-8888.
 * É o que aparece quando alguém preenche só para ver o que acontece — e é o
 * lead que o consultor descobre ser inútil depois de tentar ligar.
 *
 * Só olha os 9 dígitos depois do DDD, e ignora o 9 inicial obrigatório:
 * 11 91111-1111 é suspeito, mas 11 99999-0000 é um número plausível.
 */
export function pareceDigitado(telefone: string): boolean {
  const digitos = telefone.replace(/\D/g, "");
  if (digitos.length !== 11) return false;

  const corpo = digitos.slice(3); // depois do DDD e do 9 obrigatório
  return new Set(corpo).size === 1;
}
