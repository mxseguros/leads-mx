-- MX Leads — Row Level Security
-- Referencia: Docs/MX-Leads-Planejamento-v0.3.md §7
--
-- Regra geral: nada e legivel sem sessao de um perfil ATIVO.
-- A captura publica (POST /leads/public) NAO passa por aqui: passa pela API
-- com service role, depois de validacao e anti-spam. Por isso nao existe
-- nenhuma politica para o papel anon — a ausencia e intencional.

-- ---------------------------------------------------------------------------
-- Helpers. security definer para nao entrar em recursao ao ler profiles
-- de dentro de uma politica de profiles.
-- ---------------------------------------------------------------------------
create or replace function is_active_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and active
  );
$$;

create or replace function is_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and active and role = 'gestor'
  );
$$;

-- Papel de quem esta logado. Precisa ser funcao security definer, e nao uma
-- subconsulta dentro da politica: consultar profiles de dentro de uma politica
-- DE profiles dispara "infinite recursion detected in policy".
create or replace function current_user_role()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
alter table profiles     enable row level security;
alter table leads        enable row level security;
alter table lead_events  enable row level security;
alter table products     enable row level security;
alter table lead_sources enable row level security;
alter table lost_reasons enable row level security;
alter table settings     enable row level security;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create policy profiles_select on profiles
  for select to authenticated
  using (is_active_member());

-- Cada pessoa edita o proprio nome. Papel e ativacao NAO: um consultor nao
-- se promove a gestor sozinho, e ninguem se desliga por engano.
create policy profiles_update_self on profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role = current_user_role() and active);

-- Papel e ativacao sao do gestor, nao de quem esta logado.
create policy profiles_update_manager on profiles
  for update to authenticated
  using (is_manager())
  with check (is_manager());

-- ---------------------------------------------------------------------------
-- leads
-- ---------------------------------------------------------------------------
create policy leads_select on leads
  for select to authenticated
  using (is_active_member() and deleted_at is null);

create policy leads_insert on leads
  for insert to authenticated
  with check (is_active_member());

create policy leads_update on leads
  for update to authenticated
  using (is_active_member() and deleted_at is null)
  with check (is_active_member());

-- Exclusao e do gestor. O caminho real e o soft delete (deleted_at);
-- o delete fisico fica reservado a pedido de exclusao do titular (LGPD).
create policy leads_delete_manager on leads
  for delete to authenticated
  using (is_manager());

-- ---------------------------------------------------------------------------
-- lead_events — append-only: sem update, sem delete
-- ---------------------------------------------------------------------------
create policy lead_events_select on lead_events
  for select to authenticated
  using (is_active_member());

create policy lead_events_insert on lead_events
  for insert to authenticated
  with check (is_active_member() and actor_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Tabelas de referencia e configuracoes: todos leem, gestor escreve
-- ---------------------------------------------------------------------------
create policy products_select on products
  for select to authenticated using (is_active_member());
create policy products_write on products
  for all to authenticated using (is_manager()) with check (is_manager());

create policy lead_sources_select on lead_sources
  for select to authenticated using (is_active_member());
create policy lead_sources_write on lead_sources
  for all to authenticated using (is_manager()) with check (is_manager());

create policy lost_reasons_select on lost_reasons
  for select to authenticated using (is_active_member());
create policy lost_reasons_write on lost_reasons
  for all to authenticated using (is_manager()) with check (is_manager());

create policy settings_select on settings
  for select to authenticated using (is_active_member());
create policy settings_write on settings
  for all to authenticated using (is_manager()) with check (is_manager());
