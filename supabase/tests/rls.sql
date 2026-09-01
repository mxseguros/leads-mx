-- MX Leads — teste de RLS que prova a NEGATIVA
-- Item F0-6 do plano. Politica escrita e nao testada e politica que nao existe.
--
-- Como rodar (precisa da dependencia E3, o projeto Supabase):
--   corepack pnpm teste:rls
-- ou direto:
--   psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/rls.sql
--
-- Roda inteiro dentro de uma transacao e faz rollback: nao deixa lixo no banco.
-- Qualquer falha aborta com exit code diferente de zero, porque cada
-- verificacao levanta exception em vez de imprimir aviso.

\set ON_ERROR_STOP on

begin;

-- ---------------------------------------------------------------------------
-- Fixtures. Criadas como superusuario, que ignora RLS de proposito:
-- o teste precisa de linhas EXISTINDO para provar que anon nao as ve.
-- ---------------------------------------------------------------------------
insert into auth.users (id, email, aud, role, raw_user_meta_data, created_at, updated_at)
values
  ('11111111-1111-1111-1111-111111111111', 'consultor.teste@mxseguros.com.br',
   'authenticated', 'authenticated', '{"full_name":"Carla Souza"}'::jsonb, now(), now()),
  ('22222222-2222-2222-2222-222222222222', 'gestor.teste@mxseguros.com.br',
   'authenticated', 'authenticated', '{"full_name":"Marcos Lima","role":"gestor"}'::jsonb, now(), now()),
  ('33333333-3333-3333-3333-333333333333', 'desligado.teste@mxseguros.com.br',
   'authenticated', 'authenticated', '{"full_name":"Rafael Antigo"}'::jsonb, now(), now());

-- O trigger on_auth_user_created ja criou os perfis. Ajusta o desligado.
update profiles set active = false
where id = '33333333-3333-3333-3333-333333333333';

insert into leads (
  id, first_name, last_name, phone, email,
  source_id, consent_at, consent_text_version
)
values (
  '99999999-9999-9999-9999-999999999999',
  'Empresa', 'Teste', '11999990000', 'contato@empresateste.com.br',
  (select id from lead_sources where slug = 'landing'),
  now(), '2026-09-01'
);

-- ---------------------------------------------------------------------------
-- Helper: falha alto e claro
-- ---------------------------------------------------------------------------
create or replace function pg_temp.exigir(condicao boolean, mensagem text)
returns void language plpgsql as $$
begin
  if not condicao then
    raise exception 'RLS FALHOU: %', mensagem;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 1. anon nao le nada. Este e o teste que o plano chama de "prova da negativa".
-- ---------------------------------------------------------------------------
set local role anon;
do $$
declare n int;
begin
  begin
    select count(*) into n from public.leads;
  exception when insufficient_privilege then
    n := 0;  -- barrado no grant, tambem aprovado
  end;
  perform pg_temp.exigir(n = 0, format('anon leu %s lead(s); deveria ler 0', n));
end $$;

do $$
declare n int;
begin
  begin
    select count(*) into n from public.lead_events;
  exception when insufficient_privilege then
    n := 0;
  end;
  perform pg_temp.exigir(n = 0, format('anon leu %s evento(s); deveria ler 0', n));
end $$;

-- anon tambem nao escreve: a captura publica passa pela API com service role.
do $$
declare inseriu boolean := false;
begin
  begin
    insert into public.leads (first_name, last_name, phone, email, source_id,
                             consent_at, consent_text_version)
    values ('Invasor', 'Anonimo', '11988887777', 'x@y.com', 1, now(), 'v');
    inseriu := true;
  exception when others then
    inseriu := false;
  end;
  perform pg_temp.exigir(not inseriu, 'anon conseguiu inserir lead direto na tabela');
end $$;
reset role;

-- ---------------------------------------------------------------------------
-- 2. authenticated sem sessao (auth.uid() nulo) tambem nao le
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{}';
do $$
declare n int;
begin
  select count(*) into n from public.leads;
  perform pg_temp.exigir(n = 0, format('authenticated sem sub leu %s lead(s)', n));
end $$;
reset role;

-- ---------------------------------------------------------------------------
-- 3. perfil DESLIGADO nao le. Desligar alguem tem que cortar o acesso.
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';
do $$
declare n int;
begin
  select count(*) into n from public.leads;
  perform pg_temp.exigir(n = 0, format('perfil inativo leu %s lead(s)', n));
end $$;
reset role;

-- ---------------------------------------------------------------------------
-- 4. consultor ATIVO le, mas nao apaga
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
do $$
declare n int;
begin
  select count(*) into n from public.leads;
  perform pg_temp.exigir(n = 1, format('consultor ativo leu %s lead(s); esperado 1', n));
end $$;

do $$
declare apagou int;
begin
  delete from public.leads where id = '99999999-9999-9999-9999-999999999999';
  apagou := coalesce((select count(*) from public.leads
                      where id = '99999999-9999-9999-9999-999999999999'), 0);
  -- Sem politica de delete para consultor, o delete nao atinge nenhuma linha.
  perform pg_temp.exigir(apagou = 1, 'consultor conseguiu apagar lead');
end $$;
reset role;

-- ---------------------------------------------------------------------------
-- 5. gestor apaga
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
do $$
declare sobrou int;
begin
  delete from public.leads where id = '99999999-9999-9999-9999-999999999999';
  select count(*) into sobrou from public.leads
   where id = '99999999-9999-9999-9999-999999999999';
  perform pg_temp.exigir(sobrou = 0, 'gestor NAO conseguiu apagar lead');
end $$;
reset role;

-- ---------------------------------------------------------------------------
-- 6. As views nao furam a RLS (security_invoker = on)
-- ---------------------------------------------------------------------------
insert into leads (first_name, last_name, phone, email, source_id,
                   consent_at, consent_text_version)
values ('Outra', 'Empresa', '11977776666', 'outra@empresa.com.br',
        (select id from lead_sources where slug = 'landing'), now(), '2026-09-01');

set local role anon;
do $$
declare n int;
begin
  begin
    select count(*) into n from public.v_leads_board;
  exception when insufficient_privilege then
    n := 0;
  end;
  perform pg_temp.exigir(n = 0, format('anon leu %s linha(s) de v_leads_board', n));
end $$;
reset role;

rollback;

\echo 'RLS ok: anon, sessao vazia e perfil desligado nao leem; consultor le e nao apaga; gestor apaga; views respeitam a politica.'
