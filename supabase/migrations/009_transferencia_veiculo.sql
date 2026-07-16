-- ============================================================
-- MIGRATION 009 — Transferência de veículo entre lojas
-- NÃO EXECUTAR AINDA — apenas para revisão.
-- Depende de veiculos, lojas, usuarios_perfil (já existentes).
-- ============================================================

create table veiculo_transferencias (
  id                 uuid primary key default uuid_generate_v4(),
  veiculo_id         uuid not null references veiculos(id) on delete cascade,
  loja_origem_id     uuid not null references lojas(id) on delete cascade,
  loja_destino_id    uuid not null references lojas(id) on delete cascade,
  data_transferencia timestamptz not null default now(),
  transferido_por    uuid references usuarios_perfil(id) on delete set null,
  observacoes        text
);

create index idx_veiculo_transferencias_veiculo on veiculo_transferencias (veiculo_id, data_transferencia desc);

alter table veiculo_transferencias enable row level security;

-- Só gerente/diretor/admin podem ler ou registrar transferências (nunca sócio,
-- nunca vendedor). O registro referencia duas lojas (origem e destino) ao
-- mesmo tempo, então — diferente do padrão "equipe da própria loja" usado em
-- outras tabelas — a policy não trava por loja_id do usuário, só por perfil,
-- igual pedido.
create policy "gerencia acessa transferencias de veiculo"
  on veiculo_transferencias for all
  using (
    exists (
      select 1 from usuarios_perfil up
      where up.id = auth.uid()
        and up.perfil in ('gerente', 'diretor', 'admin')
    )
  );
