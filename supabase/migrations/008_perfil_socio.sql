-- ============================================================
-- MIGRATION 008 — Perfil 'socio'
-- NÃO EXECUTAR AINDA — apenas para revisão.
-- Depende da migration 001 (colunas veiculos.proprietario_tipo/
-- percentual_socio) já aplicada.
-- ============================================================

-- usuarios_perfil.perfil tem um check constraint inline (criado sem nome
-- explícito em schema.sql, então o Postgres gerou o nome padrão
-- "usuarios_perfil_perfil_check"). Substituímos por uma versão que
-- também aceita 'socio'.
alter table usuarios_perfil drop constraint if exists usuarios_perfil_perfil_check;
alter table usuarios_perfil add constraint usuarios_perfil_perfil_check
  check (perfil in ('vendedor', 'gerente', 'diretor', 'admin', 'socio'));

-- Nota: a regra "perfil 'socio' só pode existir vinculado à loja Felizardo"
-- é validada na aplicação (Server Actions em actions.ts), não aqui via
-- constraint de banco — precisaria de uma trigger para checar o domínio
-- da loja referenciada, o que optei por não fazer para manter a migration
-- simples. Se quiser essa trava também no banco, me avise que eu escrevo
-- a trigger.
