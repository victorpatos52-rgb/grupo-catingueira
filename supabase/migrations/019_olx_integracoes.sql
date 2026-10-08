-- ============================================================
-- MIGRATION 019 — Tokens OAuth2 da OLX por loja (Fase B)
-- Pendente — rode no SQL Editor do Supabase Dashboard.
--
-- Tabela separada de `lojas` de propósito: `lojas` tem SELECT público
-- (policy "público lê lojas", migration 017), então qualquer coluna de
-- token ali vazaria pela anon key.
--
-- RLS habilitado e NENHUMA policy: com RLS ligado e zero policies, o
-- Postgres nega tudo para anon/authenticated. Acesso só pelo service role
-- (que ignora RLS), sempre no servidor — rotas /api/integrations/olx/* e
-- page.tsx de /admin/configuracoes (que lê só as datas, nunca o token).
--
-- refresh_token/expires_at nullable: a doc da OLX
-- (developers.olx.com.br/anuncio/api/oauth.html) documenta a resposta do
-- /oauth/token só com `access_token` + `token_type` — sem `expires_in` nem
-- `refresh_token`. As colunas ficam pra caso a OLX passe a enviá-los.
-- ============================================================

create table olx_integracoes (
  loja_id uuid primary key references lojas(id) on delete cascade,
  access_token text not null,
  refresh_token text,
  expires_at timestamptz,
  autorizado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

alter table olx_integracoes enable row level security;

-- Defesa extra além do RLS sem policy: tira os grants padrão que o Supabase
-- dá a anon/authenticated em tabelas novas do schema public. Não é policy —
-- só garante que nem um `create policy` acidental no futuro exponha o token.
revoke all on olx_integracoes from anon, authenticated;
