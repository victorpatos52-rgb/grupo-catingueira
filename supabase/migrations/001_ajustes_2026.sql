-- ============================================================
-- MIGRATION 001 — Ajustes 2026
-- NÃO EXECUTAR AINDA — apenas para revisão.
-- Roda contra o banco já existente (não é um schema do zero).
-- Requer: extensão uuid-ossp (já criada pelo supabase/schema.sql original)
-- ============================================================

create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────────────────────────
-- 1) VEICULO_AQUISICAO
-- Dados de quem a loja comprou o carro (fornecedor/vendedor original)
-- ─────────────────────────────────────────────────────────────
create table veiculo_aquisicao (
  id                    uuid primary key default uuid_generate_v4(),
  veiculo_id            uuid not null unique references veiculos(id) on delete cascade,
  nome_vendedor         text,
  documento_vendedor    text,
  telefone_vendedor     text,
  forma_pagamento_compra text,
  data_compra           date,
  hora_compra           time,
  valor_compra          numeric(12,2),
  observacoes           text,
  criado_em             timestamptz not null default now()
);

alter table veiculo_aquisicao enable row level security;

-- Somente equipe autenticada da mesma loja do veículo (nunca público)
create policy "equipe gerencia aquisicao"
  on veiculo_aquisicao for all
  using (
    exists (
      select 1
      from veiculos v
      join usuarios_perfil up on up.loja_id = v.loja_id
      where v.id = veiculo_aquisicao.veiculo_id
        and up.id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────
-- 2) ANEXOS (genérica, reutilizável em veículo e venda)
-- ─────────────────────────────────────────────────────────────
create table anexos (
  id             uuid primary key default uuid_generate_v4(),
  entidade_tipo  text not null check (entidade_tipo in ('veiculo', 'venda')),
  entidade_id    uuid not null,
  nome_arquivo   text not null,
  url            text not null,
  tipo_arquivo   text,
  criado_por     uuid references usuarios_perfil(id) on delete set null,
  criado_em      timestamptz not null default now()
);

create index idx_anexos_entidade on anexos (entidade_tipo, entidade_id);

alter table anexos enable row level security;

-- Somente equipe autenticada da mesma loja da entidade referenciada (nunca público)
create policy "equipe gerencia anexos"
  on anexos for all
  using (
    (
      entidade_tipo = 'veiculo' and exists (
        select 1
        from veiculos v
        join usuarios_perfil up on up.loja_id = v.loja_id
        where v.id = anexos.entidade_id
          and up.id = auth.uid()
      )
    )
    or
    (
      entidade_tipo = 'venda' and exists (
        select 1
        from vendas vd
        join usuarios_perfil up on up.loja_id = vd.loja_id
        where vd.id = anexos.entidade_id
          and up.id = auth.uid()
      )
    )
  );

-- ─────────────────────────────────────────────────────────────
-- 3) VEICULOS — valor_oferta
-- Continua público: RLS do Postgres é por linha, não por coluna.
-- A policy "público vê disponíveis" (schema.sql) já cobre esta coluna
-- automaticamente — nenhuma mudança de RLS necessária aqui.
-- ─────────────────────────────────────────────────────────────
alter table veiculos add column if not exists valor_oferta numeric(12,2);

-- ─────────────────────────────────────────────────────────────
-- 4) VEICULOS — proprietario_tipo / percentual_socio
-- ATENÇÃO: por serem colunas da tabela `veiculos`, elas caem sob a
-- MESMA policy pública de leitura (SELECT em disponivel = true) e sob
-- "equipe lê todos da loja". O RLS do Postgres não filtra colunas.
-- Páginas públicas que hoje fazem `.select('*')` em veiculos
-- (src/app/page.tsx, src/app/estoque/page.tsx, src/app/veiculo/[id]/page.tsx)
-- passarão a retornar proprietario_tipo/percentual_socio para qualquer
-- visitante, a menos que o código dessas páginas seja ajustado para
-- selecionar colunas explícitas em vez de '*'. Isso é uma mudança de
-- APLICAÇÃO, fora do escopo desta migration — só o SQL está aqui.
-- ─────────────────────────────────────────────────────────────
alter table veiculos add column if not exists proprietario_tipo text not null default 'felipe'
  check (proprietario_tipo in ('felipe', 'dividido'));

alter table veiculos add column if not exists percentual_socio numeric(5,2)
  check (percentual_socio is null or proprietario_tipo = 'dividido');

-- ─────────────────────────────────────────────────────────────
-- 5) VENDAS — numero_venda / hora_venda
-- data_venda mantém o tipo atual (não alterado, para não quebrar dados já gravados)
-- ─────────────────────────────────────────────────────────────
alter table vendas add column if not exists numero_venda text unique;
alter table vendas add column if not exists hora_venda time;

-- ─────────────────────────────────────────────────────────────
-- 6) SEQUENCES por loja para gerar numero_venda
-- Nomeadas por domínio das duas lojas atuais. Se uma nova loja for
-- criada no futuro, uma nova sequence precisa ser criada manualmente
-- (não há geração automática por linha de `lojas` aqui).
-- Uso sugerido na aplicação: select nextval('catingueira_venda_seq')
-- ─────────────────────────────────────────────────────────────
create sequence if not exists catingueira_venda_seq start 1 increment 1;
create sequence if not exists felizardo_venda_seq start 1 increment 1;

-- ─────────────────────────────────────────────────────────────
-- 7) RLS — resumo de conformidade (nenhum SQL adicional necessário)
-- - veiculo_aquisicao: RLS habilitado, única policy exige auth.uid()
--   autenticado e vínculo de loja — nunca legível pelo público. OK.
-- - anexos: RLS habilitado, única policy exige auth.uid() autenticado
--   e vínculo de loja (via veiculo ou venda) — nunca legível pelo
--   público. OK.
-- - valor_oferta: cai na policy pública existente de veiculos
--   ("público vê disponíveis"), portanto já é legível publicamente
--   junto com as demais colunas de um veículo disponível. OK,
--   conforme pedido.
-- ─────────────────────────────────────────────────────────────
