# MX Leads — Planejamento de Produto, UX/UI e Implementação

**Versão:** 0.3 · **Data:** 01/09/2026 · **Owner:** Betto (PO) · **Cliente:** MX Corretora de Seguros
**Protótipo navegável:** artifact "MX Leads" (landing · widget · admin/esteira · guia visual)

---

## 1. Visão

Um sistema simples de captura e prospecção de leads **pessoa jurídica** para a MX Seguros. Empresas pedem cotação por um formulário de quatro campos (Nome, Sobrenome, WhatsApp, E-mail) — em uma landing page própria ou em um widget embutido no site atual. Os produtos oferecidos são **Auto, Frota, Transporte, Consórcio, Saúde e Vida em Grupo**; o produto de interesse é um campo opcional do formulário e um rótulo do cartão, nunca uma fase. Cada pedido vira um cartão no admin, em uma esteira visual no modelo do Microsoft Planner, com sete fases fixas:

**Clientes potenciais → Reunião → Acompanhamento → Negociação → Ganhou / Perdido / Contato posterior**

O produto existe para responder três perguntas todos os dias: *quem entrou e ainda não foi atendido?*, *o que eu preciso fazer hoje?* e *onde estamos perdendo negócios?*

### 1.1 Objetivos mensuráveis (v1)

| Objetivo | Métrica | Meta inicial |
|---|---|---|
| Nenhum lead esquecido | % de leads com 1º contato em até 1 dia útil | ≥ 90% |
| Esteira viva | % de leads ativos com próxima ação e data preenchidas | ≥ 80% |
| Aprender com a perda | % de leads em "Perdido" com motivo registrado | 100% (obrigatório) |
| Conversão do formulário | Envios / visitas na landing | medir baseline no 1º mês |

### 1.2 Escopo v1 e fora de escopo

**Dentro:** landing page, widget (flutuante + inline), API pública de captura com anti-spam e consentimento LGPD, admin com board Kanban + lista + ficha do lead + histórico, filtros e busca, métricas básicas, login para a equipe, cadastro manual de lead, exportação CSV.

**Fora (v2+):** disparo automático de WhatsApp via API oficial, integração com e-mail marketing, calendário, relatórios avançados, múltiplos boards/pipelines customizáveis, multi-tenant, app mobile nativo.

---

## 2. Pessoas e jornadas

### 2.1 Visitante (decisor de uma empresa — sócio, gestor de frota, RH ou financeiro)
Chega pelo Google, LinkedIn/Instagram ou indicação, muitas vezes no celular entre reuniões. Quer saber "quanto custa para a minha operação" e não quer preencher um formulário longo nem informar CNPJ antes de falar com alguém. **Jornada:** vê a landing → entende em 5 segundos que uma pessoa vai responder pelo WhatsApp → preenche 4 campos + consentimento → vê confirmação com opção de já chamar no WhatsApp.

### 2.2 Consultor (Carla, Rafael)
Trabalha com 20–40 leads ativos ao mesmo tempo, alternando entre WhatsApp, telefone e portais de seguradoras. **Jornada diária:** abre o board → olha "Follow-ups atrasados" e "para hoje" → abre a ficha do lead → clica em WhatsApp (mensagem pré-preenchida) → registra nota e nova próxima ação → arrasta o cartão quando muda de fase.

### 2.3 Gestor comercial (Marcos)
Quer ver o funil inteiro sem perguntar a ninguém. **Jornada semanal:** métricas do topo (novos, em andamento, taxa de ganho, atrasados) → filtra por responsável → distribui leads sem dono → revisa motivos de perda.

---

## 3. Princípios de UX e decisões de design

