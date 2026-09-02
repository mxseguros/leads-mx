import { expect, test } from "@playwright/test";
import {
  contarEventos,
  emailUnico,
  lerLeadPorEmail,
  limparLeadsDoTeste,
  telefoneUnico,
} from "./apoio";

/**
 * Fluxo 1 e 2 do §2: captura → cartão → mover → ganhar, e captura duplicada.
 *
 * A landing é pública, então estes testes não precisam de sessão para a
 * primeira metade — mas precisam para conferir o cartão na esteira.
 */

test.afterAll(async () => {
  await limparLeadsDoTeste();
});

test("um pedido pela landing vira cartão em Clientes potenciais", async ({ page }) => {
  const email = emailUnico("captura");
  const telefone = telefoneUnico();

  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  await page.getByLabel("Nome", { exact: true }).fill("joana");
  await page.getByLabel("Sobrenome").fill("de andrade");
  await page.getByLabel("WhatsApp").fill(telefone);
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel(/Qual seguro/).selectOption("Frota");
  await page.getByRole("checkbox").check();

  await page.getByRole("button", { name: "Quero minha cotação" }).click();

  // O sucesso SUBSTITUI o formulário (§5.1), não aparece embaixo dele.
  await expect(page.getByText(/Recebemos, Joana/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Quero minha cotação" })).toHaveCount(0);

  const lead = await lerLeadPorEmail(email);
  expect(lead).not.toBeNull();
  expect(lead!.stage).toBe("potenciais");
  // A preposição do sobrenome fica minúscula: "Joana de Andrade".
  expect(lead!.last_name).toBe("de Andrade");
  // Nasce com próxima ação agendada — é o que sustenta a meta de 1 dia útil.
  expect(lead!.next_action_label).toBe("1º contato");
  expect(lead!.next_action_at).toBeTruthy();

  await page.goto("/esteira");
  await page.getByLabel("Buscar leads").fill("Joana de Andrade");
  await expect(page.getByText("Joana de Andrade")).toBeVisible();
});

test("o mesmo telefone não cria um segundo cartão", async ({ page }) => {
  const telefone = telefoneUnico();
  const primeiro = emailUnico("dup.um");
  const segundo = emailUnico("dup.dois");

  const enviar = async (email: string, nome: string) => {
    await page.goto("/");
    await page.getByLabel("Nome", { exact: true }).fill(nome);
    await page.getByLabel("Sobrenome").fill("Repetido");
    await page.getByLabel("WhatsApp").fill(telefone);
    await page.getByLabel("E-mail").fill(email);
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Quero minha cotação" }).click();
    // Para quem enviou, os dois pedidos deram certo — e deram mesmo.
    await expect(page.getByText(/Recebemos/)).toBeVisible();
  };

  await enviar(primeiro, "Carla");
  await enviar(segundo, "Carla");

  const lead = await lerLeadPorEmail(primeiro);
  expect(lead).not.toBeNull();

  // O segundo e-mail não gerou lead nenhum.
  expect(await lerLeadPorEmail(segundo)).toBeNull();

  // E o pedido repetido virou evento no lead que já existia (§6).
  expect(await contarEventos(lead!.id, "duplicate_submission")).toBe(1);
});

test("o formulário recusa DDD que não existe, sem enviar", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("Nome", { exact: true }).fill("Teste");
  await page.getByLabel("Sobrenome").fill("Invalido");
  await page.getByLabel("WhatsApp").fill("20 99999-0000");
  await page.getByLabel("E-mail").fill(emailUnico("ddd"));
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Quero minha cotação" }).click();

  await expect(page.getByText("DDD inválido.")).toBeVisible();
  await expect(page.getByText(/Recebemos/)).toHaveCount(0);
});
