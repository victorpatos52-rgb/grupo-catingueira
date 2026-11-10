-- ============================================================
-- FASE 1 — Cadastros que PODEM ter ido para a loja errada (SOMENTE LEITURA)
-- Versão adaptativa: funciona com o schema real (leads NÃO tem criado_por).
--
-- Causa do bug: para admin/diretor SEM cookie `loja_ativa` válido (1º acesso,
-- outro navegador/celular, cookie expirado após 7 dias), o seletor mostrava a
-- 1ª loja em ordem alfabética (CATINGUEIRA), mas os cadastros iam para a loja
-- padrão do usuário (usuarios_perfil.loja_id). Se a loja padrão do usuário é a
-- FELIZARDO, cadastros feitos "na Catingueira" foram gravados na Felizardo.
--
-- Pelo banco NÃO dá para saber qual loja estava no seletor no momento. Esta
-- consulta lista CANDIDATOS para conferência manual: registros atribuídos a
-- admin/diretor cuja loja gravada = loja padrão do autor, quando essa loja não
-- é a 1ª em ordem alfabética (exatamente o caso em que rótulo e dado divergiam).
--
-- AUTOR — o que o banco real permite (limitações):
--   leads:  no banco real (nov/2026) não havia coluna de autor; a 026 cria
--           leads.criado_por (gravado por criarLead após o deploy — só leads
--           NOVOS). Para os antigos, usa, nesta ordem:
--             0) leads.criado_por (se existir e estiver preenchido);
--             1) usuario_id da PRIMEIRA interação em lead_interacoes — é quem
--                primeiro registrou algo no lead, não necessariamente quem o
--                cadastrou (lead do site tem interação com usuario_id nulo);
--             2) responsavel_id do lead — é o responsável atribuído, que pode
--                ter sido escolhido por outra pessoa.
--           A coluna fonte_autor diz qual dos dois foi usado. A partir do
--           deploy desta branch, cadastro manual de lead grava uma interação
--           com o usuário que cadastrou (fica exato daqui para frente).
--   lancamentos_financeiros: criado_por (se a coluna existir).
--   vendas: vendedor_id (o vendedor escolhido, geralmente quem lançou).
--   veiculos: não há autor — entram TODOS os veículos das lojas afetadas no
--             período, para revisão.
-- Tabela/coluna ausente → linha "AVISO".
--
-- Ajuste o período em `desde` (padrão: 180 dias).
-- Resultado: tipo | registro_id | loja_gravada | autor | fonte_autor | criado_em | descricao
-- ============================================================

create or replace function pg_temp.fase1_suspeitos(desde timestamptz)
returns table (
  tipo text, registro_id text, loja_id uuid, autor_id uuid,
  fonte_autor text, criado_em timestamptz, descricao text
)
language plpgsql
as $fn$
declare
  tem_interacoes boolean;
  tem_responsavel boolean;
  tem_criado_por boolean;
  -- Autores do caso afetado: admin/diretor com loja padrão ≠ 1ª loja alfabética.
  autores constant text := '(select up.id, up.loja_id from public.usuarios_perfil up
      where up.perfil in (''admin'', ''diretor'')
        and up.loja_id <> (select l.id from public.lojas l order by l.nome limit 1))';
