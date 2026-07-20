-- ============================================================
-- MIGRATION 012 — Promissórias (parcelamento) da venda
-- NÃO EXECUTAR AINDA — apenas para revisão.
-- Depende de vendas, usuarios_perfil (já existentes).
-- ============================================================

create table venda_promissorias (
  id             uuid primary key default uuid_generate_v4(),
  venda_id       uuid not null references vendas(id) on delete cascade,
  numero_parcela integer not null,
  valor          numeric(12,2) not null,
  vencimento     date not null,
  pago           boolean not null default false,
  data_pagamento date,
  observacoes    text,
  criado_em      timestamptz not null default now()
);

-- Uma numeração de parcela não se repete dentro da mesma venda (a Server
-- Action que cria a parcela calcula o próximo número automaticamente).
create unique index idx_venda_promissorias_numero on venda_promissorias (venda_id, numero_parcela);

alter table venda_promissorias enable row level security;

-- Mesmo padrão de RLS de venda_pagamentos (migration 011) — promissória é
-- dado financeiro da venda, restrito a gerente/diretor/admin da própria loja.
create policy "gerencia gerencia promissorias da venda"
  on venda_promissorias for all
  using (
    exists (
      select 1 from vendas vd
      join usuarios_perfil up on up.loja_id = vd.loja_id
      where vd.id = venda_promissorias.venda_id
        and up.id = auth.uid()
        and up.perfil in ('gerente', 'diretor', 'admin')
    )
  );
