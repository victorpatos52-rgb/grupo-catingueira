-- ============================================================
-- MIGRATION 004 — Função para gerar numero_venda
-- NÃO EXECUTAR AINDA — apenas para revisão.
-- Depende das sequences criadas na migration 001
-- (catingueira_venda_seq / felizardo_venda_seq) e da coluna
-- vendas.numero_venda (também da migration 001).
-- ============================================================

-- supabase-js não consegue chamar nextval() diretamente (não é uma
-- tabela/view exposta via PostgREST) — por isso expomos uma função
-- que resolve a sequence certa a partir do domínio da loja e retorna
-- o número já formatado (CAT-0001 / FLZ-0001).
create or replace function gerar_numero_venda(p_loja_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dominio text;
  v_seq text;
  v_prefixo text;
  v_num bigint;
begin
  select dominio into v_dominio from lojas where id = p_loja_id;

  if v_dominio ilike '%felizardo%' then
    v_seq := 'felizardo_venda_seq';
    v_prefixo := 'FLZ';
  else
    v_seq := 'catingueira_venda_seq';
    v_prefixo := 'CAT';
  end if;

  execute format('select nextval(%L)', v_seq) into v_num;
  return v_prefixo || '-' || lpad(v_num::text, 4, '0');
end;
$$;

-- Só a Server Action (chamada com a service role key) deve poder
-- gerar números de venda — não expor isso para anon/authenticated.
revoke execute on function gerar_numero_venda(uuid) from public;
grant execute on function gerar_numero_venda(uuid) to service_role;