1. **Quatro campos, nada mais.** Cada campo extra no formulário público derruba conversão. Produto de interesse é opcional; empresa, CNPJ, porte e tamanho da frota são levantados pelo consultor na conversa e registrados na ficha (v1.1: campos "Empresa" e "CNPJ" na ficha do admin, não no formulário público).
2. **O board é a home.** O consultor cai direto na esteira, não em um dashboard. As métricas vivem em uma faixa fina acima do board.
3. **Modelo Planner, não Trello genérico.** Fases fixas (são o processo da MX), cartões com "próxima ação + data" em destaque, cabeçalho de coluna com contagem e "+", ficha em painel lateral que mantém o board visível.
4. **Data é o coração do cartão.** Todo lead ativo deve ter próxima ação e data. Atraso fica vermelho no cartão, sobe para a métrica e aparece como aviso na ficha.
5. **Fases terminais pedem contexto.** Entrar em *Perdido* exige motivo; em *Contato posterior* exige data de retomada; em *Ganhou* pede prêmio anual e seguradora. É o custo mínimo para o funil ter dados úteis.
6. **Mover de fase por dois caminhos.** Arrastar (desktop) e seletor de fase na ficha (teclado, mobile, acessibilidade). Toda movimentação tem "Desfazer".
7. **Ação a um clique.** WhatsApp (wa.me com mensagem pré-preenchida), e-mail e ligar direto do cartão e da ficha.
8. **Cores de marca ≠ cores de status.** Navy e azul-claro são marca e ação; verde/âmbar/vermelho são exclusivos para ganho/atenção/perda.
9. **Estados vazios ensinam.** Coluna vazia diz o que fazer. Erros de formulário aparecem junto ao campo, em linguagem direta.
10. **Dois temas desde o início.** Claro e escuro com o mesmo cuidado (o admin é usado à noite).

---

## 4. Design system (guia MX aplicado)

### 4.1 Paleta

| Token | Hex | Uso |
|---|---|---|
| `--mx-navy` | `#071B34` | Marca, botão primário (tema claro), sidebar do admin, hero da landing |
| `--mx-sky` | `#CAE3F7` | Acento suave: seleção, avatar, botão primário no tema escuro, destaque no título |
| `--mx-sage` | `#B0AF94` | Acento secundário: chips de produto, notas no histórico |
| `--mx-gray` | `#484848` | Texto (ajustado para `#3D434D` na UI, com leve viés azulado) |
| `--mx-line` | `#DFDFDF` | Bordas e divisores (`#E2E1DD` na UI) |
| `--mx-offwhite` | `#FFFDFB` | Fundo da página no tema claro |
| `--mx-black` | `#000000` | Reservado a impressos; não usar na UI |

Semânticas (fora da paleta de marca): ganho/ok `#1F7A55`, atenção/hoje `#B7791F`, perda/atraso `#B23B2E`. Cada fase tem uma cor de identificação (ponto na coluna e no chip): potenciais `#5B8DC9`, reunião navy, acompanhamento `#8E8C6A`, negociação `#C48A2B`, ganhou verde, perdido vermelho, contato posterior `#7C8492`. Tema escuro: fundo `#0A1220`, superfícies `#111B2C`/`#172538`, e as mesmas cores clareadas (ver tokens no protótipo).

### 4.2 Tipografia
- **Manrope** (Google Fonts) — títulos, números de métricas, nomes nos cartões, botões. Geométrica e aberta, próxima do desenho do monograma MX. Pesos 600/700/800.
- **IBM Plex Sans** — texto corrido, formulários, tabelas. `font-variant-numeric: tabular-nums` em telefones, valores e datas.
- Escala: 52/34/22/19/15/14/13/12/11 px. Rótulos em caixa alta com `letter-spacing: .12em`.

### 4.3 Logos e selo
- Lockup horizontal "MX | Corretora de seguros" em branco sobre navy (header da landing, sidebar do admin) e em navy sobre claro (rodapé, e-mails).
- Monograma "MX" como favicon, ícone do widget e marca compacta.
- Selo circular "Corretora de seguros · desde 2002" como elemento de confiança na landing (hero) — nunca como logo principal.

