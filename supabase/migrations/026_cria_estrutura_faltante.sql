-- ============================================================
-- MIGRATION 026 — Cria a estrutura que o código usa e não existe no banco real
-- Rode no SQL Editor DEPOIS da 024 e ANTES do deploy da branch fase1-lojas.
-- Idempotente: create table if not exists / add column if not exists /
-- drop policy if exists. NÃO altera nem apaga dados existentes.
--
-- Base: SQL versionado (schema.sql, 001–012) ajustado ao que o CÓDIGO grava
-- hoje e à lista real de tabelas/colunas (nov/2026). Diferenças em relação ao
-- schema.sql original, de propósito:
--   - lembretes usa tipo/mensagem (é o que o código grava), não titulo/descricao;
--   - lead_interacoes.tipo aceita os valores que o código usa (nota, site,
--     proposta...) além dos do schema.sql;
--   - colunas de usuário (usuario_id, inspetor_id, responsavel_id, criado_por)
--     apontam para usuarios_perfil(id) — é o que permite os joins do código
--     (ex.: usuario:usuarios_perfil(nome)); usuarios_perfil.id = auth.users.id.
--
-- O que quebra hoje e esta migration resolve:
--   - formulário de contato do SITE (submitContatoLead grava email,
--     veiculo_interesse e tags em leads) → falha sempre;
--   - "Novo lead" no CRM (criarLead: email, veiculo_interesse, responsavel_id, tags);
--   - editar lead (email, veiculo_interesse), trocar responsável, filtro "Meus leads";
--   - interações do lead, mensagens prontas, lembretes do dashboard, vistoria.
--
-- RLS: ligado em todas as tabelas novas, com policy "equipe da loja" via
-- privado.usuario_acessa_loja(loja_id) (021/024). O app grava com service role
-- (ignora RLS); a policy é a defesa no banco. anon não tem acesso.
-- ============================================================


-- ─────────────────────────────────────────────────────────────
-- 0) PRÉ-CHECAGEM
-- ─────────────────────────────────────────────────────────────
do $$
begin
  if to_regprocedure('privado.usuario_acessa_loja(uuid)') is null then
    raise exception 'privado.usuario_acessa_loja não existe. Rode a 021 (e a 024) antes da 026.';
  end if;
  if to_regclass('public.leads') is null or to_regclass('public.veiculos') is null
     or to_regclass('public.lojas') is null or to_regclass('public.usuarios_perfil') is null then
    raise exception 'Tabelas base (leads, veiculos, lojas, usuarios_perfil) não encontradas.';
  end if;
end $$;


-- ─────────────────────────────────────────────────────────────
-- 1) LEADS — colunas que o código grava/lê e não existem
-- ─────────────────────────────────────────────────────────────
alter table public.leads add column if not exists email             text;
alter table public.leads add column if not exists veiculo_interesse text;
alter table public.leads add column if not exists tags              text[] not null default '{}';
alter table public.leads add column if not exists responsavel_id    uuid references public.usuarios_perfil(id) on delete set null;
alter table public.leads add column if not exists data_contato      timestamptz;
alter table public.leads add column if not exists criado_por        uuid references public.usuarios_perfil(id) on delete set null;

create index if not exists idx_leads_loja_created  on public.leads (loja_id, created_at desc);
create index if not exists idx_leads_responsavel   on public.leads (responsavel_id);


-- ─────────────────────────────────────────────────────────────
-- 2) LOJAS — descricao (slogan da ficha do veículo; hoje cai no texto padrão)
-- ─────────────────────────────────────────────────────────────
alter table public.lojas add column if not exists descricao text;


-- ─────────────────────────────────────────────────────────────
-- 3) LEAD_INTERACOES
-- ─────────────────────────────────────────────────────────────
create table if not exists public.lead_interacoes (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid not null references public.leads(id) on delete cascade,
  loja_id     uuid not null references public.lojas(id) on delete cascade,
  usuario_id  uuid references public.usuarios_perfil(id) on delete set null,
  tipo        text not null default 'nota'
                check (tipo in ('nota', 'whatsapp', 'ligacao', 'visita', 'proposta', 'site',
                                'email', 'observacao', 'status')),
  descricao   text not null,
  created_at  timestamptz not null default now()
);