begin

  -- LEADS --------------------------------------------------------------------
  if to_regclass('public.leads') is null then
    tipo := 'lead'; fonte_autor := 'AVISO'; descricao := 'tabela leads não existe';
    registro_id := null; loja_id := null; autor_id := null; criado_em := null;
    return next;
  else
    select to_regclass('public.lead_interacoes') is not null
           and (select count(*) = 2 from information_schema.columns
                where table_schema = 'public' and table_name = 'lead_interacoes'
                  and column_name in ('lead_id', 'usuario_id'))
      into tem_interacoes;
    select exists (select 1 from information_schema.columns
                   where table_schema = 'public' and table_name = 'leads' and column_name = 'responsavel_id')
      into tem_responsavel;
    select exists (select 1 from information_schema.columns
                   where table_schema = 'public' and table_name = 'leads' and column_name = 'criado_por')
      into tem_criado_por;

    if not tem_interacoes and not tem_responsavel and not tem_criado_por then
      tipo := 'lead'; fonte_autor := 'AVISO';
      descricao := 'sem leads.criado_por, lead_interacoes.usuario_id ou leads.responsavel_id — impossível atribuir autor';
      registro_id := null; loja_id := null; autor_id := null; criado_em := null;
      return next;
    else
      return query execute format($q$
        with base as (
          select l.id, l.loja_id,
                 %s as criador,
                 %s as primeira_interacao,
                 %s as responsavel,
                 coalesce(to_jsonb(l) ->> 'created_at', to_jsonb(l) ->> 'criado_em')::timestamptz as criado,
                 concat_ws(' — ', to_jsonb(l) ->> 'nome', to_jsonb(l) ->> 'telefone', to_jsonb(l) ->> 'origem') as descr
          from public.leads l
        )
        select 'lead'::text, b.id::text, b.loja_id,
               coalesce(b.criador, b.primeira_interacao, b.responsavel),
               case when b.criador is not null then 'criado_por'
                    when b.primeira_interacao is not null then '1ª interação' else 'responsável' end,
               b.criado, b.descr
        from base b
        join %s a on a.id = coalesce(b.criador, b.primeira_interacao, b.responsavel) and a.loja_id = b.loja_id
        where b.criado is null or b.criado >= $1
      $q$,
        case when tem_criado_por then 'l.criado_por' else 'null::uuid' end,
        case when tem_interacoes then
          '(select li.usuario_id from public.lead_interacoes li
             where li.lead_id = l.id and li.usuario_id is not null
             order by coalesce(to_jsonb(li) ->> ''created_at'', to_jsonb(li) ->> ''criado_em'') nulls last
             limit 1)'
        else 'null::uuid' end,
        case when tem_responsavel then 'l.responsavel_id' else 'null::uuid' end,
        autores
      ) using desde;
    end if;
  end if;

  -- LANÇAMENTOS FINANCEIROS --------------------------------------------------
  if to_regclass('public.lancamentos_financeiros') is null
     or not exists (select 1 from information_schema.columns
                    where table_schema = 'public' and table_name = 'lancamentos_financeiros' and column_name = 'criado_por') then
    tipo := 'lançamento financeiro'; fonte_autor := 'AVISO';
    descricao := 'tabela lancamentos_financeiros ou coluna criado_por não existe — pulado';
    registro_id := null; loja_id := null; autor_id := null; criado_em := null;
    return next;
  else
    return query execute format($q$
      select 'lançamento financeiro'::text, lf.id::text, lf.loja_id, lf.criado_por, 'criado_por'::text,
             coalesce(to_jsonb(lf) ->> 'criado_em', to_jsonb(lf) ->> 'created_at')::timestamptz,
             concat_ws(' — ', to_jsonb(lf) ->> 'tipo', to_jsonb(lf) ->> 'categoria', to_jsonb(lf) ->> 'valor', to_jsonb(lf) ->> 'descricao')
      from public.lancamentos_financeiros lf
      join %s a on a.id = lf.criado_por and a.loja_id = lf.loja_id
      where coalesce(to_jsonb(lf) ->> 'criado_em', to_jsonb(lf) ->> 'created_at')::timestamptz >= $1
    $q$, autores) using desde;
  end if;

  -- VENDAS -------------------------------------------------------------------
  if to_regclass('public.vendas') is null
     or not exists (select 1 from information_schema.columns
                    where table_schema = 'public' and table_name = 'vendas' and column_name = 'vendedor_id') then
    tipo := 'venda'; fonte_autor := 'AVISO';
    descricao := 'tabela vendas ou coluna vendedor_id não existe — pulado';
    registro_id := null; loja_id := null; autor_id := null; criado_em := null;
    return next;
  else
    return query execute format($q$
      select 'venda'::text, vd.id::text, vd.loja_id, vd.vendedor_id, 'vendedor_id'::text,
             coalesce(to_jsonb(vd) ->> 'created_at', to_jsonb(vd) ->> 'criado_em')::timestamptz,
             concat_ws(' — ', to_jsonb(vd) ->> 'numero_venda', to_jsonb(vd) ->> 'status', to_jsonb(vd) ->> 'comprador_nome')
      from public.vendas vd
      join %s a on a.id = vd.vendedor_id and a.loja_id = vd.loja_id
      where coalesce(to_jsonb(vd) ->> 'created_at', to_jsonb(vd) ->> 'criado_em')::timestamptz >= $1
    $q$, autores) using desde;
  end if;

  -- VEÍCULOS (sem autor: todos das lojas afetadas no período) -----------------
  return query execute format($q$
    select 'veículo (sem autor — conferir)'::text, v.id::text, v.loja_id, null::uuid, 'sem autor'::text,
           (to_jsonb(v) ->> 'created_at')::timestamptz,
           concat_ws(' ', v.marca, v.modelo, v.ano::text, nullif(to_jsonb(v) ->> 'placa', ''))
    from public.veiculos v
    where v.loja_id in (select a.loja_id from %s a)
      and coalesce((to_jsonb(v) ->> 'excluido')::boolean, false) = false
      and (to_jsonb(v) ->> 'created_at')::timestamptz >= $1
  $q$, autores) using desde;
end
$fn$;

select s.tipo,
       s.registro_id,
       coalesce(l.nome, s.loja_id::text) as loja_gravada,
       u.nome as autor,
       s.fonte_autor,
       s.criado_em,
       s.descricao
from pg_temp.fase1_suspeitos(now() - interval '180 days') s
left join public.lojas l on l.id = s.loja_id
left join public.usuarios_perfil u on u.id = s.autor_id
order by (s.fonte_autor = 'AVISO') desc, s.criado_em desc nulls last;

-- Para corrigir um registro que caiu na loja errada:
--   veículo → "Transferir" no admin (move financeiro/custos e grava histórico).
--   lead / lançamento / venda → me passe os ids; preparo o UPDATE específico
--   (venda tem pagamentos/promissórias ligados e precisa de cuidado).