### 4.4 Componentes (comportamento)
- **Botões:** primário navy / azul-claro (escuro), secundário com borda, suave (azul-claro), WhatsApp verde. Altura 40px (46px na landing). Raio 6px.
- **Inputs:** 42px, borda `--line-strong`, foco com anel azul de 3px. Máscara de telefone `(11) 99999-9999`. Prefixo +55 fixo.
- **Chips:** produto (sage suave), fase (cor da fase a 16% + texto na cor), origem (texto discreto).
- **Cartão do lead:** produto + origem · nome + telefone · próxima ação (badge com estado: normal / hoje âmbar / atrasado vermelho / fechado verde) + valor + avatar do responsável. Lead sem responsável exibe avatar "?" e uma barra azul à esquerda (novo).
- **Coluna:** cabeçalho fixo (ponto, nome, contagem, +), corpo com rolagem própria, rodapé com soma de valor estimado quando houver.
- **Ficha (drawer):** 460px à direita, com ações WhatsApp/E-mail/Ligar, seletor de fase, campos editáveis com salvamento automático, campos condicionais (motivo de perda, data de retomada), histórico cronológico e nota rápida.
- **Toast com Desfazer** para toda movimentação de fase.

---

## 5. Especificação das telas

### 5.1 Landing page (`/` do domínio de captação, ex.: `cotacao.mxseguros.com.br`)
- Hero navy: eyebrow "Seguros para empresas · desde 2002", H1 "Proteção para a sua empresa, com gente de verdade do outro lado", parágrafo listando os seis produtos PJ e a promessa ("um consultor entra em contato pelo WhatsApp em até 1 dia útil"), três provas (anos, seguradoras, prazo), selo.
- Cartão do formulário (branco, flutuando sobre o hero): Nome, Sobrenome, WhatsApp (+55, máscara), E-mail, produto (opcional), checkbox de consentimento com link para a Política de Privacidade, botão "Quero minha cotação", nota de privacidade.
- Validação no cliente e no servidor: nome/sobrenome não vazios, telefone com 11 dígitos, e-mail válido, consentimento marcado. Mensagens junto ao campo.
- Estado de sucesso substitui o formulário: "Recebemos, {nome}!" + botão "Chamar no WhatsApp" (wa.me do número comercial com texto pré-preenchido) + "Enviar outro pedido".
- Abaixo: três diferenciais, lista dos seis seguros PJ (Auto, Frota, Transporte, Consórcio, Saúde, Vida em Grupo), rodapé com logo, razão social e SUSEP.
- SEO: título e H1 orientados a "seguro para empresas", "seguro frota", "seguro de transporte"; uma variação da landing por produto (`/frota`, `/transporte`…) com o mesmo formulário e `origem` diferente fica no backlog da Sprint 1.
- Parâmetros UTM e `origem` capturados da URL e enviados junto com o lead.
- Performance: LCP < 2,5 s no 4G; fontes com `display=swap`; imagens do logo em SVG/PNG otimizado.

### 5.2 Widget (`widget.js`)
- Instalação: `<script src="https://leads.mxseguros.com.br/widget.js" data-origem="site-seguro-auto" data-modo="flutuante|inline" data-produto="Auto"></script>`.
- **Flutuante:** botão fixo no canto inferior direito ("Falar com um consultor", com ícone WhatsApp) que abre um pop-over de 340px com o formulário compacto. Fecha com ✕ ou Esc.
- **Inline:** renderiza o formulário dentro de `<div id="mx-leads"></div>` na página, herdando a largura do container.
- Renderizado em Shadow DOM para não herdar/vazar CSS do site. Fontes carregadas pelo próprio widget.
- Sucesso: mensagem curta + botão WhatsApp; o pop-over fecha sozinho após 6 s.
- Anti-spam: campo honeypot oculto + Cloudflare Turnstile invisível + rate limit por IP na API.

### 5.3 Admin — Esteira (board) (`/app`)
- Layout: sidebar navy (232px) com navegação (Esteira, Contatos v2, Relatórios v2, Landing, Widget, Configurações) e usuário logado; conteúdo com topbar (título, contagem, alternância Board/Lista, busca, "Novo lead"), linha de filtros (Produto, Responsável, Origem, Limpar), faixa de 4 métricas, board.
- Métricas: Novos leads (7 dias) + sem responsável · Em andamento + valor em negociação · Taxa de ganho (ganhos / (ganhos + perdidos)) · Follow-ups atrasados + para hoje.
- Board: 7 colunas de 272px com rolagem horizontal; ordem dos cartões por próxima ação (atrasados primeiro) e depois por data de criação.
- Drag & drop (HTML5 na v1; `@dnd-kit` na implementação React para suporte a toque e teclado). Soltar em Perdido / Contato posterior / Ganhou abre o modal correspondente antes de confirmar.
- Busca filtra por nome, telefone, e-mail e produto; filtros combinam com a busca; estado dos filtros na URL (`?q=&produto=&resp=&origem=`).
- "+" no cabeçalho da coluna e "Novo lead" abrem o modal de cadastro manual (mesmos 4 campos + produto, origem, responsável).

