-- ============================================================
-- GRUPO CATINGUEIRA — Schema Supabase
-- Execute no SQL Editor do Supabase Dashboard
-- ============================================================

create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────────────────────────
-- LOJAS
-- ─────────────────────────────────────────────────────────────
create table lojas (
  id             uuid primary key default uuid_generate_v4(),
  nome           text not null,
  dominio        text not null unique,
  whatsapp       text not null,
  cor_primaria   text not null default '#F5C842',
  cor_secundaria text not null default '#3D3D3D',
  logo_url       text,
  endereco       text,
  cidade         text,
  estado         text,
  maps_url       text,
  descricao      text,
  sobre          text,
  missao         text,
  visao          text,
  horario        text,
  instagram      text,
  created_at     timestamptz not null default now()
);

alter table lojas enable row level security;

create policy "público lê lojas"
  on lojas for select using (true);

create policy "gerente atualiza própria loja"
  on lojas for update
  using (
    exists (
      select 1 from usuarios_perfil up
      where up.id = auth.uid()
        and up.loja_id = lojas.id
        and up.perfil in ('gerente', 'diretor', 'admin')
    )
  );

-- ─────────────────────────────────────────────────────────────
-- USUARIOS_PERFIL
-- id IS the primary key AND the FK to auth.users (same UUID)
-- ─────────────────────────────────────────────────────────────
create table usuarios_perfil (
  id         uuid primary key references auth.users(id) on delete cascade,
  loja_id    uuid not null references lojas(id) on delete cascade,
  perfil     text not null check (perfil in ('vendedor', 'gerente', 'diretor', 'admin')),
  nome       text not null,
  ativo      boolean not null default true,
  created_at timestamptz not null default now()
);

alter table usuarios_perfil enable row level security;

create policy "usuário lê próprio perfil"
  on usuarios_perfil for select
  using (auth.uid() = id);

create policy "diretor/admin gerencia perfis"
  on usuarios_perfil for all
  using (
    exists (
      select 1 from usuarios_perfil up
      where up.id = auth.uid()
        and up.perfil in ('diretor', 'admin')
    )
  );

-- ─────────────────────────────────────────────────────────────
-- VEICULOS
-- ─────────────────────────────────────────────────────────────
create table veiculos (
  id             uuid primary key default uuid_generate_v4(),
  loja_id        uuid not null references lojas(id) on delete cascade,
  marca          text not null,
  modelo         text not null,
  versao         text,
  ano            integer not null,
  cor            text not null,
  km             integer not null default 0,
  combustivel    text not null,
  cambio         text not null,
  preco          numeric(12,2) not null,
  placa          text,
  descricao      text,
  opcionais      text[] not null default '{}',
  status         text not null default 'disponivel'
                   check (status in ('disponivel','reservado','vendido','manutencao')),
  destaque       boolean not null default false,
  fotos          text[] not null default '{}',
  data_aquisicao date not null default current_date,
  created_at     timestamptz not null default now()
);

alter table veiculos enable row level security;

create policy "público vê disponíveis"
  on veiculos for select
  using (status = 'disponivel');

create policy "equipe lê todos da loja"
  on veiculos for select
  using (
    exists (select 1 from usuarios_perfil up where up.id = auth.uid() and up.loja_id = veiculos.loja_id)
  );

create policy "equipe insere veículos"
  on veiculos for insert
  with check (
    exists (select 1 from usuarios_perfil up where up.id = auth.uid() and up.loja_id = veiculos.loja_id)
  );

create policy "equipe atualiza veículos"
  on veiculos for update
  using (
    exists (select 1 from usuarios_perfil up where up.id = auth.uid() and up.loja_id = veiculos.loja_id)
  );

create policy "equipe deleta veículos"
  on veiculos for delete
  using (
    exists (select 1 from usuarios_perfil up where up.id = auth.uid() and up.loja_id = veiculos.loja_id)
  );

-- ─────────────────────────────────────────────────────────────
-- FINANCEIRO_VEICULOS
-- ─────────────────────────────────────────────────────────────
create table financeiro_veiculos (
  id                uuid primary key default uuid_generate_v4(),
  veiculo_id        uuid not null references veiculos(id) on delete cascade,
  loja_id           uuid not null references lojas(id) on delete cascade,
  custo_aquisicao   numeric(12,2) not null default 0,
  custos_adicionais jsonb not null default '[]',
  preco_venda       numeric(12,2),
  data_venda        date,
  created_at        timestamptz not null default now()
);

alter table financeiro_veiculos enable row level security;

create policy "gerente acessa financeiro"
  on financeiro_veiculos for all
  using (
    exists (
      select 1 from usuarios_perfil up
      where up.id = auth.uid()
        and up.loja_id = financeiro_veiculos.loja_id
        and up.perfil in ('gerente', 'diretor', 'admin')
    )
  );

