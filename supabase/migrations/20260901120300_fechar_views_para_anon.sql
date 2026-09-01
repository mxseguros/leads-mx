-- MX Leads — fecha as views para requisicao sem sessao
--
-- Encontrado testando a RLS contra o banco real, com a chave publishable:
-- v_pipeline_metrics e v_stage_counts respondiam HTTP 200 a um anonimo.
--
-- Nao houve vazamento de dado: com security_invoker = on, a RLS de `leads`
-- filtra todas as linhas ANTES da agregacao, entao anon so recebe zeros. O
-- problema e outro — uma view agregada devolve linha mesmo sobre zero linhas
-- visiveis. count(*) de nada e 0, e 0 e uma resposta. Enquanto uma view que
-- devolve linhas (v_leads_board) simplesmente vem vazia, a agregada sempre
-- entrega um objeto.
--
-- Isso contradiz a regra da RLS: nada e legivel sem sessao de perfil ativo.
-- Revogar o grant fecha a porta, em vez de confiar que toda agregacao futura
-- continue zerada — basta alguem adicionar um count sobre tabela sem RLS
-- (products, lead_sources) para virar vazamento de verdade.

-- ---------------------------------------------------------------------------
-- 1. As views. Este e o achado.
-- ---------------------------------------------------------------------------
revoke all on public.v_leads_board      from anon;
revoke all on public.v_pipeline_metrics from anon;
revoke all on public.v_stage_counts     from anon;

grant select on public.v_leads_board      to authenticated;
grant select on public.v_pipeline_metrics to authenticated;
grant select on public.v_stage_counts     to authenticated;

-- ---------------------------------------------------------------------------
-- 2. As tabelas, por profundidade.
--
-- Elas ja estavam corretas: anon tem grant, mas nenhuma politica, entao a RLS
-- devolve vazio. Ainda assim, anon nao tem motivo algum para alcancar estas
-- tabelas — a captura publica da Fase 1 passa pela API com a chave secreta,
-- que ignora RLS e nao depende de grant nenhum para o papel anon.
--
-- Tirar o grant troca "protegido por politica" por "sem permissao", que e uma
-- camada a menos para errar quando alguem escrever a proxima politica.
-- ---------------------------------------------------------------------------
revoke all on public.leads        from anon;
revoke all on public.lead_events  from anon;
revoke all on public.profiles     from anon;
revoke all on public.products     from anon;
revoke all on public.lead_sources from anon;
revoke all on public.lost_reasons from anon;
revoke all on public.settings     from anon;
