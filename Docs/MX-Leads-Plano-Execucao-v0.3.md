# MX Leads — Plano de Execução

**Versão:** 0.3 · **Data:** 01/09/2026 · **Base:** `Docs/MX-Leads-Planejamento-v0.3.md` e `Docs/MX-Leads-Prototipo-v0.3.html`
**Referências `§`** apontam para o planejamento. **Painel navegável:** https://claude.ai/code/artifact/1ad95667-6377-4d99-ab8c-949b8e4594f6

5 fases de 2 semanas · 10 semanas · 69 itens · 3 marcos com a MX.

| Fase | Semanas | Entrega | Marco |
|---|---|---|---|
| 0 — Fundação | 1–2 | Banco, tokens, auth, CI | Consultor entra e vê a esteira vazia |
| 1 — Captura | 3–4 | Landing, API pública, widget | **MX recebe lead real em produção** |
| 2 — Esteira | 5–6 | Board, ficha, regras de fase | **Equipe opera no sistema, não na planilha** |
| 3 — Operação | 7–8 | Métricas, lista, jobs, config | **Gestor enxerga o funil sozinho** |
| 4 — Lançamento | 9–10 | E2E, observabilidade, cutover | Formulários do site substituídos |

A ordem não é negociável: tokens e banco sustentam a captura, a captura alimenta a esteira, a esteira precede qualquer medição. Sob pressão de prazo, o que se move é a Fase 3 — nunca a 1.

---

## Semana 0 — destravar

Turnstile, DNS, Resend, número de WhatsApp e consentimento aprovado são pré-requisitos da Fase 1 e não dependem de programar — dependem de alguém da MX responder. Pedidos na semana 3 viram duas semanas de atraso.

### Decisões (cada uma muda código)

- [ ] **D1 · Backend: Route Handlers ou FastAPI** (§9, §11). *Recomendação: Route Handlers no próprio Next.js* — um deploy, um typecheck, o mesmo zod no cliente e no servidor. FastAPI só se a qualificação por IA da v2 virar prioridade agora; o contrato do §8 mantém a porta aberta sem custo.
- [ ] **D2 · O que fazer com o código do produto anterior.** 50 arquivos rastreados apagados e não commitados (planilha, carteira, score). Commitar a remoção como marco de recomeço preserva histórico e limpa a árvore. Decidir antes do primeiro commit da Fase 0.
- [ ] **D3 · Empresa e CNPJ na ficha: v1 ou v1.1** (§3.1). Independente da resposta, criar as colunas na primeira migration.
- [ ] **D4 · Landings por produto entram na v1?** (§5.1). Se sim, a landing nasce parametrizada por produto na Fase 1.
- [ ] **D5 · Prêmio anual é campo novo ou sobrescreve o estimado** (§6, §7). Ver lacuna 02.
- [ ] **D6 · Idioma de código: inglês no banco, português na tela.** Fixar no `CLAUDE.md` antes de gerar código.

### Dependências externas (prazo: fim da semana 1)

- [ ] **E1 · Acesso ao registrador do domínio** — `cotacao.` e `leads.mxseguros.com.br`. Bloqueia o go-live da Fase 1.
- [ ] **E2 · Conta Cloudflare e chaves do Turnstile** — site key e secret.
- [ ] **E3 · Projetos Supabase (dev e prod), Vercel e Redis do rate limit** — Upstash ou Vercel KV.
- [ ] **E4 · Número comercial de WhatsApp e texto da 1ª mensagem** — quem escreve é a MX.
- [ ] **E5 · Texto de consentimento LGPD e URL da política** (§9) — aprovado pelo jurídico. É versionado e gravado por lead; mudar depois não corrige o que já foi coletado.
- [ ] **E6 · Domínio verificado no Resend** — a verificação de DNS leva horas ou dias.
- [ ] **E7 · Lista de e-mails da equipe com papéis** — define convites e RLS.
- [ ] **E8 · Logos MX em SVG** — lockup claro e navy, monograma, selo "desde 2002".

