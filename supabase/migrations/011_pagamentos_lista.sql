-- ============================================================
-- MIGRATION 011 — Lista dinâmica de pagamentos da venda
-- NÃO EXECUTAR AINDA — apenas para revisão.
-- Depende de vendas, veiculo_recebido_venda (migration 010), usuarios_perfil.
-- ============================================================

create table venda_pagamentos (
  id                  uuid primary key default uuid_generate_v4(),
  venda_id            uuid not null references vendas(id) on delete cascade,
  tipo                text not null check (tipo in ('dinheiro', 'pix', 'cheque', 'duplicata', 'financeira', 'veiculo', 'outros')),
  valor               numeric(12,2) not null,
  detalhes            jsonb,
  veiculo_recebido_id uuid references veiculo_recebido_venda(id) on delete set null,
  criado_em           timestamptz not null default now()
);

create index idx_venda_pagamentos_venda on venda_pagamentos (venda_id);

alter table venda_pagamentos enable row level security;

-- Mesmo padrão de RLS de financeiro_veiculos/lancamentos_financeiros: só
-- gerente/diretor/admin da própria loja (join até vendas, já que a tabela não
-- tem loja_id direto).
create policy "gerencia gerencia pagamentos da venda"
  on venda_pagamentos for all
  using (
    exists (
      select 1 from vendas vd
      join usuarios_perfil up on up.loja_id = vd.loja_id
      where vd.id = venda_pagamentos.venda_id
        and up.id = auth.uid()
        and up.perfil in ('gerente', 'diretor', 'admin')
    )
  );

-- ─────────────────────────────────────────────────────────────
-- Migra os valores fixos existentes em vendas.pagamento_* pra linhas em
-- venda_pagamentos — uma linha por forma de pagamento que tinha valor > 0.
-- As colunas antigas em vendas NÃO são apagadas aqui — o código novo só para
-- de gravar/ler nelas, os dados históricos continuam lá.
-- ─────────────────────────────────────────────────────────────

insert into venda_pagamentos (venda_id, tipo, valor, detalhes)
select id, 'dinheiro', pagamento_dinheiro, null
from vendas
where pagamento_dinheiro > 0;

insert into venda_pagamentos (venda_id, tipo, valor, detalhes)
select id, 'cheque', pagamento_cheque1_valor,
  jsonb_strip_nulls(jsonb_build_object('banco', pagamento_cheque1_banco, 'data', pagamento_cheque1_data))
from vendas
where pagamento_cheque1_valor > 0;

insert into venda_pagamentos (venda_id, tipo, valor, detalhes)
select id, 'cheque', pagamento_cheque2_valor,
  jsonb_strip_nulls(jsonb_build_object('banco', pagamento_cheque2_banco, 'data', pagamento_cheque2_data))
from vendas
where pagamento_cheque2_valor > 0;

insert into venda_pagamentos (venda_id, tipo, valor, detalhes)
select id, 'duplicata', pagamento_duplicata1_valor,
  jsonb_strip_nulls(jsonb_build_object('banco', pagamento_duplicata1_banco, 'data', pagamento_duplicata1_data))
from vendas
where pagamento_duplicata1_valor > 0;

insert into venda_pagamentos (venda_id, tipo, valor, detalhes)
select id, 'duplicata', pagamento_duplicata2_valor,
  jsonb_strip_nulls(jsonb_build_object('banco', pagamento_duplicata2_banco, 'data', pagamento_duplicata2_data))
from vendas
where pagamento_duplicata2_valor > 0;

insert into venda_pagamentos (venda_id, tipo, valor, detalhes)
select id, 'financeira', pagamento_financeira_valor,
  jsonb_strip_nulls(jsonb_build_object('nome', pagamento_financeira_nome))
from vendas
where pagamento_financeira_valor > 0;

insert into venda_pagamentos (venda_id, tipo, valor, detalhes)
select id, 'outros', pagamento_outros_valor,
  jsonb_strip_nulls(jsonb_build_object('descricao', pagamento_outros_desc))
from vendas
where pagamento_outros_valor > 0;

-- ─────────────────────────────────────────────────────────────
-- VEICULO_RECEBIDO_VENDA — agora pode haver mais de um por venda
-- ─────────────────────────────────────────────────────────────
-- Nome do constraint é o default gerado pelo Postgres pra "unique" inline na
-- migration 010 (veiculo_recebido_venda_venda_id_key).
alter table veiculo_recebido_venda drop constraint if exists veiculo_recebido_venda_venda_id_key;

-- Cada veículo recebido passa a ser vinculado a um item específico da lista
-- de pagamentos (não só à venda como um todo) — é o que torna possível ter
-- vários veículos recebidos numa mesma negociação, um por item tipo='veiculo'.
alter table veiculo_recebido_venda add column if not exists venda_pagamento_id uuid references venda_pagamentos(id) on delete set null;
