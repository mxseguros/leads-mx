# MX Leads

Captura e prospecção de leads **pessoa jurídica** para a MX Corretora de Seguros.
Empresas pedem cotação por um formulário de quatro campos; cada pedido vira um
cartão em uma esteira de sete fases fixas.

## Onde está a verdade

| Assunto | Arquivo |
|---|---|
| Produto, UX, schema, API, regras da esteira | `Docs/MX-Leads-Planejamento-v0.3.md` |
| Layout, espaçamento, cor, comportamento | `Docs/MX-Leads-Prototipo-v0.3.html` |
| Fases, checklist, portões de aceite, lacunas | `Docs/MX-Leads-Plano-Execucao-v0.3.md` |

**Em qualquer dúvida de layout, o protótipo vence o texto.** Referências `§` no
código apontam para o planejamento.

## Convenções

**Idioma (decisão D6).** Banco e API em inglês — `leads`, `first_name`, `stage`,
como no §7 e no §8. Aplicativo em português — arquivos, componentes, funções e
variáveis. A tradução acontece em um lugar só: `apps/web/lib/dominio/mapear.ts`.
Nenhum componente conhece `next_action_at`; quando o schema mudar, quebra ali e o
compilador aponta o resto.

**A regra mora no servidor.** Máscara e validação no cliente são conveniência.
A API precisa recusar sozinha — alguém sempre chama a rota direto.

**Toda mudança de lead vira evento** em `lead_events`, com autor e horário.
Sem isso o histórico mente e o Desfazer não tem o que reverter.

**Nada de dado real em desenvolvimento.** Base sintética via
`corepack pnpm base:sintetica`. Todo lead gerado tem e-mail `@exemplo.test`.

**O middleware não pode lançar.** Um `throw` em `apps/web/middleware.ts` devolve
500 em toda rota que passa pelo matcher, inclusive o login — e aí ninguém entra
nem para consertar. Falha de auth vira redirect para `/entrar`.

**A chave secreta ignora a RLS.** Vive só em `lib/supabase/administrador.ts`,
nunca em `NEXT_PUBLIC_*`, nunca em componente de cliente.

**Cores de marca ≠ cores de status.** Navy e azul-claro são marca e ação;
verde, âmbar e vermelho são exclusivos de ganho, atenção e perda.

**Tokens de design nos três estados de tema.** `apps/web/app/globals.css`
define `:root`, `@media (prefers-color-scheme: dark)` guardado por
`:root:not([data-theme="light"])` e `:root[data-theme="dark"]`. Nenhuma cor pode
ser definida *só* dentro de um bloco de tema — token que nasce dentro de media
query não existe no estado sem preferência declarada.

## Estrutura

```
apps/web/            Next.js 15 — landing (Fase 1), admin e API
  app/               Rotas. /entrar, /esteira, /auth/confirmar
  componentes/ui/    Botão, Campo, Chip, Avatar, Gaveta, Modal, Aviso
  lib/dominio/       Fases, tipos do app, mapeador da fronteira
  lib/supabase/      Clientes: navegador, servidor, administrador, middleware
  testes/            Vitest, funções puras
supabase/migrations/ Schema, RLS, views
supabase/tests/      Teste de RLS que prova a negativa
scripts/             Base sintética
```

## Comandos

`pnpm` neste ambiente roda como `corepack pnpm` (o `corepack enable` global
pede admin no Windows).

```bash
corepack pnpm install
corepack pnpm dev             # localhost:3000
corepack pnpm typecheck
corepack pnpm test
corepack pnpm lint
corepack pnpm build
corepack pnpm base:sintetica  # popula leads de desenvolvimento
```

## Ambiente

O projeto Supabase de **desenvolvimento** está com schema, seeds e RLS
aplicados e verificados contra o banco real. A referência dele fica no `.env`,
não aqui. Produção ainda não existe (criar antes do go-live da Fase 1).

Credenciais em `.env` e `apps/web/.env.local`, os dois fora do git. O projeto
usa o formato novo de chave: `sb_publishable_` e `sb_secret_`.

Há um usuário `gestor` cadastrado, **sem senha** — o acesso é por magic link.

## Estado atual

**Fase 0 entregue e verificada no banco real.** 16 leads sintéticos nas sete
fases, gatilho de perfil funcionando, `local_today()` marcando atraso no fuso de
São Paulo, middleware redirecionando em vez de dar 500, RLS liberando para
perfil ativo e recusando para anônimo.

Três pendências que **não são de código** e ficaram para a MX:

1. **`revoke` de `anon` não aplicado.** A migration
   `20260901120300_fechar_views_para_anon.sql` existe no repositório mas nunca
   rodou no banco — `v_pipeline_metrics`, `leads` e `products` ainda respondem
   HTTP 200 a requisição sem sessão (com zeros e listas vazias, sem vazar dado).
   É DDL: precisa do SQL Editor ou da connection string.
