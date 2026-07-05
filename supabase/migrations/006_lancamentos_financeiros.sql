-- ============================================================
-- MIGRATION 006 — Lançamentos financeiros manuais
-- NÃO EXECUTAR AINDA — apenas para revisão.
-- Independente das migrations anteriores (só referencia lojas/vendas/
-- usuarios_perfil, que já existem).
-- ============================================================

create table lancamentos_financeiros (
  id                     uuid primary key default uuid_generate_v4(),
  loja_id                uuid not null references lojas(id) on delete cascade,
  tipo                   text not null check (tipo in ('entrada', 'saida')),
  categoria              text not null,
  descricao              text,
  valor                  numeric(12,2) not null,
  valor_retornado_banco  numeric(12,2),
  data                   date not null,
  venda_id               uuid references vendas(id) on delete set null,
  criado_por             uuid references usuarios_perfil(id) on delete set null,
  criado_em              timestamptz not null default now()
);

create index idx_lancamentos_financeiros_loja_data on lancamentos_financeiros (loja_id, data);

alter table lancamentos_financeiros enable row level security;

-- Mesmo padrão de RLS de financeiro_veiculos (schema.sql): só gerente/
-- diretor/admin da própria loja podem ler/escrever — restrito por perfil
-- diretamente no banco, não só na aplicação.
create policy "gerente acessa lancamentos financeiros"
  on lancamentos_financeiros for all
  using (
    exists (
      select 1 from usuarios_perfil up
      where up.id = auth.uid()
        and up.loja_id = lancamentos_financeiros.loja_id
        and up.perfil in ('gerente', 'diretor', 'admin')
    )
  );
