-- MX Leads — base inicial
-- Referencia: Docs/MX-Leads-Planejamento-v0.3.md §7
-- Convencao D6: banco e API em ingles; interface em portugues.

-- ---------------------------------------------------------------------------
-- Extensoes (lacuna 04: o §7 usa citext e gen_random_uuid sem declarar nenhuma)
-- ---------------------------------------------------------------------------
create extension if not exists pgcrypto;   -- gen_random_uuid()
create extension if not exists citext;     -- e-mail sem distincao de caixa

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------
create type lead_stage as enum (
  'potenciais', 'reuniao', 'acompanhamento', 'negociacao',
  'ganhou', 'perdido', 'posterior'
);

create type user_role as enum ('gestor', 'consultor');

create type event_type as enum (
  'created', 'stage_changed', 'note', 'assigned',
  'next_action', 'field_changed', 'duplicate_submission', 'system'
);

-- ---------------------------------------------------------------------------
-- Utilitario: updated_at automatico
-- ---------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Equipe
-- ---------------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  initials text generated always as (
    upper(
      left(split_part(full_name, ' ', 1), 1) ||
      left(split_part(full_name, ' ', 2), 1)
    )
  ) stored,
  role user_role not null default 'consultor',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table profiles is 'Equipe da MX. Criado por trigger no primeiro login (magic link).';

-- ---------------------------------------------------------------------------
-- Tabelas de referencia
-- ---------------------------------------------------------------------------
create table lead_sources (
  id serial primary key,
  slug text unique not null,
  label text not null,
  active boolean not null default true
);

create table products (
  id serial primary key,
  label text unique not null,
  active boolean not null default true,
  sort_order int not null default 0
);

create table lost_reasons (
  id serial primary key,
  label text unique not null,
  active boolean not null default true,
  sort_order int not null default 0
);

-- ---------------------------------------------------------------------------
-- Leads
-- ---------------------------------------------------------------------------
create table leads (
  id uuid primary key default gen_random_uuid(),

  -- Contato (os quatro campos do formulario publico)
  first_name text not null,
  last_name  text not null,
  phone text not null check (phone ~ '^[0-9]{11}$'),   -- DDD + 9 digitos, sem +55
  email citext not null,

  -- Empresa (lacuna 03: prometido no §3.1 para a ficha, ausente do §7).
  -- Colunas nascem agora; a interface chega quando a decisao D3 mandar.
  company text,
  cnpj text check (cnpj is null or cnpj ~ '^[0-9]{14}$'),

  -- Origem
  product_id int references products(id),
  source_id  int references lead_sources(id) not null,
  source_detail text,                                   -- data-origem do widget / pagina
  utm jsonb,

  -- Esteira
  stage lead_stage not null default 'potenciais',
  owner_id uuid references profiles(id),
  next_action_label text,
  next_action_at date,

  -- Valores
  estimated_value numeric(12,2),                        -- estimativa da negociacao
  -- Lacuna 02: o premio do "Ganhou" nao pode sobrescrever a estimativa,
  -- senao fica impossivel medir o quanto o funil erra.
  won_value numeric(12,2),
  -- Lacuna 01: o §6 pede a seguradora e o §8 aceita `insurer` no corpo,
  -- mas o §7 nao tinha onde guardar.
  insurer text,

  -- Fases terminais
  lost_reason_id int references lost_reasons(id),
  resume_at date,
  won_at  timestamptz,
  lost_at timestamptz,

  -- LGPD
  consent_at timestamptz not null,
  consent_text_version text not null,
  consent_ip inet,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

comment on column leads.phone is 'Somente digitos: DDD + 9 digitos. A mascara vive na interface.';
comment on column leads.estimated_value is 'Estimativa durante a negociacao. Nunca sobrescrita pelo premio.';
comment on column leads.won_value is 'Premio anual, obrigatorio ao entrar em ganhou (§6).';

create trigger leads_updated_at
  before update on leads
  for each row execute function set_updated_at();

create index leads_stage_idx        on leads (stage)                   where deleted_at is null;
create index leads_owner_action_idx on leads (owner_id, next_action_at) where deleted_at is null;
create index leads_created_idx      on leads (created_at desc)          where deleted_at is null;
create index leads_phone_idx on leads (phone);
create index leads_email_idx on leads (email);

-- ---------------------------------------------------------------------------
-- Historico
-- ---------------------------------------------------------------------------
create table lead_events (
  id bigserial primary key,
  lead_id uuid not null references leads(id) on delete cascade,
  type event_type not null,
  actor_id uuid references profiles(id),   -- null = sistema / formulario publico
  payload jsonb not null default '{}',     -- {from,to,reason,resume_at,text,...}
  created_at timestamptz not null default now()
);

create index lead_events_lead_idx on lead_events (lead_id, created_at desc);

comment on table lead_events is 'Append-only. Nao ha update nem delete: e o que sustenta o historico e o Desfazer.';

-- ---------------------------------------------------------------------------
-- Configuracoes editaveis pela MX (§5.6)
-- ---------------------------------------------------------------------------
create table settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create trigger settings_updated_at
  before update on settings
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Perfil criado no primeiro login
-- ---------------------------------------------------------------------------
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'consultor')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
