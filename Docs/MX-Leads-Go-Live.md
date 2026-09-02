# MX Leads — Go-live

Procedimento de lançamento. Itens F4-5, F4-6 e F4-7 do plano de execução.

Escrito para ser seguido por quem estiver de plantão no dia, não por quem
construiu o sistema. Cada passo diz o que fazer, o que esperar e como saber
que deu errado.

---

## Antes do dia

Nada aqui depende de código. Tudo depende de alguém da MX.

- [ ] **Turnstile** — conta Cloudflare, site adicionado, `TURNSTILE_SECRET_KEY`
      e `NEXT_PUBLIC_TURNSTILE_SITE_KEY` no ambiente de produção.
      **Sem isso a captura recusa todos os envios em produção**, por decisão
      deliberada: melhor o formulário parar e alguém ligar do que o board
      encher de spam sem ninguém perceber.
- [ ] **Upstash ou Vercel KV** — `UPSTASH_REDIS_REST_URL` e `..._TOKEN`. Sem
      eles o rate limit vive na memória do processo e não protege em serverless.
- [ ] **Projeto Supabase de produção**, separado do de desenvolvimento.
- [ ] **As seis migrations aplicadas na ordem**, no projeto novo:

      20260901120000_base
      20260901120100_rls
      20260901120200_visoes
      20260901120300_fechar_views_para_anon
      20260902100000_retomada_e_sla
      20260902140000_retencao_e_saude

      Depois `seed.sql`. **Não rode a base sintética em produção.**
- [ ] **pg_cron habilitado** e os dois jobs agendados. Confira com
      `select jobname, schedule, active from cron.job;` — espere duas linhas.
- [ ] **SMTP próprio** em Authentication → Emails, senão a equipe não entra.
- [ ] **URL Configuration** com o domínio de produção e
      `https://leads.mxseguros.com.br/auth/confirmar` na lista de redirects.
- [ ] **DNS**: `cotacao.mxseguros.com.br` e `leads.mxseguros.com.br` apontando
      para a Vercel.
- [ ] **Equipe cadastrada** com papéis, e cada pessoa com o link de acesso.

---

## F4-5 · Backup verificado

Backup que nunca foi restaurado não é backup — é uma pasta com arquivos.

1. Supabase → Database → Backups. Confirme que o plano tem backup diário.
2. **Restaure um** em um projeto descartável.
3. No projeto restaurado, rode:

   ```sql
   select count(*) from leads;
   select count(*) from lead_events;
   select count(*) from profiles;
   ```

4. Compare com a produção. Números diferentes por poucos minutos são normais;
   por ordens de grandeza, não são.
5. Apague o projeto descartável.

Anote a data do teste. Repita a cada trimestre, ou depois de qualquer
migration que mexa em tabela.

---

## F4-6 · Cutover

Faça em dia útil de manhã, nunca sexta à tarde.

**1. Suba a aplicação** e confirme, antes de mexer no DNS:

- `https://leads.mxseguros.com.br/entrar` responde
- entrar com magic link funciona
- a esteira abre vazia (produção nasce sem lead)

**2. Envie um lead de teste** pela landing de produção, com um telefone real
seu. Confirme que ele aparece na esteira em Clientes potenciais com "1º
contato" agendado. **Depois apague-o** pela ficha.

**3. Confira a saúde da captura** — a tela deve mostrar 1 tentativa e 1 lead.
Se mostrar zero, o formulário não chegou até a API e o cutover para aqui.

**4. Troque os formulários do site atual** pelo link da landing.

**5. Monitore 30 minutos** antes de considerar feito.

### Plano de volta

Se algo der errado, a reversão é **restaurar os formulários antigos do site**.
A landing continua no ar e não atrapalha ninguém; os leads capturados até o
momento ficam no banco e não se perdem.

Reverter DNS demora propagação. Reverter o formulário do site é imediato — e
por isso é o caminho de volta.

---

## F4-7 · As primeiras 48 horas

O que nenhum teste pega aparece aqui.

**Duas vezes no primeiro dia, uma no segundo**, olhe:

| Onde | O que preocupa |
|---|---|
| Saúde da captura | zero tentativas em horário comercial; erros acima de zero |
| Esteira | lead sem responsável há mais de 2h — a faixa de sinais avisa |
| Logs da Vercel | qualquer linha com `"nivel":"erro"` |
| Caixa do gestor | reclamação de quem tentou pedir cotação e não conseguiu |

**Zero tentativas é o sinal mais importante.** Significa que ninguém chegou na
landing — e aí o problema está antes do formulário: DNS, link errado no site,
ou a página fora do ar.

No terceiro dia, registre o baseline das metas do §1.1:

- % de leads com 1º contato em até 1 dia útil (meta ≥ 90%)
- % de leads ativos com próxima ação e data (meta ≥ 80%)
- % de perdidos com motivo (é obrigatório, então tem que dar 100%)
- envios ÷ visitas na landing

---

## Quando alguém disser "pararam de chegar leads"

Na ordem, do mais provável ao menos:

1. **Saúde da captura** — tem tentativa hoje?
   - **Zero**: o problema é antes do formulário. Abra a landing você mesmo.
   - **Tentativas mas nenhum lead**: veja qual coluna subiu.
2. **Turnstile alto**: a chave pode ter expirado ou o domínio mudou.
3. **Limite alto**: alguém está sendo bloqueado por rate limit — pode ser
   ataque, ou pode ser uma campanha trazendo muita gente do mesmo IP corporativo.
4. **Inválidos altos**: campo confuso no formulário. A coluna do erro diz qual.
5. **Erros acima de zero**: é falha nossa. Logs da Vercel, filtrar `"nivel":"erro"`.
