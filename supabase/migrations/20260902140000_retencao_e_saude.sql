-- MX Leads — retenção LGPD e saúde da captura
-- Itens F4-4 e F4-3. Referência: §9.

-- ===========================================================================
-- F4-4: retenção
--
-- O §9 promete anonimizar leads perdidos após 24 meses. Estava na arquitetura
-- e em nenhuma sprint — foi a lacuna 05 do plano de execução.
--
-- ANONIMIZA, não apaga. Apagar levaria junto o motivo da perda e a data, que
-- são justamente o que responde "onde estamos perdendo negócios?" no ano
-- seguinte. O que sai é o que identifica a pessoa; o que fica é o que ensina.
-- ===========================================================================
create or replace function anonimizar_leads_antigos(meses integer default 24)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  afetados integer := 0;
begin
  with alvos as (
    select id
      from leads
     where stage = 'perdido'
       and lost_at is not null
       and lost_at < now() - make_interval(months => meses)
       -- Já anonimizado não entra de novo: a função roda todo mês.
       and email not like 'anonimizado+%'
  ),
  limpos as (
    update leads l
       set first_name = 'Lead',
           last_name  = 'anonimizado',
           -- E-mail precisa ser único e válido; o id mantém a linha
           -- rastreável sem dizer quem era.
           email      = 'anonimizado+' || l.id::text || '@invalido.local',
           phone      = '00000000000',
           company    = null,
           cnpj       = null,
           consent_ip = null,
           utm        = null,
           source_detail = null
      from alvos a
     where l.id = a.id
     returning l.id
  )
  select count(*) into afetados from limpos;

  -- As notas do histórico costumam ter nome, telefone e detalhe da conversa.
  -- Manter o evento sem o conteúdo preserva a linha do tempo sem o dado.
  update lead_events e
     set payload = jsonb_build_object('anonimizado', true, 'em', now())
    from leads l
   where e.lead_id = l.id
     and l.email like 'anonimizado+%'
     and e.type = 'note'
     and e.payload ? 'text';

  return afetados;
end;
$$;

comment on function anonimizar_leads_antigos is
  'Retenção LGPD (§9): anonimiza leads perdidos há mais de N meses, preservando motivo e datas.';

/**
 * Exclusão a pedido do titular.
 *
 * Diferente da retenção: aqui a pessoa PEDIU para sumir, então some mesmo —
 * inclusive os eventos, que caem por cascade. Devolve quantos leads foram
 * apagados para quem atendeu o pedido conseguir responder.
 */
create or replace function excluir_titular(contato text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  apagados integer := 0;
  digitos text := regexp_replace(coalesce(contato, ''), '\D', '', 'g');
begin
  if coalesce(contato, '') = '' then
    raise exception 'Informe o e-mail ou o telefone do titular.';
  end if;

  with removidos as (
    delete from leads
     where email = lower(trim(contato))
        or (length(digitos) = 11 and phone = digitos)
    returning id
  )
  select count(*) into apagados from removidos;

  return apagados;
end;
$$;

comment on function excluir_titular is
  'LGPD: apaga por completo os leads de um titular que pediu exclusão (§9).';

-- ===========================================================================
-- F4-3: saúde da captura
--
-- Sem isto, "pararam de chegar leads" não tem onde ser investigado: o que a
-- rota pública recusa hoje só existe no console, e log de serverless some.
--
-- Guarda o DESFECHO, nunca o dado. Nada de nome, telefone ou e-mail — uma
-- tabela de diagnóstico não pode virar uma segunda cópia da base de leads.
-- ===========================================================================
create type capture_outcome as enum (
  'criado', 'duplicado', 'invalido', 'honeypot', 'turnstile', 'limite', 'erro'
);

create table capture_attempts (
  id bigserial primary key,
  outcome capture_outcome not null,
  -- Qual campo reprovou, para separar "erram o DDD" de "erram o e-mail".
  campo text,
  origem text,
  created_at timestamptz not null default now()
);

create index capture_attempts_tempo_idx on capture_attempts (created_at desc);

comment on table capture_attempts is
  'Só o desfecho de cada envio da captura pública (F4-3). Sem dado pessoal.';

alter table capture_attempts enable row level security;

create policy capture_attempts_select on capture_attempts
  for select to authenticated using (is_active_member());

-- A escrita vem da API com a chave secreta, que ignora RLS. Nenhuma política
-- de insert de propósito: ninguém logado precisa escrever aqui.

create view v_saude_captura
with (security_invoker = on)
as
select
  date_trunc('day', created_at at time zone 'America/Sao_Paulo')::date as dia,
  count(*)                                        ::int as tentativas,
  count(*) filter (where outcome = 'criado')      ::int as criados,
  count(*) filter (where outcome = 'duplicado')   ::int as duplicados,
  count(*) filter (where outcome = 'invalido')    ::int as invalidos,
  count(*) filter (where outcome = 'honeypot')    ::int as honeypot,
  count(*) filter (where outcome = 'turnstile')   ::int as turnstile,
  count(*) filter (where outcome = 'limite')      ::int as limite,
  count(*) filter (where outcome = 'erro')        ::int as erros
from capture_attempts
where created_at >= now() - interval '30 days'
group by 1
order by 1 desc;

revoke all on public.capture_attempts from anon;
revoke all on public.v_saude_captura  from anon;
grant select on public.v_saude_captura to authenticated;

-- ===========================================================================
-- Agendamento mensal da retenção. Dia 1 às 04:00 de São Paulo (07:00 UTC),
-- longe do horário de trabalho: a função varre a tabela inteira de leads.
-- ===========================================================================
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule('anonimizar-leads-antigos')
      where exists (select 1 from cron.job where jobname = 'anonimizar-leads-antigos');

    perform cron.schedule(
      'anonimizar-leads-antigos',
      '0 7 1 * *',
      'select anonimizar_leads_antigos(24);'
    );
  else
    raise notice 'pg_cron ausente: anonimizar_leads_antigos() existe mas nao esta agendada.';
  end if;
end $$;
