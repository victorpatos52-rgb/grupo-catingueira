-- ============================================================
-- MIGRATION 010 — Veículo recebido na troca (permuta)
-- NÃO EXECUTAR AINDA — apenas para revisão.
-- Depende de vendas, veiculos, lojas, usuarios_perfil (já existentes).
-- ============================================================

create table veiculo_recebido_venda (
  id                uuid primary key default uuid_generate_v4(),
  venda_id          uuid not null unique references vendas(id) on delete cascade,
  veiculo_criado_id uuid references veiculos(id) on delete set null,
  marca             text not null,
  modelo            text not null,
  ano               integer,
  placa             text,
  cor               text,
  valor_entrada     numeric(12,2),
  observacoes       text,
  criado_em         timestamptz not null default now()
);

-- unique em venda_id: só um veículo recebido por negociação — o formulário na
-- tela de venda é uma seção única (não uma lista), e salvar de novo (autosave
-- a cada etapa) deve atualizar o mesmo registro, não duplicar.
create index idx_veiculo_recebido_venda_veiculo_criado on veiculo_recebido_venda (veiculo_criado_id);

alter table veiculo_recebido_venda enable row level security;

-- Mesmo padrão de RLS de veiculo_transferencias (migration 009): só gerente/
-- diretor/admin, sem trava por loja_id (o registro nasce ligado a uma venda
-- de uma loja, mas depois referencia um veículo novo — mantém consistência
-- com o padrão já adotado pra esse tipo de tabela "de apoio").
create policy "gerencia acessa veiculo recebido na troca"
  on veiculo_recebido_venda for all
  using (
    exists (
      select 1 from usuarios_perfil up
      where up.id = auth.uid()
        and up.perfil in ('gerente', 'diretor', 'admin')
    )
  );

-- ─────────────────────────────────────────────────────────────
-- VEICULOS — rascunho
-- ─────────────────────────────────────────────────────────────
-- Diferente de "excluido" (veículo removido/histórico) — "rascunho" marca um
-- veículo que já existe no banco (ex: recebido numa troca) mas ainda não tem
-- dados suficientes (fotos, preço) pra ser mostrado publicamente ou aparecer
-- nas listagens normais, até alguém completá-lo e clicar em "Publicar".
alter table veiculos add column if not exists rascunho boolean not null default false;

create index if not exists idx_veiculos_rascunho on veiculos (loja_id, rascunho);

-- Reforça no banco que rascunho=true nunca é visível ao público, mesmo que
-- status também esteja (por engano, ou por alguém marcar 'disponivel' antes
-- de completar o cadastro) como 'disponivel' — não confia só no filtro da
-- aplicação (que também vai filtrar rascunho=false nas queries públicas).
alter policy "público vê disponíveis"
  on veiculos
  using (status = 'disponivel' and rascunho = false);
