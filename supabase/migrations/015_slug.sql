-- ============================================================
-- MIGRATION 015 — slug por loja
-- Aplicada.
--
-- Permite resolver a loja por um identificador estável (LOJA_SLUG env var
-- em src/lib/getLoja.ts) em vez de depender só do Host — útil em dev local
-- e em qualquer ambiente onde o domínio não é confiável/configurado.
-- ============================================================

alter table lojas add column slug text;

update lojas set slug = 'catingueira' where dominio ilike '%catingueira%';
update lojas set slug = 'felizardo' where dominio ilike '%felizardo%';

alter table lojas alter column slug set not null;
alter table lojas add constraint lojas_slug_key unique (slug);