2. **E-mail do magic link em HTTP 429.** O SMTP embutido do Supabase permite ~2
   envios por hora. Resolver configurando SMTP customizado apontando para o
   Resend — é a dependência E6 do plano.
3. **CI não bloqueia merge.** O workflow roda, mas falta marcar o job como
   *required* em branch protection no GitHub.

Decisões fechadas ao construir, ambas reversíveis: **D1** backend em Route
Handlers do Next (não FastAPI) e **D5** `won_value` separado de
`estimated_value`. Continuam abertas: **D3** (Empresa/CNPJ na ficha em v1 ou
v1.1) e **D4** (landings por produto na v1) — a D4 precisa ser decidida antes da
landing da Fase 1, senão vira retrabalho.

## Escopo

Decisões de 01/09/2026 que cortam o plano original:

**O widget saiu** (F1-8, F1-9). O produto é a landing de captação mais o admin.
Consequência que já está no código: a rota pública **não tem CORS** — sem
widget, o único chamador legítimo é o formulário da própria landing, que é
mesma origem, e o curinga deixaria qualquer site gravar lead no board. As
origens `widget-flutuante` e `widget-inline` em `lead_sources` estão inativas.

**O aviso de novo lead por e-mail saiu** (F1-11). A aplicação não manda e-mail
nenhum, e não depende do Resend. A equipe descobre o lead novo abrindo a
esteira, onde ele nasce em Clientes potenciais com "1º contato" agendado para o
próximo dia útil.

Cuidado para não confundir: o Supabase **continua** mandando o magic link do
login pelo SMTP embutido dele, que é limitado a poucos envios por hora. Isso é
ajuste no painel (Authentication → Emails), não código.

**Alertas de SLA sem e-mail** (F3-5). Com o e-mail cortado, eles viraram uma
faixa dentro do admin (`app/_admin/sinais.tsx`), lida de `v_sinais_sla`. A
limitação é real e não deve ser esquecida: **só alcança quem está com a tela
aberta**. Lead que chega às 18h sem responsável não acorda ninguém.

## Migrations aplicadas

Não há controle automático de versão: tudo entrou pelo SQL Editor, na mão.
Estado do banco de desenvolvimento em 02/09/2026 — **as cinco aplicadas**:

| Migration | O que traz |
|---|---|
| `20260901120000_base` | extensões, enums, tabelas, gatilho de perfil |
| `20260901120100_rls` | políticas |
| `20260901120200_visoes` | `v_leads_board`, `v_pipeline_metrics`, `v_stage_counts` |
| `20260901120300_fechar_views_para_anon` | revoke de `anon` — verificado: 401 em tudo |
| `20260902100000_retomada_e_sla` | `retomar_contatos_posteriores()`, `v_sinais_sla`, agendamento |

Antes de mexer no banco, confira o que está lá — não confie na ordem dos
arquivos. Produção ainda não existe e vai precisar das cinco, na ordem.

## Armadilhas deste ambiente

**Nunca apague `.next` nem rode `build` com o `next dev` de pé.** O servidor
continua servindo HTML que aponta para chunks já removidos: o CSS vira 404 e a
página abre sem estilo nenhum, ou o E2E falha em massa sem motivo aparente.
Pare o servidor primeiro. O sintoma é sempre o mesmo, e a checagem é uma só:

```bash
curl -sI http://localhost:3000/_next/static/css/app/layout.css
```

**CSS sem `@layer` vence CSS em layer.** As regras de elemento em
`globals.css` vivem em `@layer base` e as classes auxiliares em
`@layer components` por causa disso: soltas, elas sobrepunham as utilitárias do
Tailwind — `text-white` num `h1` não fazia efeito, e o título do hero saía navy
sobre navy.

## Estado das fases

Fases 0 a 3 entregues e verificadas contra o banco real. Falta a **Fase 4
(Lançamento)**: E2E no Playwright, Sentry, painel de saúde do formulário,
retenção LGPD, backup com restore testado, cutover e treinamento. Checklist em
`Docs/MX-Leads-Plano-Execucao-v0.3.md`.

## Pendências que não são de código

1. **Turnstile (E2) — bloqueia produção.** Sem `TURNSTILE_SECRET_KEY` a captura
   recusa tudo em produção, por decisão deliberada.
2. **Push do git.** A conta autenticada não tem acesso ao repositório remoto;
   os commits estão só na máquina local.
3. **Upstash (E3).** Sem ele o rate limit vive na memória do processo e não
   protege em serverless.
4. **SMTP do Supabase.** O magic link estoura o limite de envios; a equipe
   depende de link gerado pelo servidor para entrar.
5. Segundo projeto Supabase para produção, DNS, logos em SVG, e o CI marcado
   como *required* em branch protection.
