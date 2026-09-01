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
nunca em `NEXT_PUBLIC_*`, nunca em componente de cliente, nunca no widget.

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
packages/widget/     Widget em Shadow DOM (Fase 1)
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

## Estado atual

**Fase 0 (Fundação) entregue.** Fases 1 a 4 seguem o checklist do
`Docs/MX-Leads-Plano-Execucao-v0.3.md`. A landing pública, a captura e o widget
são a Fase 1; arrastar, ficha e regras de fase são a Fase 2.
