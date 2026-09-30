-- ============================================================
-- MIGRATION 018 — Campos para feed OLX + Facebook Marketplace/Catálogo
-- Pendente — rode no SQL Editor do Supabase Dashboard.
--
-- Confirmado ANTES de escrever esta migration (não presumido):
--   - veiculos.cor JÁ EXISTE (text not null, schema.sql:88) e as 59 linhas
--     atuais têm valor preenchido. NÃO recriada aqui — pedir pra tornar
--     nullable teria sido uma downgrade de uma constraint que já funciona,
--     sem necessidade concreta. Se realmente precisar ficar nullable pro
--     feed (ex: veículo cadastrado sem cor ainda), isso é uma decisão
--     separada — não fiz por conta própria.
--   - ano_fabricacao/ano_modelo NÃO existem — não achei rastro de nenhuma
--     tentativa anterior de schema OLX no projeto (só um comentário sobre
--     `cep` na migration 016, groundwork não relacionado a esses campos).
--
-- Só o schema — geradores de feed em si ficam pra fase separada por canal.
-- ============================================================

-- condicao: default 'seminovo' porque é o que a loja vende
-- (não há veículo 'novo' hoje, mas o check permite os 3 valores).
alter table veiculos add column condicao text not null default 'seminovo'
  check (condicao in ('novo', 'seminovo', 'usado'));

alter table veiculos add column publicar_olx boolean not null default false;
alter table veiculos add column publicar_marketplace boolean not null default false;

-- ano_fabricacao/ano_modelo: nullable primeiro pra poder popular as linhas
-- existentes a partir de `ano` (suposição de que fabricação = modelo pra
-- quem já está cadastrado — ajustável depois por veículo no formulário),
-- só então travar not null.
alter table veiculos add column ano_fabricacao int;
alter table veiculos add column ano_modelo int;

update veiculos set ano_fabricacao = ano, ano_modelo = ano;

alter table veiculos alter column ano_fabricacao set not null;
alter table veiculos alter column ano_modelo set not null;
