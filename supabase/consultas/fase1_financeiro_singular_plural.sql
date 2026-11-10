-- ============================================================
-- FASE 1 — financeiro_veiculo (singular) × financeiro_veiculos (plural)
-- SOMENTE LEITURA. Não apaga nem migra nada.
--
-- O CÓDIGO usa só financeiro_veiculos (PLURAL): aba Financeiro do veículo
-- (leitura e gravação: saveAquisicao / saveValorVenda), /admin/financeiro
-- (DRE), exclusão de veículo (contagem) e transferência (move loja_id).
-- A tabela no SINGULAR não é lida nem gravada por nenhuma tela — é legado.
--
-- Rode as 3 partes separadamente (o SQL Editor mostra só o último resultado):
-- ============================================================

-- 1) Resumo: linhas em cada tabela e sobreposição por veículo
select
  (select count(*) from public.financeiro_veiculo)  as linhas_singular,
  (select count(*) from public.financeiro_veiculos) as linhas_plural,
  (select count(distinct veiculo_id) from public.financeiro_veiculo)  as veiculos_singular,
  (select count(distinct veiculo_id) from public.financeiro_veiculos) as veiculos_plural,
  (select count(*) from (select veiculo_id from public.financeiro_veiculo
                         intersect
                         select veiculo_id from public.financeiro_veiculos) x) as veiculos_nas_duas,
  (select count(*) from (select veiculo_id from public.financeiro_veiculo
                         except
                         select veiculo_id from public.financeiro_veiculos) x) as so_no_singular,
  (select count(*) from (select veiculo_id from public.financeiro_veiculos
                         except
                         select veiculo_id from public.financeiro_veiculo) x) as so_no_plural,
  (select count(*) from (select veiculo_id from public.financeiro_veiculo group by veiculo_id having count(*) > 1) x) as veiculos_duplicados_singular,
  (select count(*) from (select veiculo_id from public.financeiro_veiculos group by veiculo_id having count(*) > 1) x) as veiculos_duplicados_plural;

-- 2) Lado a lado (até 50 veículos que aparecem em pelo menos uma das duas)
-- select v.id as veiculo_id,
--        concat_ws(' ', v.marca, v.modelo, v.ano::text, v.placa) as veiculo,
--        l.nome as loja_veiculo,
--        s.loja_id = v.loja_id as singular_mesma_loja,
--        s.custo_aquisicao  as sing_custo_aquisicao,
--        coalesce(s.custo_manutencao,0) + coalesce(s.custo_transporte,0) + coalesce(s.custo_estetica,0)
--          + coalesce(s.custo_documentacao,0) + coalesce(s.outros_custos,0) as sing_custos_extras,
--        s.preco_venda as sing_preco_venda, s.data_venda as sing_data_venda,
--        s.forma_pagamento as sing_forma_pagamento, s.vendedor_id as sing_vendedor_id,
--        p.loja_id = v.loja_id as plural_mesma_loja,
--        p.custo_aquisicao as plur_custo_aquisicao,
--        (select coalesce(sum((c ->> 'valor')::numeric), 0) from jsonb_array_elements(coalesce(p.custos_adicionais, '[]'::jsonb)) c) as plur_custos_extras,
--        p.preco_venda as plur_preco_venda, p.data_venda as plur_data_venda
-- from public.veiculos v
-- join public.lojas l on l.id = v.loja_id
-- left join public.financeiro_veiculo  s on s.veiculo_id = v.id
-- left join public.financeiro_veiculos p on p.veiculo_id = v.id
-- where s.id is not null or p.id is not null
-- order by (s.id is not null and p.id is not null) desc, v.created_at desc
-- limit 50;

-- 3) Só no singular (dados que o sistema hoje NÃO mostra em lugar nenhum)
-- select s.*, concat_ws(' ', v.marca, v.modelo, v.ano::text, v.placa) as veiculo
-- from public.financeiro_veiculo s
-- left join public.veiculos v on v.id = s.veiculo_id
-- where not exists (select 1 from public.financeiro_veiculos p where p.veiculo_id = s.veiculo_id)
-- order by s.created_at desc;


-- ============================================================
-- PROPOSTA DE UNIFICAÇÃO (NÃO RODAR — só para discussão)
-- Manter financeiro_veiculos (plural) como a tabela única, porque é a que o
-- código usa e guarda os custos extras como lista (custos_adicionais jsonb).
--   a) Para veículos SÓ no singular: inserir no plural com
--      custo_aquisicao, preco_venda, data_venda e custos_adicionais montado a
--      partir das colunas itemizadas:
--        [{"descricao":"Manutenção","valor":custo_manutencao},
--         {"descricao":"Transporte","valor":custo_transporte},
--         {"descricao":"Estética","valor":custo_estetica},
--         {"descricao":"Documentação","valor":custo_documentacao},
--         {"descricao":"Outros","valor":outros_custos}]  (só os > 0)
--      loja_id = veiculos.loja_id (a atual do carro).
--   b) Para veículos NAS DUAS: comparar no relatório 2 e decidir caso a caso
--      (provavelmente o plural é o mais recente, porque é o que a tela grava).
--   c) forma_pagamento / vendedor_id do singular: hoje vêm da tabela vendas;
--      só preservar se houver veículo vendido sem venda registrada.
--   d) Depois de conferido: renomear o singular para financeiro_veiculo_legado
--      (sem apagar) e só remover em outra fase.
-- ============================================================