create index if not exists idx_lead_interacoes_lead on public.lead_interacoes (lead_id, created_at desc);
create index if not exists idx_lead_interacoes_loja on public.lead_interacoes (loja_id);


-- ─────────────────────────────────────────────────────────────
-- 4) MENSAGENS_PADRAO
-- ─────────────────────────────────────────────────────────────
create table if not exists public.mensagens_padrao (
  id          uuid primary key default gen_random_uuid(),
  loja_id     uuid not null references public.lojas(id) on delete cascade,
  titulo      text not null,
  mensagem    text not null,
  created_at  timestamptz not null default now()
);

create index if not exists idx_mensagens_padrao_loja on public.mensagens_padrao (loja_id);


-- ─────────────────────────────────────────────────────────────
-- 5) LEMBRETES (colunas como o código grava: tipo / mensagem)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.lembretes (
  id             uuid primary key default gen_random_uuid(),
  loja_id        uuid not null references public.lojas(id) on delete cascade,
  veiculo_id     uuid references public.veiculos(id) on delete cascade,
  lead_id        uuid references public.leads(id) on delete cascade,
  tipo           text not null default 'personalizado'
                   check (tipo in ('pos_venda', 'aniversario_compra', 'aniversario_cliente',
                                   'financiamento', 'visita', 'personalizado')),
  data_lembrete  date not null,
  mensagem       text,
  concluido      boolean not null default false,
  created_at     timestamptz not null default now()
);

create index if not exists idx_lembretes_loja_pendentes on public.lembretes (loja_id, concluido, data_lembrete);


-- ─────────────────────────────────────────────────────────────
-- 6) VISTORIA_VEICULO (nome que o código usa — TABELA_VISTORIA e a 025)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.vistoria_veiculo (
  id           uuid primary key default gen_random_uuid(),
  veiculo_id   uuid not null references public.veiculos(id) on delete cascade,
  loja_id      uuid not null references public.lojas(id) on delete cascade,
  inspetor_id  uuid references public.usuarios_perfil(id) on delete set null,
  itens        jsonb not null default '{}'::jsonb,
  observacoes  text,
  aprovado     boolean not null default true,
  created_at   timestamptz not null default now()
);

create index if not exists idx_vistoria_veiculo_veiculo on public.vistoria_veiculo (veiculo_id, created_at desc);
create index if not exists idx_vistoria_veiculo_loja    on public.vistoria_veiculo (loja_id);


-- ─────────────────────────────────────────────────────────────
-- 7) RLS + policies (mesmo padrão: privado.usuario_acessa_loja(loja_id))
-- ─────────────────────────────────────────────────────────────
do $$
declare
  t text;
begin
  foreach t in array array['lead_interacoes', 'mensagens_padrao', 'lembretes', 'vistoria_veiculo'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', 'equipe da loja acessa ' || t, t);
    execute format(
      'create policy %I on public.%I for all to authenticated
         using (privado.usuario_acessa_loja(loja_id))
         with check (privado.usuario_acessa_loja(loja_id))',
      'equipe da loja acessa ' || t, t
    );
    -- Supabase dá ALL por padrão em tabelas novas do public: anon fica sem nada.
    execute format('revoke all on public.%I from anon', t);
  end loop;
end $$;


-- ─────────────────────────────────────────────────────────────
-- Verificação (rode depois, separado): supabase/consultas/fase1_drift_colunas.sql
-- deve voltar vazio (ou só com a função gerar_numero_venda, se a 004 não existir).
-- ─────────────────────────────────────────────────────────────


-- ============================================================
-- ROLLBACK (comentado) — CUIDADO: apagar as tabelas apaga os dados que forem
-- gravados nelas depois da 026. Faça backup antes.
-- ============================================================
-- drop table if exists public.vistoria_veiculo;
-- drop table if exists public.lembretes;
-- drop table if exists public.mensagens_padrao;
-- drop table if exists public.lead_interacoes;
-- alter table public.lojas drop column if exists descricao;
-- drop index if exists public.idx_leads_responsavel;
-- drop index if exists public.idx_leads_loja_created;
-- alter table public.leads drop column if exists criado_por;
-- alter table public.leads drop column if exists data_contato;
-- alter table public.leads drop column if exists responsavel_id;
-- alter table public.leads drop column if exists tags;
-- alter table public.leads drop column if exists veiculo_interesse;
-- alter table public.leads drop column if exists email;
