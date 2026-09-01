import { describe, expect, it } from "vitest";
import { validarCaptura } from "../lib/captura/esquema";
import { dddExiste, pareceDigitado } from "../lib/captura/ddd";
import { sugerirDominio } from "../lib/captura/dominios";
import { mascararEmail, mascararNome, mascararTelefone } from "../lib/captura/mascara";

const valido = {
  nome: "ana maria",
  sobrenome: "silva",
  telefone: "(11) 99999-0000",
  email: "ANA@Empresa.COM.BR ",
  consentimento: true as const,
};

describe("validarCaptura — caminho feliz", () => {
  it("aceita e normaliza para o formato do banco", () => {
    const r = validarCaptura(valido);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // Telefone só com dígitos, e-mail em minúsculas, nome capitalizado (§5.7).
    expect(r.dados.telefone).toBe("11999990000");
    expect(r.dados.email).toBe("ana@empresa.com.br");
    expect(r.dados.nome).toBe("Ana Maria");
    expect(r.dados.sobrenome).toBe("Silva");
    expect(r.dados.origem).toBe("landing");
  });

  it("aceita telefone colado com +55", () => {
    const r = validarCaptura({ ...valido, telefone: "+55 (11) 99999-0000" });
    expect(r.ok && r.dados.telefone).toBe("11999990000");
  });
});

describe("validarCaptura — mensagens do §5.7", () => {
  const erroDe = (campo: string, entrada: Record<string, unknown>) => {
    const r = validarCaptura({ ...valido, ...entrada });
    return r.ok ? null : (r.erros as Record<string, string>)[campo];
  };

  it("campo vazio", () => {
    expect(erroDe("nome", { nome: "" })).toBe("Campo obrigatório.");
  });

  it("nome com uma letra só", () => {
    expect(erroDe("nome", { nome: "A" })).toBe("Use pelo menos 2 letras.");
  });

  it("conta quantos dígitos faltam, no singular e no plural", () => {
    expect(erroDe("telefone", { telefone: "1199999000" }))
      .toBe("Falta 1 dígito — use DDD + 9 números.");
    expect(erroDe("telefone", { telefone: "119999900" }))
      .toBe("Faltam 2 dígitos — use DDD + 9 números.");
  });

  it("DDD que não existe", () => {
    // 20 não está no plano de numeração da Anatel.
    expect(erroDe("telefone", { telefone: "20999990000" })).toBe("DDD inválido.");
  });

  it("celular sem o 9", () => {
    expect(erroDe("telefone", { telefone: "11899990000" }))
      .toBe("Celular precisa começar com 9 depois do DDD.");
  });

  it("dígito repetido", () => {
    expect(erroDe("telefone", { telefone: "11999999999" })).toBe("Confira o número informado.");
  });

  it("e-mail incompleto", () => {
    expect(erroDe("email", { email: "ana@" }))
      .toBe("E-mail incompleto — ex.: nome@empresa.com.br");
  });

  it("consentimento não marcado", () => {
    expect(erroDe("consentimento", { consentimento: false }))
      .toBe("É preciso concordar para enviarmos sua cotação.");
  });

  it("devolve uma mensagem por campo, não uma pilha", () => {
    const r = validarCaptura({ nome: "", sobrenome: "", telefone: "", email: "", consentimento: false });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(Object.keys(r.erros).sort()).toEqual(
      ["consentimento", "email", "nome", "sobrenome", "telefone"],
    );
  });
});

describe("honeypot", () => {
  it("recusa quando o campo escondido vem preenchido", () => {
    const r = validarCaptura({ ...valido, hp: "http://spam" });
    expect(r.ok).toBe(false);
  });

  it("aceita quando vem vazio ou ausente", () => {
    expect(validarCaptura({ ...valido, hp: "" }).ok).toBe(true);
    expect(validarCaptura(valido).ok).toBe(true);
  });
});

describe("DDDs", () => {
  it("aceita os que existem", () => {
    for (const d of [11, 21, 31, 41, 51, 61, 71, 81, 91, 19, 47, 85]) {
      expect(dddExiste(d), `DDD ${d}`).toBe(true);
    }
  });

  it("recusa os que não estão em uso", () => {
    for (const d of [10, 20, 23, 26, 30, 39, 52, 59, 60, 70, 78, 80, 90, 100]) {
      expect(dddExiste(d), `DDD ${d}`).toBe(false);
    }
  });
});

describe("pareceDigitado", () => {
  it("pega sequência repetida", () => {
    expect(pareceDigitado("11999999999")).toBe(true);
    expect(pareceDigitado("11911111111")).toBe(true);
  });

  it("não acusa número plausível", () => {
    // Termina em zeros, mas o corpo varia — é um número comum de empresa.
    expect(pareceDigitado("11999990000")).toBe(false);
    expect(pareceDigitado("21987654321")).toBe(false);
  });
});

describe("sugerirDominio", () => {
  it("sugere os erros comuns do §5.7", () => {
    expect(sugerirDominio("ana@gmail.con")).toBe("gmail.com");
    expect(sugerirDominio("ana@hotmial.com")).toBe("hotmail.com");
    expect(sugerirDominio("ana@outlok.com")).toBe("outlook.com");
  });

  it("fica quieto quando o domínio está certo", () => {
    expect(sugerirDominio("ana@gmail.com")).toBeNull();
  });

  it("fica quieto para domínio corporativo desconhecido", () => {
    // Sugerir aqui seria pior que calar: é provavelmente um domínio real.
    expect(sugerirDominio("ana@mxseguros.com.br")).toBeNull();
    expect(sugerirDominio("contato@transportadoraxyz.com.br")).toBeNull();
  });
});

describe("máscaras", () => {
  it("formata o telefone no meio da digitação, sem completar", () => {
    expect(mascararTelefone("1")).toBe("(1");
    expect(mascararTelefone("11")).toBe("(11");
    expect(mascararTelefone("119")).toBe("(11) 9");
    expect(mascararTelefone("11999990000")).toBe("(11) 99999-0000");
  });

  it("nome preserva o espaço que a pessoa acabou de digitar", () => {
    // Comer este espaço faz a próxima letra colar na palavra anterior.
    expect(mascararNome("ana ")).toBe("ana ");
    expect(mascararNome("ana  maria")).toBe("ana maria");
    expect(mascararNome("ana123")).toBe("ana");
  });

  it("e-mail sem espaço e em minúsculas", () => {
    expect(mascararEmail(" ANA @Empresa.com ")).toBe("ana@empresa.com");
  });
});