### 5.4 Admin — Ficha do lead (drawer)
- Cabeçalho: iniciais, nome completo, origem, "criado há X", responsável, fechar.
- Ações: WhatsApp (`wa.me/55{tel}?text=` com template configurável), E-mail (`mailto:`), Ligar (`tel:`).
- Avisos contextuais: follow-up atrasado; lead novo sem responsável.
- Fase: 7 botões-pílula; muda a fase com as mesmas regras do drag.
- Contato: nome, sobrenome, WhatsApp, e-mail. Oportunidade: produto, responsável, valor estimado (R$/ano), origem, próxima ação (texto) + data. Condicionais: motivo da perda (Perdido), retomar em (Contato posterior).
- Histórico: nota rápida (textarea + "Adicionar nota") e timeline reversa com eventos de sistema (criação, atribuição, próxima ação), movimentações e notas.
- Rodapé: "Excluir lead" (somente gestor, com confirmação e auditoria) e indicação de salvamento automático.

### 5.5 Admin — Lista
- Tabela com Nome, WhatsApp, E-mail, Produto, Fase (chip), Responsável, Próxima ação, Criado, Origem. Ordenação por clique no cabeçalho; mesmos filtros/busca do board; clique na linha abre a ficha. Botão "Exportar CSV" respeita os filtros ativos.

### 5.6 Configurações (v1 mínima)
- Equipe (convidar por e-mail, papel consultor/gestor), número comercial de WhatsApp e template da mensagem, motivos de perda (lista editável), produtos (seed: Auto, Frota, Transporte, Consórcio, Saúde, Vida em Grupo), origens, texto de consentimento LGPD e link da política.

### 5.7 Máscaras e validação dos formulários (landing, widget, cadastro manual e ficha)

Regra geral: máscara aplicada enquanto a pessoa digita; validação exibida só depois que o campo é abandonado (blur) ou no envio — nunca em vermelho no primeiro caractere. Campo válido ganha borda verde e um check; inválido, borda vermelha e a mensagem logo abaixo, em português direto e sem culpar a pessoa. O primeiro campo inválido recebe foco no envio. As mesmas regras rodam no servidor (zod) — o cliente é conveniência, o servidor é a autoridade.

| Campo | Máscara (enquanto digita) | Validação | Mensagens |
|---|---|---|---|
| Nome / Sobrenome | Só letras (com acentos), espaço, hífen e apóstrofo; capitalização automática ("ana maria" → "Ana Maria"); espaços duplos removidos; máx. 60 | Obrigatório; mínimo 2 letras | "Campo obrigatório." · "Use pelo menos 2 letras." |
| WhatsApp | `(11) 99999-9999`; aceita colar com +55, espaços ou pontos; `inputmode="tel"`; máx. 11 dígitos | 11 dígitos; DDD existente (lista oficial da Anatel); 3º dígito = 9 (celular); rejeita sequências repetidas (99999-9999) | "Informe o WhatsApp com DDD." · "Falta 1 dígito / Faltam N dígitos — use DDD + 9 números." · "DDD inválido." · "Celular precisa começar com 9 depois do DDD." |
| E-mail | Minúsculas, sem espaços; `autocapitalize=off`; máx. 120 | Formato `nome@dominio.tld`; alerta de domínio com erro de digitação comum (gmail.con, hotmail.con, outlook.con, gmai.com…) | "Informe um e-mail." · "E-mail incompleto — ex.: nome@empresa.com.br" · "Você quis dizer @gmail.com?" |
| Consentimento LGPD | — | Obrigatório | Texto e checkbox ficam vermelhos até marcar |
| Produto | — | Opcional, lista fechada | — |

