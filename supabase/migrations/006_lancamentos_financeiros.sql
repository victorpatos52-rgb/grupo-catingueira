-- ============================================================
-- MIGRATION 006 — Lançamentos financeiros manuais
-- NÃO EXECUTAR AINDA — apenas para revisão.
-- Independente das migrations anteriores (só referencia lojas/vendas/
-- usuarios_perfil, que já existem).
-- ============================================================

create table lancamentos_financeiros (
  id          uuid primary key default uuid_generate_v4(),
  loja_id     uuid not null references lojas(id) on delete cascade,
  tipo        text not null check (tipo in ('entrada', 'saida')),
  categoria   text not null,
  descricao   text,
  valor       numeric(12,2) not null,
  data        date not null,
  venda_id    uuid references vendas(id) on delete set null,
  criado_por  uuid references usuarios_perfil(id) on delete set null,
  criado_em   timestamptz not null default now()
);

create index idx_lancamentos_financeiros_loja_data on lancamentos_financeiros (loja_id, data);

alter table lancamentos_financeiros enable row level security;

-- Mesmo padrão de RLS já usado em custos_manutencao (schema.sql): qualquer
-- membro autenticado da equipe da loja pode ler/escrever nesta tabela.
-- A restrição a gerente/diretor/admin pedida para esta funcionalidade é
-- feita na aplicação (Server Actions em actions.ts + UI), não no RLS —
-- igual ao resto do módulo Financeiro hoje (financeiro_veiculos é a
-- exceção que já restringe por perfil no próprio RLS; aqui optei por
-- seguir custos_manutencao, como pedido).
create policy "equipe gerencia lancamentos financeiros"
  on lancamentos_financeiros for all
  using (
    exists (
      select 1 from usuarios_perfil up
      where up.id = auth.uid()
        and up.loja_id = lancamentos_financeiros.loja_id
    )
  );