-- ─────────────────────────────────────────────────────────────
-- LEADS
-- ─────────────────────────────────────────────────────────────
create table leads (
  id                 uuid primary key default uuid_generate_v4(),
  loja_id            uuid not null references lojas(id) on delete cascade,
  nome               text not null,
  telefone           text not null,
  email              text,
  veiculo_id         uuid references veiculos(id) on delete set null,
  veiculo_interesse  text,
  responsavel_id     uuid references auth.users(id) on delete set null,
  tags               text[] not null default '{}',
  origem             text not null default 'site'
                       check (origem in ('site','whatsapp','instagram','indicacao','outros')),
  status             text not null default 'novo'
                       check (status in ('novo','contato_feito','negociando','fechado','perdido')),
  observacoes        text,
  data_contato       timestamptz,
  created_at         timestamptz not null default now()
);

alter table leads enable row level security;

create policy "público cria lead"
  on leads for insert with check (true);

create policy "equipe gerencia leads"
  on leads for all
  using (
    exists (select 1 from usuarios_perfil up where up.id = auth.uid() and up.loja_id = leads.loja_id)
  );

-- ─────────────────────────────────────────────────────────────
-- LEAD_INTERACOES
-- ─────────────────────────────────────────────────────────────
create table lead_interacoes (
  id          uuid primary key default uuid_generate_v4(),
  lead_id     uuid not null references leads(id) on delete cascade,
  loja_id     uuid not null references lojas(id) on delete cascade,
  usuario_id  uuid references auth.users(id) on delete set null,
  tipo        text not null check (tipo in ('ligacao','whatsapp','visita','email','observacao','status')),
  descricao   text not null,
  created_at  timestamptz not null default now()
);

alter table lead_interacoes enable row level security;

create policy "equipe gerencia interações"
  on lead_interacoes for all
  using (
    exists (select 1 from usuarios_perfil up where up.id = auth.uid() and up.loja_id = lead_interacoes.loja_id)
  );

-- ─────────────────────────────────────────────────────────────
-- MENSAGENS_PADRAO
-- ─────────────────────────────────────────────────────────────
create table mensagens_padrao (
  id         uuid primary key default uuid_generate_v4(),
  loja_id    uuid not null references lojas(id) on delete cascade,
  titulo     text not null,
  mensagem   text not null,
  created_at timestamptz not null default now()
);

alter table mensagens_padrao enable row level security;

create policy "equipe gerencia mensagens padrão"
  on mensagens_padrao for all
  using (
    exists (select 1 from usuarios_perfil up where up.id = auth.uid() and up.loja_id = mensagens_padrao.loja_id)
  );

-- ─────────────────────────────────────────────────────────────
-- LEMBRETES
-- ─────────────────────────────────────────────────────────────
create table lembretes (
  id              uuid primary key default uuid_generate_v4(),
  loja_id         uuid not null references lojas(id) on delete cascade,
  veiculo_id      uuid references veiculos(id) on delete cascade,
  lead_id         uuid references leads(id) on delete cascade,
  titulo          text not null,
  descricao       text,
  data_lembrete   date not null,
  concluido       boolean not null default false,
  created_at      timestamptz not null default now()
);

alter table lembretes enable row level security;

create policy "equipe gerencia lembretes"
  on lembretes for all
  using (
    exists (select 1 from usuarios_perfil up where up.id = auth.uid() and up.loja_id = lembretes.loja_id)
  );

-- ─────────────────────────────────────────────────────────────
-- VISTORIA_VEICULO
-- ─────────────────────────────────────────────────────────────
create table vistoria_veiculo (
  id          uuid primary key default uuid_generate_v4(),
  veiculo_id  uuid not null references veiculos(id) on delete cascade,
  loja_id     uuid not null references lojas(id) on delete cascade,
  itens       jsonb not null default '{}',
  observacoes text,
  aprovado    boolean not null default true,
  created_at  timestamptz not null default now()
);

alter table vistoria_veiculo enable row level security;

create policy "equipe gerencia vistorias"
  on vistoria_veiculo for all
  using (
    exists (select 1 from usuarios_perfil up where up.id = auth.uid() and up.loja_id = vistoria_veiculo.loja_id)
  );

-- ─────────────────────────────────────────────────────────────
-- DADOS INICIAIS (ajuste antes de executar)
-- ─────────────────────────────────────────────────────────────
insert into lojas (nome, dominio, whatsapp, cor_primaria, cor_secundaria)
values
  ('Catingueira Multimarcas', 'catingueira.com.br', '83999671729', '#F5C842', '#3D3D3D'),
  ('Felizardo Veículos',      'felizardo.com.br',   '83991546852', '#1B3A6B', '#C8D0DC');

-- ─────────────────────────────────────────────────────────────
-- STORAGE
-- Execute no Dashboard > Storage > New bucket:
--   Nome: veiculos-fotos
--   Público: sim (enable public access)
--
-- Políticas de upload (authenticated users):
-- ─────────────────────────────────────────────────────────────
-- INSERT policy:
-- bucket_id = 'veiculos-fotos' AND auth.role() = 'authenticated'
--
-- DELETE policy:
-- bucket_id = 'veiculos-fotos' AND auth.uid() = owner::uuid