---

## Fase 0 — Fundação · semanas 1–2

**Marco:** um consultor entra por magic link e vê a esteira vazia.

- [ ] Monorepo `mx-leads` (§9): `apps/web`, `packages/widget`, `supabase/` em workspaces pnpm, `engines: node >=20.9`.
- [ ] CI bloqueando merge: lint, typecheck, testes, build a cada PR.
- [ ] Ambientes dev e prod separados na Vercel e no Supabase. Service role key só no servidor, nunca em `NEXT_PUBLIC_*`.
- [ ] Migration inicial (§7): extensões `pgcrypto` e `citext`, enums `lead_stage`/`user_role`/`event_type`, tabelas, índices parciais, colunas das lacunas 01–03.
- [ ] Seeds: 6 produtos, origens (landing, widget-flutuante, widget-inline, indicacao, instagram, manual), motivos de perda.
- [ ] RLS **com teste que prova a negativa**: leitura/escrita só para perfil ativo autenticado, `delete` só gestor. Política não testada é política que não existe.
- [ ] Views `v_pipeline_metrics` e `v_leads_board` (`is_late`, `is_today`, `age_days`) — fonte única (lacuna 08).
- [ ] Tokens de design nos três estados de tema (§4.1), copiados do `:root` do protótipo. Nenhuma cor definida só dentro de um bloco de tema.
- [ ] Manrope + IBM Plex Sans com `display=swap` (§4.2); escala 52/34/22/19/15/14/13/12/11; `tabular-nums` em telefone, valor e data.
- [ ] Componentes base (§4.4): Button, Input com máscara, Chip, Avatar, Drawer, Modal, Toast — com o anel de foco de 3px.
- [ ] Auth por magic link, `profiles` por trigger no primeiro login, papéis consultor/gestor.
- [ ] Middleware de sessão que **não lança**: falha de auth redireciona para `/entrar`. Um `throw` no middleware derruba todas as rotas — já aconteceu neste repositório.
- [ ] Base sintética de dev cobrindo as 7 fases, atrasados, sem responsável e duplicados.
- [ ] `CLAUDE.md` apontando para os documentos, tokens e a regra da D6.

**Portão de aceite:** CI verde no `main`; usuário de teste alcança `/app` por magic link e sem sessão é redirecionado (não 500); consulta a `leads` sem sessão negada pela RLS em teste automatizado; a mesma tela correta nos três estados de tema.

---

## Fase 1 — Captura · semanas 3–4

**Marco: a MX recebe lead real em produção.** O admin ainda é uma lista simples.

- [ ] Landing completa (§5.1): hero navy com selo e três provas, cartão do formulário flutuando, três diferenciais, os seis seguros PJ, rodapé com razão social e SUSEP.
- [ ] Quatro campos com as máscaras do §5.7: capitalização automática, `(11) 99999-9999`, DDD conferido contra a lista da Anatel, 3º dígito 9, sugestão para `gmail.con` e parentes. Erro só depois do blur.
- [ ] **Um único schema zod** para cliente e servidor. Duas cópias divergem em menos de um mês.
- [ ] UTM e origem da URL, `consent_ip` do header da Vercel, `consent_text_version` gravado junto.
- [ ] `POST /api/v1/leads/public` (§8) com Turnstile invisível, honeypot e rate limit por IP. Rejeição responde erro tratado, nunca 500.
- [ ] Dedupe de 30 dias (§6): mesmo telefone ou e-mail gera evento `duplicate_submission` no lead existente, traz para o topo, devolve `200 {duplicate:true}`.
- [ ] Estado de sucesso com `wa.me` pré-preenchido e "Enviar outro pedido".
- [ ] Widget em Shadow DOM (§5.2): Preact, < 25 kB gz, flutuante e inline, `data-origem` e `data-produto`, fontes próprias.
- [ ] `/widget.js` com cache 1h e CORS, mais a página de instalação com o snippet pronto.
- [ ] Lista provisória em `/app` — sem ela a Fase 1 entrega captura e cega a equipe por duas semanas.
- [ ] E-mail de novo lead para o gestor (Resend), com link direto.
- [ ] SEO e desempenho: title/H1/description por produto, Open Graph, sitemap, `robots.txt`, logos em SVG.