Armazenamento: telefone salvo só com dígitos (`11999990000`), e-mail em minúsculas, nomes com espaços aparados. Na ficha do admin, um valor inválido não é salvo — o campo mostra o erro e mantém o valor anterior no banco. Acessibilidade: `aria-invalid` no campo, mensagem associada por proximidade (v1) e por `aria-describedby` na implementação React.

---

## 6. Regras da esteira

| Fase | Entrada | Saídas | Obrigatório ao entrar | Automação |
|---|---|---|---|---|
| Clientes potenciais | Formulário / widget / manual | Qualquer | — | Cria próxima ação "1º contato" para D+1 útil; alerta se sem responsável |
| Reunião | Manual | Qualquer | Data da próxima ação | — |
| Acompanhamento | Manual | Qualquer | Data da próxima ação | — |
| Negociação | Manual | Qualquer | Valor estimado | Soma aparece no rodapé da coluna |
| Ganhou | Manual | Reabrir → Acompanhamento | Prêmio anual; seguradora (opcional) | Limpa próxima ação |
| Perdido | Manual | Reabrir → Clientes potenciais | Motivo | Limpa próxima ação |
| Contato posterior | Manual | Volta automática | Data de retomada | No dia, job move para "Clientes potenciais", cria próxima ação "Retomar contato" e notifica o responsável |

Outras regras: um lead está sempre em exatamente uma fase; toda mudança gera evento no histórico com autor e timestamp; leads duplicados (mesmo telefone ou e-mail em 30 dias) não criam cartão novo — registram evento "Novo pedido pelo formulário" no lead existente e o trazem para o topo; "Desfazer" fica disponível por 6 s após mover.

---

## 7. Modelo de dados (Supabase / PostgreSQL)

```sql
create type lead_stage as enum ('potenciais','reuniao','acompanhamento','negociacao','ganhou','perdido','posterior');
create type user_role as enum ('gestor','consultor');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  initials text generated always as (upper(left(split_part(full_name,' ',1),1) || left(split_part(full_name,' ',2),1))) stored,
  role user_role not null default 'consultor',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table lead_sources (id serial primary key, slug text unique not null, label text not null);           -- landing, widget-flutuante, widget-inline, indicacao, instagram, manual
create table products (id serial primary key, label text unique not null, active boolean default true);      -- Auto, Frota, Transporte, Consórcio, Saúde, Vida em Grupo
create table lost_reasons (id serial primary key, label text unique not null, active boolean default true);

create table leads (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  phone text not null check (phone ~ '^[0-9]{11}$'),          -- DDD + 9 dígitos, sem +55
  email citext not null,
  product_id int references products(id),
  source_id int references lead_sources(id) not null,
  source_detail text,                                          -- data-origem do widget / página
  utm jsonb,
  stage lead_stage not null default 'potenciais',
  owner_id uuid references profiles(id),
  estimated_value numeric(12,2),
  next_action_label text,
  next_action_at date,
  lost_reason_id int references lost_reasons(id),
  resume_at date,
  consent_at timestamptz not null,                             -- LGPD
  consent_text_version text not null,
  consent_ip inet,
  won_at timestamptz, lost_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index on leads (stage) where deleted_at is null;
create index on leads (owner_id, next_action_at) where deleted_at is null;
create index on leads (phone); create index on leads (email);

create type event_type as enum ('created','stage_changed','note','assigned','next_action','field_changed','duplicate_submission','system');
create table lead_events (
  id bigserial primary key,
  lead_id uuid not null references leads(id) on delete cascade,
  type event_type not null,
  actor_id uuid references profiles(id),                       -- null = sistema / formulário
  payload jsonb not null default '{}',                          -- {from,to,reason,resume_at,text,...}
  created_at timestamptz not null default now()
);
create index on lead_events (lead_id, created_at desc);

create table settings (key text primary key, value jsonb not null);  -- whatsapp_number, wa_template, consent_text, sla_hours
```

