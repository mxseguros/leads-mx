-- MX Leads — visoes derivadas
-- Referencia: Docs/MX-Leads-Planejamento-v0.3.md §7
--
-- Lacuna 08: a view e a UNICA fonte da taxa de ganho e dos campos derivados.
-- A rota GET /metrics apenas le daqui — dois calculos sempre divergem, e a
-- discussao vira "qual numero esta certo?" em vez de "por que perdemos?".
--
-- security_invoker = on e obrigatorio: sem isso a view roda como dona e
-- devolve TODAS as linhas, furando a RLS por baixo.

-- ---------------------------------------------------------------------------
-- "Hoje" e o hoje de Sao Paulo, nao o do servidor.
-- Sem isto, um follow-up vira "atrasado" as 21h do dia anterior.
-- ---------------------------------------------------------------------------
create or replace function local_today()
returns date
language sql
stable
as $$
  select (now() at time zone 'America/Sao_Paulo')::date;
$$;

-- ---------------------------------------------------------------------------
-- Cartoes do board
-- ---------------------------------------------------------------------------
create view v_leads_board
with (security_invoker = on)
as
select
  l.id,
  l.first_name,
  l.last_name,
  l.first_name || ' ' || l.last_name          as full_name,
  l.phone,
  l.email,
  l.company,
  l.stage,
  l.owner_id,
  p.full_name                                  as owner_name,
  p.initials                                   as owner_initials,
  pr.label                                     as product_label,
  s.slug                                       as source_slug,
  s.label                                      as source_label,
  l.source_detail,
  l.estimated_value,
  l.won_value,
  l.insurer,
  l.next_action_label,
  l.next_action_at,
  lr.label                                     as lost_reason_label,
  l.resume_at,
  l.created_at,

  -- Derivados. O cartao le daqui em vez de recalcular no cliente.
  (l.next_action_at is not null and l.next_action_at <  local_today()) as is_late,
  (l.next_action_at is not null and l.next_action_at =  local_today()) as is_today,
  (local_today() - l.created_at::date)                                 as age_days,
  (l.owner_id is null)                                                 as is_unassigned,
  (l.stage in ('ganhou', 'perdido', 'posterior'))                      as is_terminal
from leads l
left join profiles     p  on p.id  = l.owner_id
left join products     pr on pr.id = l.product_id
left join lead_sources s  on s.id  = l.source_id
left join lost_reasons lr on lr.id = l.lost_reason_id
where l.deleted_at is null;

-- ---------------------------------------------------------------------------
-- Faixa de metricas (§5.3)
-- ---------------------------------------------------------------------------
create view v_pipeline_metrics
with (security_invoker = on)
as
with base as (
  select * from leads where deleted_at is null
)
select
  -- Novos leads (7 dias) + sem responsavel
  count(*) filter (
    where created_at >= now() - interval '7 days'
  )::int                                                              as new_7d,
  count(*) filter (
    where owner_id is null and stage not in ('ganhou', 'perdido')
  )::int                                                              as unassigned,

  -- Em andamento + valor em negociacao
  count(*) filter (
    where stage in ('potenciais', 'reuniao', 'acompanhamento', 'negociacao')
  )::int                                                              as active,
  coalesce(sum(estimated_value) filter (where stage = 'negociacao'), 0) as negotiating_value,

  -- Taxa de ganho: 30 e 90 dias, pela data de fechamento
  count(*) filter (where won_at  >= now() - interval '30 days')::int  as won_30d,
  count(*) filter (where lost_at >= now() - interval '30 days')::int  as lost_30d,
  count(*) filter (where won_at  >= now() - interval '90 days')::int  as won_90d,
  count(*) filter (where lost_at >= now() - interval '90 days')::int  as lost_90d,

  -- Follow-ups atrasados + para hoje
  count(*) filter (
    where next_action_at < local_today()
      and stage not in ('ganhou', 'perdido')
  )::int                                                              as late,
  count(*) filter (
    where next_action_at = local_today()
      and stage not in ('ganhou', 'perdido')
  )::int                                                              as due_today
from base;

-- ---------------------------------------------------------------------------
-- Contagem por fase, para o cabecalho das colunas
-- ---------------------------------------------------------------------------
create view v_stage_counts
with (security_invoker = on)
as
select
  s.stage,
  count(l.id)::int                                                as total,
  count(l.id) filter (where l.next_action_at < local_today())::int as late,
  coalesce(sum(l.estimated_value), 0)                             as estimated_total
from unnest(enum_range(null::lead_stage)) as s(stage)
left join leads l on l.stage = s.stage and l.deleted_at is null
group by s.stage;
