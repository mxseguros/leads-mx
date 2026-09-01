-- MX Leads — seeds
-- Item F0-5 do plano. Idempotente: pode rodar quantas vezes quiser.

-- ---------------------------------------------------------------------------
-- Os seis produtos PJ (§1)
-- ---------------------------------------------------------------------------
insert into products (label, sort_order) values
  ('Auto',           1),
  ('Frota',          2),
  ('Transporte',     3),
  ('Consórcio',      4),
  ('Saúde',          5),
  ('Vida em Grupo',  6)
on conflict (label) do nothing;

-- ---------------------------------------------------------------------------
-- Origens (§7)
-- ---------------------------------------------------------------------------
insert into lead_sources (slug, label, active) values
  ('landing',          'Landing page',     true),
  ('indicacao',        'Indicação',        true),
  ('instagram',        'Instagram',        true),
  ('manual',           'Cadastro manual',  true),
  -- Widget fora de escopo (01/09/2026). Ficam inativos em vez de sumir: lead
  -- antigo pode apontar para eles, e source_id e NOT NULL.
  ('widget-flutuante', 'Widget flutuante', false),
  ('widget-inline',    'Widget no site',   false)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Motivos de perda — lista editavel pela MX em Configuracoes (§5.6)
-- ---------------------------------------------------------------------------
insert into lost_reasons (label, sort_order) values
  ('Preço acima do orçamento',      1),
  ('Fechou com a corretora atual',  2),
  ('Fechou com concorrente',        3),
  ('Sem perfil para os produtos',   4),
  ('Não respondeu aos contatos',    5),
  ('Adiou a decisão',               6),
  ('Contato inválido',              7)
on conflict (label) do nothing;

-- ---------------------------------------------------------------------------
-- Configuracoes. Valores de partida; a MX ajusta na tela sem deploy.
-- ---------------------------------------------------------------------------
insert into settings (key, value) values
  ('whatsapp_number',    '"5511000000000"'::jsonb),
  ('wa_template',        '"Olá {nome}, tudo bem? Sou consultor da MX Corretora de Seguros e recebi seu pedido de cotação de {produto}. Podemos conversar?"'::jsonb),
  ('consent_text',       '"Autorizo a MX Corretora de Seguros a entrar em contato comigo pelos dados informados e a tratar meus dados conforme a Política de Privacidade."'::jsonb),
  ('consent_version',    '"2026-09-01"'::jsonb),
  ('privacy_policy_url', '"https://mxseguros.com.br/politica-de-privacidade"'::jsonb),
  ('sla_hours',          '2'::jsonb)
on conflict (key) do nothing;