**RLS:** `profiles`, `leads`, `lead_events` legíveis/escrevíveis apenas por usuários autenticados com perfil ativo; `delete` em `leads` apenas `role = 'gestor'` (soft delete via `deleted_at`). A inserção pública de leads **não** passa pelo cliente Supabase — passa pela API com service role, após validação e anti-spam.

**Views úteis:** `v_pipeline_metrics` (contagens por fase, atrasados, taxa de ganho 30/90 dias), `v_leads_board` (leads ativos com campos derivados: `is_late`, `is_today`, `age_days`).

---

## 8. API

Base: `/api/v1` (Next.js Route Handlers; ver §9 para a alternativa FastAPI).

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| POST | `/leads/public` | Turnstile + rate limit | Captura pública (landing/widget). Body: `first_name,last_name,phone,email,product?,source,source_detail?,utm?,consent:true,hp?`. Retorna `201 {id}` ou `200 {id, duplicate:true}`. |
| GET | `/leads` | sessão | Lista com filtros `stage,q,product,owner,source,sort`. |
| POST | `/leads` | sessão | Cadastro manual. |
| GET | `/leads/:id` | sessão | Lead + eventos. |
| PATCH | `/leads/:id` | sessão | Campos editáveis; gera `field_changed`/`assigned`/`next_action`. |
| POST | `/leads/:id/stage` | sessão | `{to, reason?, resume_at?, value?, insurer?}` — valida regras da fase (§6). |
| POST | `/leads/:id/notes` | sessão | `{text}`. |
| DELETE | `/leads/:id` | gestor | Soft delete + evento. |
| GET | `/metrics` | sessão | Faixa de métricas. |
| GET | `/export.csv` | sessão | Respeita filtros. |
| GET | `/widget.js` | público | Script do widget (cache 1h). |

Erros em JSON `{error:{code,message,field?}}`; mensagens em português prontas para exibição.

---

## 9. Arquitetura

**Recomendação v1 — monólito Next.js + Supabase** (produto separado do DRE-IA, mas com a mesma família de stack para reaproveitar padrões e conhecimento):

- **Next.js 15 (App Router) + React 19 + TypeScript + Tailwind** — três superfícies no mesmo projeto: landing (`/`), admin (`/app/*`, protegido) e API (`/api/v1/*`). Deploy na Vercel.
- **Supabase** — Postgres, Auth (e-mail + magic link para a equipe), RLS, Storage (futuro: anexos), `pg_cron` para o job de retomada de "Contato posterior" e alertas de SLA.
- **Widget** — bundle independente (`packages/widget`, Preact + Shadow DOM, < 25 kB gz) servido por `/widget.js`.
- **Anti-spam** — Cloudflare Turnstile, honeypot, rate limit (Upstash Redis ou `@vercel/kv`).
- **Notificações v1** — e-mail transacional (Resend) para "novo lead sem responsável há 2 h" e "retomada hoje"; WhatsApp continua via deep link `wa.me` (sem API oficial na v1).
- **Observabilidade** — Sentry (front e API), logs estruturados, painel de saúde do formulário (envios/dia, falhas de Turnstile).
- **LGPD** — consentimento versionado e registrado com IP/data; política de retenção (leads perdidos anonimizados após 24 meses, configurável); endpoint interno para exclusão a pedido do titular; sem dados sensíveis (não coletamos CPF nem CNPJ no formulário público; CNPJ entra na ficha do admin apenas se a MX precisar para a cotação).

**Alternativa:** manter FastAPI (Python 3.12) como backend, como no DRE-IA, se a MX quiser unificar backends ou usar Claude API para qualificar leads (v2: resumo da conversa, sugestão de produto). Nesse caso, o Next.js consome a API e o widget aponta para o domínio do FastAPI. A decisão pode ser adiada: o contrato da API (§8) é o mesmo.

**Domínios:** `cotacao.mxseguros.com.br` (landing), `leads.mxseguros.com.br` (admin + API + widget).

---

## 10. Roadmap em sprints (2 semanas cada)

