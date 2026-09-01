import { describe, expect, it } from "vitest";
import {
  capitalizarNome,
  dataCurta,
  idade,
  iniciais,
  moeda,
  porcentagem,
  telefone,
  telefoneCru,
} from "../lib/formato";

describe("telefone", () => {
  it("formata celular de 11 digitos", () => {
    expect(telefone("11999990000")).toBe("(11) 99999-0000");
  });

  it("formata fixo de 10 digitos", () => {
    expect(telefone("1133334444")).toBe("(11) 3333-4444");
  });

  it("devolve o valor cru quando nao reconhece", () => {
    expect(telefone("123")).toBe("123");
    expect(telefone(null)).toBe("");
  });
});

describe("telefoneCru", () => {
  it("guarda so digitos", () => {
    expect(telefoneCru("(11) 99999-0000")).toBe("11999990000");
  });

  it("aceita colar com +55", () => {
    expect(telefoneCru("+55 11 99999-0000")).toBe("11999990000");
  });

  it("corta o que passa de 11 digitos", () => {
    expect(telefoneCru("119999900001234")).toBe("11999990000");
  });
});

describe("moeda", () => {
  it("formata sem centavos", () => {
    // Espaco nao separavel: e o que o Intl do pt-BR devolve.
    expect(moeda(1234.5).replace(/ /g, " ")).toBe("R$ 1.235");
  });

  it("devolve vazio para nulo", () => {
    expect(moeda(null)).toBe("");
  });
});

describe("dataCurta", () => {
  it("mostra dia e mes sem passar por Date", () => {
    // Passar por Date converteria de UTC e mostraria o dia anterior.
    expect(dataCurta("2026-09-15")).toBe("15/09");
  });
});

describe("idade", () => {
  it("fala em portugues", () => {
    expect(idade(0)).toBe("hoje");
    expect(idade(1)).toBe("há 1 dia");
    expect(idade(5)).toBe("há 5 dias");
  });
});

describe("iniciais", () => {
  it("junta as duas primeiras letras", () => {
    expect(iniciais("Carla", "Souza")).toBe("CS");
  });

  it("cai para ? quando nao ha nome", () => {
    expect(iniciais("", "")).toBe("?");
  });
});

describe("porcentagem", () => {
  it("arredonda", () => {
    expect(porcentagem(0.666)).toBe("67%");
  });

  it("mostra travessao quando nao ha taxa", () => {
    expect(porcentagem(null)).toBe("—");
  });
});

describe("capitalizarNome", () => {
  it("capitaliza cada palavra", () => {
    expect(capitalizarNome("ana maria")).toBe("Ana Maria");
  });

  it("mantem preposicoes em minuscula", () => {
    expect(capitalizarNome("maria da silva")).toBe("Maria da Silva");
  });

  it("preposicao continua minuscula abrindo o campo sobrenome", () => {
    // Nome e sobrenome sao campos separados: "de oliveira" comeca a string,
    // mas o cartao mostra "Rodrigo de Oliveira", nao "Rodrigo De Oliveira".
    expect(capitalizarNome("de oliveira")).toBe("de Oliveira");
    expect(capitalizarNome("dos santos")).toBe("dos Santos");
  });

  it("preposicao sozinha vira maiuscula", () => {
    // Sem nome nenhum para acompanhar, "de" isolado e so uma palavra.
    expect(capitalizarNome("de")).toBe("De");
  });

  it("remove espacos duplos", () => {
    expect(capitalizarNome("joao   pedro")).toBe("Joao Pedro");
  });

  it("nao come o espaco enquanto a pessoa digita", () => {
    expect(capitalizarNome("ana ")).toBe("Ana ");
  });
});
