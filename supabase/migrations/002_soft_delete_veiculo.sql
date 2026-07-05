-- ============================================================
-- MIGRATION 002 — Exclusão de veículo (soft delete)
-- NÃO EXECUTAR AINDA — apenas para revisão.
-- Independente da migration 001_ajustes_2026.sql.
-- ============================================================

-- Marca um veículo como excluído sem apagar a linha, preservando
-- histórico financeiro/vendas/anexos vinculados a ele.
alter table veiculos add column if not exists excluido boolean not null default false;

create index if not exists idx_veiculos_excluido on veiculos (loja_id, excluido);