### Sprint 0 — Fundamentos (setup)
- Repositório `mx-leads` (monorepo: `apps/web`, `packages/widget`, `supabase/`), CI (lint, typecheck, testes), ambientes dev/prod na Vercel e Supabase.
- Migrations do §7, seeds (produtos, origens, motivos), RLS, view de métricas.
- Design tokens (§4) como CSS variables + config do Tailwind; componentes base (Button, Input, Chip, Avatar, Drawer, Modal, Toast) com Storybook leve.
- Auth da equipe (magic link), perfis e papéis.

### Sprint 1 — Captura
- Landing page completa (SEO básico, UTM, consentimento versionado, sucesso com WhatsApp).
- `POST /leads/public` com validação (zod), Turnstile, honeypot, rate limit, dedupe 30 dias.
- Widget flutuante e inline com Shadow DOM; página de instalação/documentação.
- E-mail de notificação "novo lead" para o gestor.
- **Entrega:** MX já pode receber leads reais em produção (admin ainda em lista simples).

### Sprint 2 — Esteira
- Board com 7 colunas, cartões, drag & drop (`@dnd-kit`, toque + teclado), contadores e somas.
- Ficha do lead (drawer) com edição inline, ações WhatsApp/E-mail/Ligar, histórico e notas.
- Modais de Perdido / Contato posterior / Ganhou com as regras do §6; toast com Desfazer.
- Cadastro manual; busca e filtros na URL.

### Sprint 3 — Operação
- Faixa de métricas; visão Lista com ordenação e exportação CSV.
- `pg_cron`: retomada automática de "Contato posterior"; alerta de SLA (lead sem responsável há 2 h, follow-up atrasado no início do dia).
- Configurações (equipe, WhatsApp/template, motivos, produtos, origens, texto LGPD).
- Tema escuro, acessibilidade (auditoria axe, navegação por teclado), responsivo (board com rolagem por coluna no celular).

### Sprint 4 — Polimento e lançamento
- Testes E2E (Playwright) dos fluxos críticos: captura → cartão → mover → ganhar/perder.
- Observabilidade (Sentry, logs), backup e política de retenção.
- Treinamento da equipe MX (30 min) e checklist de go-live; substituição dos formulários atuais do site pelo widget inline.

**v2 (backlog):** WhatsApp Business API (envio do 1º contato automático), integração com o MX DRE-IA (lead ganho → receita prevista), qualificação com IA (resumo e sugestão de produto a partir das notas), relatórios de funil por origem/consultor, multi-tenant para outras corretoras.

---

## 11. Riscos e decisões em aberto

| Item | Risco / dúvida | Proposta |
|---|---|---|
| Spam no formulário público | Volume de lixo polui o board | Turnstile + honeypot + rate limit já na Sprint 1; coluna "Clientes potenciais" mostra origem para triagem rápida |
| WhatsApp sem API oficial | Contato depende do consultor clicar | Aceitável na v1 (deep link com template); API oficial na v2 |
| Fases fixas | Equipe pode pedir fases novas | Manter fixas na v1; coletar demanda por 60 dias antes de abrir customização |
| Volume de leads antigos | Board cheio de "Contato posterior" | Coluna ordenada por data de retomada; colapsar colunas terminais (opção "mostrar só ativos") |
| Duplicidade | Mesma pessoa pede várias vezes | Dedupe por telefone/e-mail em 30 dias (evento no lead existente) |
| Backend | Next.js Route Handlers vs FastAPI | Decidir na Sprint 0; contrato da API independe da escolha |
| Domínio e DNS | Depende da MX | Solicitar acesso ao registrador na Sprint 0 |

---

## 12. Como usar este documento com o Claude Code

1. Criar o repositório e colar este arquivo em `docs/PLANEJAMENTO.md`; criar `CLAUDE.md` apontando para ele e para os tokens de design.
2. Executar Sprint 0 por tarefa: "Crie as migrations do §7 em `supabase/migrations`, com RLS descrita, e um seed", "Implemente os componentes base do §4.4 com os tokens", etc.
3. Usar o protótipo como referência visual: cada tela do §5 tem correspondência direta (Landing, Widget, Admin/Esteira, Guia visual). Quando houver dúvida de layout, o protótipo vence o texto.
4. Critérios de aceite de cada sprint estão nas listas do §10; pedir ao Claude Code testes E2E (Playwright) que reproduzam os fluxos do §2.
