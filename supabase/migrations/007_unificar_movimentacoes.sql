-- ============================================================
-- MIGRATION 007 — Unificar Despesas em Lançamentos Financeiros
-- NÃO EXECUTAR AINDA — apenas para revisão.
-- Depende da migration 006 (tabela lancamentos_financeiros) já aplicada.
-- Esta migration deve rodar UMA ÚNICA VEZ (o passo de dados não é
-- pensado para ser reexecutado — ver nota no final sobre a unique
-- constraint, que impede duplicidade silenciosa mesmo assim).
-- ============================================================

-- Mesmo campo que despesas_loja já tinha.
alter table lancamentos_financeiros add column if not exists recorrente boolean not null default false;

-- Rastreia de qual despesa antiga (despesas_loja) cada lançamento migrado veio.
-- Fica nulo para lançamentos criados normalmente pela aplicação — só é
-- preenchido pelo backfill abaixo.
alter table lancamentos_financeiros add column if not exists despesa_origem_id uuid references despesas_loja(id);

-- Trava contra duplicidade: nenhuma despesa pode ser migrada mais de uma vez
-- (NULLs não colidem entre si em unique constraints, então lançamentos
-- normais — sem origem em despesas_loja — não são afetados por isso).
-- Query de verificação depois de rodar:
--   select count(*) from despesas_loja;                                            -- total original
--   select count(*) from lancamentos_financeiros where despesa_origem_id is not null; -- deve bater com o total acima
alter table lancamentos_financeiros
  add constraint uq_lancamentos_despesa_origem unique (despesa_origem_id);

-- Migração dos dados. despesas_loja NÃO é apagada nem alterada — continua
-- intacta como histórico bruto. A partir de agora, só lancamentos_financeiros
-- é lida pelo código da aplicação.
insert into lancamentos_financeiros (
  loja_id, tipo, categoria, descricao, valor, data, recorrente, criado_em, despesa_origem_id
)
select
  d.loja_id,
  'saida',
  d.categoria,
  d.descricao,
  d.valor,
  d.data,
  d.recorrente,
  d.created_at,
  d.id
from despesas_loja d
where not exists (
  select 1 from lancamentos_financeiros lf where lf.despesa_origem_id = d.id
);