**Portão de aceite:** envio real em produção cria lead e dispara e-mail; segundo envio com o mesmo telefone não cria segundo cartão; honeypot e rate limit devolvem erro tratado em português; LCP < 2,5 s em 4G simulado; widget em página com CSS agressivo mantém a aparência e não altera o site hospedeiro.

---

## Fase 2 — Esteira · semanas 5–6

**Marco: a equipe passa a trabalhar no sistema em vez da planilha.**

- [ ] Board de 7 colunas (§5.3): 272px, rolagem horizontal, cabeçalho fixo com ponto/nome/contagem/"+", corpo com rolagem própria, soma no rodapé de Negociação.
- [ ] Ordenação por urgência: atrasados primeiro, depois próxima ação, depois criação.
- [ ] Cartão do lead (§4.4): chips de produto e origem, nome e telefone, badge de próxima ação nos quatro estados, valor, avatar; sem responsável recebe avatar "?" e barra azul.
- [ ] Arrastar com `@dnd-kit` — mouse, toque e teclado. O arrasto nativo do protótipo não atende celular nem acessibilidade.
- [ ] Ficha em drawer de 460px (§5.4): WhatsApp/e-mail/ligar, seletor de 7 fases, salvamento automático, avisos de atraso e de lead sem dono, board visível atrás.
- [ ] **Regras de fase validadas no servidor** (§6): `POST /leads/:id/stage` recusa Perdido sem motivo, Contato posterior sem data, Negociação sem valor, Ganhou sem prêmio.
- [ ] Modais de Perdido, Contato posterior e Ganhou antes de confirmar o movimento (arrasto e seletor).
- [ ] Toast com Desfazer por 6 s, revertendo fase e evento.
- [ ] Histórico com eventos de sistema, movimentações e notas (autor e horário) + nota rápida.
- [ ] Cadastro manual pelo "+" da coluna e pelo "Novo lead".
- [ ] Busca e filtros no endereço: `?q=&produto=&resp=&origem=`.
- [ ] Próxima ação automática na entrada: "1º contato" para D+1 útil — sustenta a meta de 90%.

**Portão de aceite:** cartão muda de fase por mouse, toque e teclado com o mesmo resultado; chamada direta à API burlando regra é recusada em português; toda mudança no histórico com autor e horário e Desfazer reverte fase e evento; um consultor da MX usa o board um dia inteiro sem voltar à planilha.

---

## Fase 3 — Operação · semanas 7–8

**Marco: o gestor enxerga o funil inteiro sem perguntar a ninguém.** Esta é a fase que absorve atraso.

- [ ] Faixa de quatro métricas (§5.3) lida da view, não recalculada na aplicação.
- [ ] Visão Lista (§5.5): ordenação por cabeçalho, mesmos filtros, clique na linha abre a ficha.
- [ ] Exportação CSV respeitando os filtros — exportar a base inteira sempre é armadilha de LGPD.
- [ ] `pg_cron`: retomada de Contato posterior na data, criando "Retomar contato" e notificando o responsável.
- [ ] Alertas de SLA: lead sem responsável há 2h e follow-ups atrasados no começo do dia.
- [ ] Configurações (§5.6) editáveis pela MX sem deploy: equipe, WhatsApp e template, motivos, produtos, origens, texto LGPD e link.
- [ ] Exclusão restrita ao gestor: soft delete por `deleted_at`, confirmação e evento de auditoria.
- [ ] Tema escuro completo e auditoria axe; navegação por teclado no board e no drawer.
- [ ] Responsivo: board com rolagem por coluna no celular, drawer em tela cheia.

**Portão de aceite:** as quatro métricas batem com conferência manual no banco; job de retomada roda em teste com data forçada; axe sem violação crítica nas três telas nos dois temas; board operável em 390px.

