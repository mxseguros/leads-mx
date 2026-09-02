import { expect, test, type Page } from "@playwright/test";
import { bancoAdmin, emailUnico, lerLeadPorEmail, limparLeadsDoTeste, telefoneUnico } from "./apoio";

/**
 * Fluxos 3 e 4 do §2: perder com motivo obrigatório, e a retomada de
 * Contato posterior.
 *
 * Movem o lead pelo SELETOR DE FASE da ficha, e não arrastando. Os dois
 * caminhos passam pelo mesmo modal e pela mesma rota (§3, princípio 6), e o
 * seletor é o que um teste consegue exercitar de forma estável — arrasto
 * simulado testa mais o dnd-kit do que as regras da MX.
 */

/** Cria um lead direto no banco: montar cenário pela interface testa o teste. */
async function criarLead(fase = "acompanhamento") {
  const db = bancoAdmin();
  const email = emailUnico("esteira");

  const { data: origem } = await db.from("lead_sources").select("id").eq("slug", "manual").single();
  const { data } = await db
    .from("leads")
    .insert({
      first_name: "Empresa",
      last_name: "Teste",
      phone: telefoneUnico().replace(/\D/g, ""),
      email,
      source_id: Number(origem!.id),
      stage: fase,
      next_action_label: "Enviar cotação",
      next_action_at: new Date().toISOString().slice(0, 10),
      consent_at: new Date().toISOString(),
      consent_text_version: "e2e",
    })
    .select("id")
    .single();

  return { id: String(data!.id), email };
}

async function abrirFicha(page: Page, email: string) {
  await page.goto("/lista");
  await page.getByLabel("Buscar leads").fill(email);
  await page.getByRole("cell", { name: email }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
}

test.afterAll(async () => {
  await limparLeadsDoTeste();
});

test("Perdido exige motivo antes de confirmar", async ({ page }) => {
  const { email } = await criarLead();
  await abrirFicha(page, email);

  await page.getByRole("button", { name: "Perdido", exact: true }).click();

  const modal = page.getByRole("dialog", { name: /Mover para Perdido/ });
  await expect(modal).toBeVisible();

  // O seletor abre sem escolha feita; confirmar assim tem que ser recusado.
  await modal.getByLabel("Motivo da perda").selectOption("");
  await modal.getByRole("button", { name: /Mover para Perdido/ }).click();
  await expect(modal.getByText("Escolha o motivo da perda.")).toBeVisible();

  // O lead não se moveu enquanto o motivo faltava.
  expect((await lerLeadPorEmail(email))!.stage).toBe("acompanhamento");

  const db = bancoAdmin();
  const { data: motivo } = await db.from("lost_reasons").select("id, label").eq("active", true).limit(1).single();

  await modal.getByLabel("Motivo da perda").selectOption(String(motivo!.id));
  await modal.getByRole("button", { name: /Mover para Perdido/ }).click();
  await expect(modal).toBeHidden();

  await expect(async () => {
    const lead = await lerLeadPorEmail(email);
    expect(lead!.stage).toBe("perdido");
    expect(lead!.lost_reason_id).toBe(Number(motivo!.id));
    // Fase terminal limpa a próxima ação, senão o lead fechado apareceria em
    // "follow-ups atrasados" para sempre.
    expect(lead!.next_action_at).toBeNull();
  }).toPass();
});

test("Ganhou grava o prêmio, e Desfazer devolve tudo", async ({ page }) => {
  const { email } = await criarLead("negociacao");
  await abrirFicha(page, email);

  await page.getByRole("button", { name: "Ganhou", exact: true }).click();

  const modal = page.getByRole("dialog", { name: /Mover para Ganhou/ });
  await modal.getByLabel(/Prêmio anual/).fill("48000");
  await modal.getByLabel(/Seguradora/).fill("Porto Seguro");
  await modal.getByRole("button", { name: /Mover para Ganhou/ }).click();
  await expect(modal).toBeHidden();

  await expect(async () => {
    const lead = await lerLeadPorEmail(email);
    expect(lead!.stage).toBe("ganhou");
    expect(Number(lead!.won_value)).toBe(48000);
    expect(lead!.insurer).toBe("Porto Seguro");
  }).toPass();

  // Desfazer tem que devolver a fase E limpar o fechamento — foi o defeito
  // encontrado na Fase 2, e este teste existe para ele não voltar.
  await page.getByRole("button", { name: "Desfazer" }).click();

  await expect(async () => {
    const lead = await lerLeadPorEmail(email);
    expect(lead!.stage).toBe("negociacao");
    expect(lead!.won_value).toBeNull();
    expect(lead!.insurer).toBeNull();
    expect(lead!.next_action_label).toBe("Enviar cotação");
  }).toPass();
});

test("Contato posterior exige data, e a retomada devolve o lead", async ({ page }) => {
  const { id, email } = await criarLead();
  await abrirFicha(page, email);

  await page.getByRole("button", { name: "Contato posterior", exact: true }).click();

  const modal = page.getByRole("dialog", { name: /Mover para Contato posterior/ });
  await modal.getByRole("button", { name: /Mover para Contato posterior/ }).click();
  await expect(modal.getByText("Informe a data para retomar o contato.")).toBeVisible();

  const daquiUmMes = new Date();
  daquiUmMes.setDate(daquiUmMes.getDate() + 30);
  await modal.getByLabel("Retomar em").fill(daquiUmMes.toISOString().slice(0, 10));
  await modal.getByRole("button", { name: /Mover para Contato posterior/ }).click();
  await expect(modal).toBeHidden();

  await expect(async () => {
    const lead = await lerLeadPorEmail(email);
    expect(lead!.stage).toBe("posterior");
    // Não conta como atrasado enquanto espera.
    expect(lead!.next_action_at).toBeNull();
  }).toPass();

  const db = bancoAdmin();

  // Força a data para ontem e roda o job: é o que o pg_cron fará às 6h.
  const ontem = new Date();
  ontem.setDate(ontem.getDate() - 1);
  await db.from("leads").update({ resume_at: ontem.toISOString().slice(0, 10) }).eq("id", id);

  const { data: movidos } = await db.rpc("retomar_contatos_posteriores");
  expect(Number(movidos)).toBeGreaterThanOrEqual(1);

  const lead = await lerLeadPorEmail(email);
  expect(lead!.stage).toBe("potenciais");
  expect(lead!.next_action_label).toBe("Retomar contato");
  expect(lead!.resume_at).toBeNull();
});

test("a API recusa quem tenta pular o modal", async ({ request }) => {
  const { id, email } = await criarLead();

  // Mesma sessão do navegador, chamando a rota direto.
  const resposta = await request.post(`/api/v1/leads/${id}/fase`, {
    data: { para: "perdido" },
  });

  expect(resposta.status()).toBe(422);
  const corpo = (await resposta.json()) as { error: { message: string; field: string } };
  expect(corpo.error.field).toBe("motivoPerdaId");
  expect(corpo.error.message).toBe("Escolha o motivo da perda.");

  expect((await lerLeadPorEmail(email))!.stage).toBe("acompanhamento");
});
