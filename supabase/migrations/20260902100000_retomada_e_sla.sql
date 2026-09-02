-- MX Leads — retomada automática de Contato posterior e sinais de SLA
-- Itens F3-4 e F3-5. Referência: §6 e §5.3.

-- ---------------------------------------------------------------------------
-- F3-4: no dia marcado, o lead volta sozinho para Clientes potenciais.
--
-- É a promessa que a fase "Contato posterior" faz para o consultor: "pode
-- esquecer, eu te lembro". Sem este job, a coluna vira um cemitério — o lead
-- fica lá parado, sem próxima ação e sem aparecer em atrasados, exatamente o
-- estado invisível que a regra de fase existe para impedir.
--
-- Idempotente: só pega quem ainda está em 'posterior' com data vencida, e ao
-- mover limpa o resume_at. Rodar duas vezes no mesmo dia não duplica nada.
-- ---------------------------------------------------------------------------
create or replace function retomar_contatos_posteriores()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  movidos integer := 0;
  registro record;
begin
  for registro in
    select id, resume_at
      from leads
     where stage = 'posterior'
       and deleted_at is null
       and resume_at is not null
       and resume_at <= local_today()
  loop
    update leads
       set stage             = 'potenciais',
           next_action_label = 'Retomar contato',
           next_action_at    = local_today(),
           resume_at         = null
     where id = registro.id;

    -- actor_id nulo marca o evento como do sistema. O histórico precisa
    -- distinguir "o job trouxe de volta" de "alguém moveu na mão".
    insert into lead_events (lead_id, type, actor_id, payload)
    values (
      registro.id,
      'stage_changed',
      null,
      jsonb_build_object(
        'from', 'posterior',
        'to', 'potenciais',
        'de', 'Contato posterior',
        'para', 'Clientes potenciais',
        'automatico', true,
        'retomada_agendada_para', registro.resume_at
      )
    );

    movidos := movidos + 1;
  end loop;

  return movidos;
end;
$$;

comment on function retomar_contatos_posteriores is
  'Job diário: devolve leads de Contato posterior à esteira na data marcada (§6).';

-- ---------------------------------------------------------------------------
-- F3-5: sinais de SLA.
--
-- O plano previa avisar por e-mail; com o e-mail fora de escopo, os sinais
-- passam a ser lidos DENTRO do admin. Esta view é a fonte deles.
--
-- security_invoker = on, como as outras: sem isso a view roda como dona e
-- devolve tudo, furando a RLS por baixo.
-- ---------------------------------------------------------------------------
create view v_sinais_sla
with (security_invoker = on)
as
select
  -- Sem responsável além do prazo. O parâmetro vive em settings.sla_hours,
  -- mas a view usa o padrão de 2h: um número aqui é melhor que um join que
  -- ninguém entende ao ler o EXPLAIN.
  count(*) filter (
    where owner_id is null
      and stage not in ('ganhou', 'perdido')
      and created_at <= now() - interval '2 hours'
  )::int as sem_dono_fora_do_prazo,

  count(*) filter (
    where next_action_at < local_today()
      and stage not in ('ganhou', 'perdido')
  )::int as follow_ups_atrasados,

  -- O mais antigo em atraso: "6 atrasados" é número, "o mais antigo espera há
  -- 9 dias" é o que faz alguém agir.
  coalesce(
    max(local_today() - next_action_at) filter (
      where next_action_at < local_today()
        and stage not in ('ganhou', 'perdido')
    ),
    0
  )::int as maior_atraso_em_dias,

  count(*) filter (
    where stage = 'posterior'
      and resume_at <= local_today()
  )::int as retomadas_pendentes
from leads
where deleted_at is null;

comment on view v_sinais_sla is
  'Sinais que o admin exibe no lugar dos alertas por e-mail (F3-5).';

revoke all on public.v_sinais_sla from anon;
grant select on public.v_sinais_sla to authenticated;

-- ---------------------------------------------------------------------------
-- Agendamento. pg_cron precisa estar habilitado no projeto:
--   Dashboard > Database > Extensions > pg_cron
--
-- 06:00 em São Paulo = 09:00 UTC. O job roda antes de a equipe abrir o
-- sistema, então o consultor já encontra o lead de volta na esteira.
--
-- O bloco não falha se a extensão não existir: a migration inteira travaria
-- por causa de um agendamento, e o resto dela é útil sem ele.
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule('retomar-contatos-posteriores')
      where exists (
        select 1 from cron.job where jobname = 'retomar-contatos-posteriores'
      );

    perform cron.schedule(
      'retomar-contatos-posteriores',
      '0 9 * * *',
      'select retomar_contatos_posteriores();'
    );
  else
    raise notice 'pg_cron nao esta habilitado: a funcao existe, mas nao ha agendamento. Habilite em Database > Extensions e rode este bloco de novo.';
  end if;
end $$;