---

## Fase 4 — Lançamento · semanas 9–10

**Marco: go-live — os formulários atuais do site saem e o widget inline entra.**

- [ ] Quatro fluxos E2E no Playwright (§2), no CI: captura → cartão → mover → ganhar; captura duplicada; perder com motivo; retomada de contato posterior.
- [ ] Sentry e logs estruturados no front e na API, sem dado pessoal no corpo do evento.
- [ ] Painel de saúde do formulário: envios/dia, falhas de Turnstile, taxa de erro.
- [ ] Retenção e exclusão a pedido do titular (§9): anonimização de leads perdidos após 24 meses, janela configurável — está na arquitetura e em nenhuma sprint do §10 (lacuna 05).
- [ ] Backup verificado por restore de teste. Backup nunca restaurado não é backup.
- [ ] Cutover com plano de volta: DNS, widget inline no site, caminho documentado para restaurar o formulário antigo em minutos.
- [ ] Acompanhamento nas primeiras 48 horas.
- [ ] Treinamento de 30 min e guia de uma página, com as quatro metas do §1.1.

**Portão de aceite:** os quatro E2E passam no CI; um lead de teste percorre landing → board → Ganhou em produção; rollback testado, não apenas escrito; métricas do §1.1 com baseline registrado na primeira semana.

---

## Lacunas do planejamento v0.3

As três primeiras mudam o schema e precisam entrar na Fase 0.

1. **A coluna `insurer` não existe.** O §6 pede a seguradora ao ganhar e o §8 aceita `insurer` no corpo de `POST /leads/:id/stage`, mas a tabela `leads` do §7 não tem onde guardar — o dado seria aceito e descartado em silêncio. → `insurer text`.
2. **Prêmio anual disputando espaço com o valor estimado.** "Ganhou" exige prêmio anual e o único campo é `estimated_value`, que carrega a estimativa da negociação. Sobrescrever apaga a estimativa e impede medir o quanto o funil erra. → `won_value numeric(12,2)` separado (D5).
3. **Empresa e CNPJ prometidos, não modelados.** O §3.1 promete os campos na ficha em v1.1; o §7 não prevê nenhum. → `company text` e `cnpj text` na primeira migration.
4. **Extensões do Postgres não declaradas.** `citext` e `gen_random_uuid()` exigem `create extension if not exists` para `citext` e `pgcrypto`, senão a primeira migration falha na linha um.
5. **Retenção LGPD sem sprint dona.** A anonimização após 24 meses aparece no §9 e em nenhuma sprint do §10. → Fase 4, item 4.
6. **Landings por produto dentro e fora ao mesmo tempo.** O §5.1 descreve `/frota` e `/transporte` e no mesmo parágrafo as manda para o backlog. → D4.
7. **Anti-spam depende de infraestrutura não contratada.** Turnstile e rate limit estão na Sprint 1 sem tarefa de provisionamento. → E2 e E3.
8. **Duas fontes possíveis para a taxa de ganho.** `v_pipeline_metrics` (§7) e `GET /metrics` (§8) calculam a mesma coisa. → a view é a fonte única, a rota apenas lê.

---

## Como trabalhar (vale em todas as fases)

- **Pronto quer dizer em produção.** Revisado, testado, no ar, conferido por quem não escreveu.
- **A regra mora no servidor.** Máscara e validação no cliente são conveniência; a API recusa sozinha.
- **Toda mudança de lead vira evento** com autor e horário. Sem isso o histórico mente e o Desfazer não tem o que reverter.
- **Nada de dado real em desenvolvimento.** Base sintética em dev e teste.
- **O protótipo vence o texto.** Em dúvida de layout, espaçamento ou cor, `MX-Leads-Prototipo-v0.3.html` decide — inclusive os tokens dos três temas.
- **Inglês no banco, português na tela.** Tabelas e rotas seguem §7 e §8; rótulos e erros em português direto, sem culpar quem preencheu.
