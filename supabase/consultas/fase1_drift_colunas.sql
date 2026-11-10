-- ============================================================
-- FASE 1 — Drift: tabelas/colunas que o CÓDIGO usa × banco real (SOMENTE LEITURA)
-- Lista gerada a partir de uma varredura do código (src/). Mostra só o que
-- FALTA no banco (e o que quebra). Rode antes e depois da migration 026.
-- Resultado: tabela | coluna | situacao | onde_quebra
-- ============================================================

with esperado (tabela, coluna, onde_quebra) as (
  values
  -- leads (site /contato, CRM, detalhe do lead)
  ('leads', 'id', 'CRM'), ('leads', 'loja_id', 'CRM'), ('leads', 'veiculo_id', 'CRM'),
  ('leads', 'nome', 'CRM'), ('leads', 'telefone', 'CRM/site'), ('leads', 'origem', 'CRM/site'),
  ('leads', 'status', 'CRM/Kanban'), ('leads', 'observacoes', 'CRM/site'), ('leads', 'created_at', 'CRM'),
  ('leads', 'proximo_atendimento', 'detalhe do lead'), ('leads', 'cpf', 'detalhe do lead'),
  ('leads', 'data_nascimento', 'detalhe do lead'), ('leads', 'profissao', 'detalhe do lead'), ('leads', 'endereco', 'detalhe do lead'),
  ('leads', 'email', 'site /contato (submitContatoLead), Novo lead (criarLead), editar lead'),
  ('leads', 'veiculo_interesse', 'site /contato, Novo lead, editar lead'),
  ('leads', 'tags', 'site /contato, Novo lead'),
  ('leads', 'responsavel_id', 'Novo lead, trocar responsável, filtro "Meus leads"'),
  ('leads', 'data_contato', 'updateLead (aceita o campo)'),
  ('leads', 'criado_por', 'detalhe do lead ("criado por") — passa a ser gravado por criarLead'),
  -- lead_interacoes
  ('lead_interacoes', 'id', 'detalhe do lead'), ('lead_interacoes', 'lead_id', 'interações do lead'),
  ('lead_interacoes', 'loja_id', 'interações do lead'), ('lead_interacoes', 'usuario_id', 'interações do lead'),
  ('lead_interacoes', 'tipo', 'interações do lead'), ('lead_interacoes', 'descricao', 'interações do lead'),
  ('lead_interacoes', 'created_at', 'interações do lead'),
  -- mensagens_padrao
  ('mensagens_padrao', 'id', 'mensagens prontas no lead'), ('mensagens_padrao', 'loja_id', 'mensagens prontas no lead'),
  ('mensagens_padrao', 'titulo', 'mensagens prontas no lead'), ('mensagens_padrao', 'mensagem', 'mensagens prontas no lead'),
  ('mensagens_padrao', 'created_at', 'mensagens prontas no lead'),
  -- lembretes
  ('lembretes', 'id', 'dashboard (lembretes)'), ('lembretes', 'loja_id', 'dashboard'), ('lembretes', 'veiculo_id', 'dashboard'),
  ('lembretes', 'lead_id', 'dashboard'), ('lembretes', 'tipo', 'dashboard'), ('lembretes', 'data_lembrete', 'dashboard'),
  ('lembretes', 'mensagem', 'dashboard'), ('lembretes', 'concluido', 'dashboard / concluir lembrete'), ('lembretes', 'created_at', 'dashboard'),
  -- vistoria_veiculo
  ('vistoria_veiculo', 'id', 'aba Vistoria'), ('vistoria_veiculo', 'veiculo_id', 'aba Vistoria / transferência'),
  ('vistoria_veiculo', 'loja_id', 'aba Vistoria / transferência'), ('vistoria_veiculo', 'inspetor_id', 'salvar vistoria'),
  ('vistoria_veiculo', 'itens', 'aba Vistoria'), ('vistoria_veiculo', 'observacoes', 'aba Vistoria'),
  ('vistoria_veiculo', 'aprovado', 'aba Vistoria'), ('vistoria_veiculo', 'created_at', 'aba Vistoria'),
  -- lojas
  ('lojas', 'descricao', 'ficha do veículo (slogan; cai no texto padrão se faltar)'),
  ('lojas', 'slug', 'resolução da loja (LOJA_SLUG)'), ('lojas', 'dominio', 'resolução da loja'), ('lojas', 'cep', 'OLX'),
  ('lojas', 'cidade', 'configurações'), ('lojas', 'estado', 'configurações'), ('lojas', 'maps_url', 'localização'),
  ('lojas', 'imagens_landing', 'home'), ('lojas', 'favicon_url', 'favicon'), ('lojas', 'instagram', 'configurações'),
  -- usuarios_perfil / usuarios_lojas
  ('usuarios_perfil', 'modulos_permitidos', 'menu do admin'), ('usuarios_perfil', 'ativo', 'login/permissões'),
  ('usuarios_lojas', 'usuario_id', 'multi-loja (migration 024)'), ('usuarios_lojas', 'loja_id', 'multi-loja (migration 024)'),
  -- financeiro do veículo (o código usa a tabela no PLURAL)
  ('financeiro_veiculos', 'custo_aquisicao', 'aba Financeiro do veículo / DRE'),
  ('financeiro_veiculos', 'custos_adicionais', 'aba Financeiro do veículo / DRE'),
  ('financeiro_veiculos', 'preco_venda', 'aba Financeiro / DRE'), ('financeiro_veiculos', 'data_venda', 'aba Financeiro / DRE'),
  ('custos_manutencao', 'categoria', 'Checklist de serviços'), ('custos_manutencao', 'data', 'Checklist de serviços'),
  -- vendas (nova venda / detalhe / PDFs)
  ('vendas', 'numero_venda', 'vendas'), ('vendas', 'hora_venda', 'vendas'), ('vendas', 'hodometro_venda', 'vendas/PDF'),
  ('vendas', 'origem', 'vendas'), ('vendas', 'numero_fiscal', 'PDF venda'), ('vendas', 'inscricao_estadual', 'PDF venda'),
  ('vendas', 'documentos_urls', 'detalhe da venda (legado)'), ('vendas', 'valor_venda', 'vendas'), ('vendas', 'desconto', 'vendas'),
  ('vendas', 'valor_liquido', 'vendas'), ('vendas', 'vendedor_id', 'vendas/dashboard'), ('vendas', 'status', 'vendas'),
  ('vendas', 'comprador_nome', 'nova venda'), ('vendas', 'comprador_cpf', 'nova venda'), ('vendas', 'comprador_rg', 'nova venda'),
  ('vendas', 'comprador_identidade', 'nova venda'), ('vendas', 'comprador_data_nasc', 'nova venda'),
  ('vendas', 'comprador_estado_civil', 'nova venda'), ('vendas', 'comprador_profissao', 'nova venda'),
  ('vendas', 'comprador_endereco', 'nova venda'), ('vendas', 'comprador_numero', 'nova venda'),
  ('vendas', 'comprador_bairro', 'nova venda'), ('vendas', 'comprador_cep', 'nova venda'),
  ('vendas', 'comprador_cidade', 'nova venda'), ('vendas', 'comprador_uf', 'nova venda'),
  ('vendas', 'comprador_telefone', 'nova venda'), ('vendas', 'comprador_email', 'nova venda'),
  ('venda_pagamentos', 'detalhes', 'pagamentos da venda'), ('venda_pagamentos', 'veiculo_recebido_id', 'troca'),
  ('veiculo_recebido_venda', 'venda_pagamento_id', 'troca'),
  -- demais
  ('veiculo_transferencias', 'transferido_por', 'transferência / histórico'),
  ('veiculo_transferencias', 'data_transferencia', 'histórico de lojas'),
  ('anexos', 'criado_por', 'anexos'), ('lancamentos_financeiros', 'despesa_origem_id', 'financeiro'),
  ('lancamentos_financeiros', 'valor_retornado_banco', 'financeiro'), ('lancamentos_financeiros', 'recorrente', 'financeiro'),
  ('veiculos', 'rascunho', 'site/admin'), ('veiculos', 'excluido', 'site/admin'), ('veiculos', 'condicao', 'cadastro de veículo'),
  ('veiculos', 'ano_fabricacao', 'cadastro de veículo'), ('veiculos', 'ano_modelo', 'cadastro de veículo'),
  ('veiculos', 'publicar_olx', 'cadastro de veículo'), ('veiculos', 'publicar_marketplace', 'cadastro de veículo'),
  ('veiculos', 'proprietario_tipo', 'sócio'), ('veiculos', 'percentual_socio', 'sócio'), ('veiculos', 'valor_oferta', 'site'),
  ('veiculos', 'olx_versao_id', 'OLX')
),
faltando as (
  select e.tabela, e.coluna,
         case when to_regclass('public.' || e.tabela) is null then 'TABELA NÃO EXISTE' else 'COLUNA NÃO EXISTE' end as situacao,
         e.onde_quebra
  from esperado e
  where not exists (
    select 1 from information_schema.columns c
    where c.table_schema = 'public' and c.table_name = e.tabela and c.column_name = e.coluna
  )
),
funcoes as (
  select 'função', f.nome, 'FUNÇÃO NÃO EXISTE', f.uso
  from (values
    ('gerar_numero_venda', 'criar venda (número da venda — migration 004)'),
    ('transferir_veiculo', 'transferência (migration 025)')
  ) as f(nome, uso)
  where not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                    where n.nspname = 'public' and p.proname = f.nome)
)
select * from faltando
union all
select * from funcoes
order by 1, 2;
