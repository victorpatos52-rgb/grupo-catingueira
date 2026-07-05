-- ============================================================
-- MIGRATION 005 — Backfill de numero_venda em vendas existentes
-- NÃO EXECUTAR AINDA — apenas para revisão.
-- Depende da migration 001 (coluna vendas.numero_venda + sequences
-- catingueira_venda_seq/felizardo_venda_seq) já aplicada.
-- NÃO depende da migration 004 (função gerar_numero_venda) — a lógica
-- de prefixo por loja é replicada aqui em SQL puro de propósito, para
-- o backfill não "gastar" valores da sequence antes da hora (o ajuste
-- das sequences acontece só no final, como passo explícito).
-- ============================================================

-- numero_negociacao NÃO é tocada por esta migration — permanece intacta,
-- só deixa de ser lida/escrita pelo código da aplicação a partir de agora.

do $$
declare
  loja        record;
  v_prefixo   text;
  v_seq       text;
  v_max_atual bigint;
begin
  for loja in select id, dominio from lojas loop

    -- Mesmo critério de prefixo já usado em gerar_numero_venda() (migration 004)
    if loja.dominio ilike '%felizardo%' then
      v_prefixo := 'FLZ';
      v_seq     := 'felizardo_venda_seq';
    else
      v_prefixo := 'CAT';
      v_seq     := 'catingueira_venda_seq';
    end if;

    -- Maior número já em uso para este prefixo/loja (cobre o caso de já
    -- existirem vendas numeradas por gerar_numero_venda() antes deste backfill rodar)
    select coalesce(max(substring(numero_venda from '\d+')::int), 0)
      into v_max_atual
      from vendas
     where loja_id = loja.id
       and numero_venda like v_prefixo || '-%';

    -- Backfill sequencial das vendas SEM numero_venda, em ordem cronológica
    -- (created_at; se for nulo, cai para data_venda) — continua a numeração
    -- a partir do maior número já em uso, nunca reaproveita/pula números.
    with alvo as (
      select id,
             row_number() over (
               order by coalesce(created_at, data_venda::timestamptz), id
             ) as rn
        from vendas
       where loja_id = loja.id
         and numero_venda is null
    )
    update vendas v
       set numero_venda = v_prefixo || '-' || lpad((v_max_atual + alvo.rn)::text, 4, '0')
      from alvo
     where v.id = alvo.id;

    -- Recalcula o máximo já usado (agora incluindo o backfill) e ajusta a
    -- sequence para que o próximo nextval() nunca colida com um número já gravado.
    select coalesce(max(substring(numero_venda from '\d+')::int), 0)
      into v_max_atual
      from vendas
     where loja_id = loja.id
       and numero_venda like v_prefixo || '-%';

    -- setval(seq, N, true)  -> próximo nextval() retorna N+1
    -- setval(seq, 1, false) -> próximo nextval() retorna 1 (loja sem nenhuma venda numerada ainda)
    perform setval(v_seq, greatest(v_max_atual, 1), v_max_atual > 0);

  end loop;
end $$;
