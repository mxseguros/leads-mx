# MX Leads

Captura e prospecção de leads PJ para a MX Corretora de Seguros.
A landing captura; a equipe trabalha em uma esteira de sete fases.

Documentação em [`Docs/`](Docs/) · convenções em [`CLAUDE.md`](CLAUDE.md).

## Rodar localmente

Precisa de Node >= 20.9.

```bash
corepack pnpm install
cp .env.example apps/web/.env.local   # preencha com o projeto de desenvolvimento
corepack pnpm dev
```

> `pnpm` roda como `corepack pnpm` neste ambiente: `corepack enable` global
> pede privilégio de administrador no Windows. Em CI e no Linux,
> `corepack enable pnpm` resolve e o `pnpm` fica direto no PATH.

## Banco

As migrations estão em `supabase/migrations/`, em ordem: base, RLS, views.
Com a CLI do Supabase:

```bash
supabase db reset            # aplica migrations + seed.sql
corepack pnpm base:sintetica # leads de desenvolvimento (@exemplo.test)
```

Para conferir a RLS — o teste prova a **negativa**, que anon não lê nada:

```bash
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/rls.sql
```

## Comandos

| Comando | O que faz |
|---|---|
| `corepack pnpm dev` | Servidor de desenvolvimento |
| `corepack pnpm build` | Build de produção |
| `corepack pnpm typecheck` | `tsc --noEmit` |
| `corepack pnpm test` | Testes unitários (Vitest) |
| `corepack pnpm lint` | ESLint |
| `corepack pnpm base:sintetica` | Popula leads falsos; `--limpar` remove |

## Estado

Fase 0 (Fundação) entregue: schema, RLS, views, tokens, componentes base, auth
por magic link e a esteira vazia. O roteiro das fases 1 a 4 está em
[`Docs/MX-Leads-Plano-Execucao-v0.3.md`](Docs/MX-Leads-Plano-Execucao-v0.3.md).
