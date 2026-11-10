-- ============================================================
-- FKs entre as tabelas usadas em embeds do Supabase (SOMENTE LEITURA)
-- Para conferir os nomes reais das constraints usados nos hints
-- (ex.: lojas!usuarios_perfil_loja_id_fkey) e achar embeds ambíguos.
--
-- Resultado: constraint | tabela | colunas | tabela_referenciada | colunas_referenciadas | em_chave_composta
--   em_chave_composta = true → a FK faz parte da PK/UNIQUE composta da tabela.
--   O PostgREST trata essas tabelas como JUNÇÃO (relação muitos-para-muitos):
--   ex.: usuarios_lojas cria um 2º caminho usuarios_perfil ↔ lojas.
--
-- Embed é ambíguo quando, entre as mesmas duas tabelas, há:
--   - mais de uma FK direta (ex.: leads.responsavel_id e leads.criado_por → usuarios_perfil), ou
--   - uma FK direta + uma tabela de junção (ex.: usuarios_perfil.loja_id + usuarios_lojas).
-- A segunda consulta (comentada) lista só os pares com mais de um caminho.
-- ============================================================

with fks as (
  select
    c.conname                                    as constraint_nome,
    rel.relname                                  as tabela,
    (select string_agg(a.attname, ', ' order by k.ord)
       from unnest(c.conkey) with ordinality k(attnum, ord)
       join pg_attribute a on a.attrelid = c.conrelid and a.attnum = k.attnum) as colunas,
    ref.relname                                  as tabela_referenciada,
    (select string_agg(a.attname, ', ' order by k.ord)
       from unnest(c.confkey) with ordinality k(attnum, ord)
       join pg_attribute a on a.attrelid = c.confrelid and a.attnum = k.attnum) as colunas_referenciadas,
    exists (
      select 1 from pg_constraint pk
      where pk.conrelid = c.conrelid
        and pk.contype in ('p', 'u')
        and array_length(pk.conkey, 1) > 1
        and c.conkey <@ pk.conkey
    )                                            as em_chave_composta
  from pg_constraint c
  join pg_class rel     on rel.oid = c.conrelid
  join pg_namespace n   on n.oid = rel.relnamespace
  join pg_class ref     on ref.oid = c.confrelid
  where c.contype = 'f'
    and n.nspname = 'public'
    and (rel.relname in (
           'usuarios_perfil', 'usuarios_lojas', 'lojas', 'leads', 'lead_interacoes', 'lembretes',
           'vendas', 'venda_pagamentos', 'venda_promissorias', 'lancamentos_financeiros',
           'veiculo_transferencias', 'veiculo_recebido_venda', 'veiculos', 'anexos',
           'vistoria_veiculo', 'mensagens_padrao', 'financeiro_veiculos', 'financeiro_veiculo',
           'custos_manutencao', 'veiculo_aquisicao')
      or ref.relname in ('usuarios_perfil', 'lojas', 'veiculos', 'vendas', 'leads'))
)
select * from fks
order by tabela, tabela_referenciada, constraint_nome;

-- Pares de tabelas com MAIS DE UM caminho (candidatos a embed ambíguo):
-- with fks as ( ...mesma CTE acima... ),
-- diretos as (
--   select least(tabela, tabela_referenciada) a, greatest(tabela, tabela_referenciada) b, constraint_nome as caminho
--   from fks
-- ),
-- juncoes as (
--   select least(f1.tabela_referenciada, f2.tabela_referenciada) a,
--          greatest(f1.tabela_referenciada, f2.tabela_referenciada) b,
--          'junção ' || f1.tabela as caminho
--   from fks f1 join fks f2 on f1.tabela = f2.tabela and f1.constraint_nome < f2.constraint_nome
--   where f1.em_chave_composta and f2.em_chave_composta
-- )
-- select a, b, count(*) as caminhos, string_agg(caminho, ' | ') as quais
-- from (select * from diretos union all select * from juncoes) x
-- group by a, b having count(*) > 1
-- order by a, b;
