import { test as setup, expect } from "@playwright/test";
import { bancoAdmin } from "./apoio";

const ARQUIVO_SESSAO = "e2e/.sessao.json";

/**
 * Entra uma vez e guarda os cookies para os outros testes.
 *
 * Gera o link pelo servidor em vez de esperar e-mail: o SMTP embutido do
 * Supabase é limitado a poucos envios por hora, e uma suíte que depende dele
 * falha de forma intermitente por motivo nenhum.
 *
 * É o mesmo caminho que /auth/confirmar já aceita para convite de equipe —
 * então o teste exercita código de produção, não um atalho só dele.
 */
setup("entra no admin e guarda a sessão", async ({ page }) => {
  const email = process.env.E2E_EMAIL ?? "gabriel.betto@mxseguros.com.br";

  const { data, error } = await bancoAdmin().auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (error || !data?.properties?.hashed_token) {
    throw new Error(`Não consegui gerar o link de acesso para ${email}: ${error?.message}`);
  }

  await page.goto(
    `/auth/confirmar?token_hash=${data.properties.hashed_token}&type=magiclink&destino=%2Festeira`,
  );

  await expect(page).toHaveURL(/\/esteira/);
  await expect(page.getByRole("heading", { name: "Esteira", level: 1 })).toBeVisible();

  await page.context().storageState({ path: ARQUIVO_SESSAO });
});
