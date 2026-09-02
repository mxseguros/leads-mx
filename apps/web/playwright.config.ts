import { defineConfig, devices } from "@playwright/test";

/**
 * E2E dos fluxos críticos (§2, item F4-1).
 *
 * Roda contra o banco de DESENVOLVIMENTO. Todo lead criado aqui usa e-mail
 * @e2e.test e é removido no fim — o mesmo contrato da base sintética, para
 * teste nunca sujar dado que alguém está olhando.
 */
export default defineConfig({
  testDir: "./e2e",
  // Um worker só: os testes compartilham o mesmo banco, e paralelismo faria
  // um apagar o lead que o outro acabou de criar.
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  timeout: 45_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: process.env.E2E_URL ?? "http://localhost:3000",
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },

  projects: [
    // Entra uma vez e guarda os cookies; os outros projetos reaproveitam.
    { name: "login", testMatch: /login\.setup\.ts/ },
    {
      name: "admin",
      testIgnore: /login\.setup\.ts/,
      dependencies: ["login"],
      use: { ...devices["Desktop Chrome"], storageState: "e2e/.sessao.json" },
    },
  ],

  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
