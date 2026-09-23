-- ============================================================
-- MIGRATION 016 — cidade/estado faltantes + rename maps_url
-- Pendente — rode no SQL Editor do Supabase Dashboard.
--
-- Corrige "Could not find the 'cidade' column of 'lojas' in the schema
-- cache" ao salvar em /admin/configuracoes.
--
-- Diagnóstico confirmado direto no Postgres (não é cache do PostgREST):
--   select id,cidade,estado from lojas limit 1;
--   -> 42703: column lojas.cidade does not exist
-- lojas.cidade e lojas.estado nunca existiram no banco, apesar de estarem
-- no CREATE TABLE original em supabase/schema.sql e no tipo Loja
-- (src/types/index.ts) — schema.sql documenta uma intenção que nunca foi
-- de fato executada em produção pra essas duas colunas.
--
-- Também corrigido: o formulário de configurações, o tipo Loja e
-- updateLojaSettings sempre usaram `maps_url`, mas a coluna real no banco
-- se chama `google_maps_url` (não referenciada em nenhum lugar do
-- código) — mesmo tipo de drift, na direção oposta. Renomeia em vez de
-- criar uma coluna nova pra não perder dado já salvo em produção.
--
-- cep é adicionado como groundwork pro feed OLX/ZAP (ver diagnóstico
-- anterior sobre a integração) — ainda sem campo no formulário.
-- ============================================================

alter table lojas add column if not exists cidade text;
alter table lojas add column if not exists estado text;
alter table lojas add column if not exists cep text;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'lojas' and column_name = 'google_maps_url'
  ) and not exists (
    select 1 from information_schema.columns
    where table_name = 'lojas' and column_name = 'maps_url'
  ) then
    alter table lojas rename column google_maps_url to maps_url;
  end if;
end $$;
