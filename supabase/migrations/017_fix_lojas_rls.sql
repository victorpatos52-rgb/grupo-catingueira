-- ============================================================
-- MIGRATION 017 — Recria as policies de RLS de `lojas` (estavam ausentes)
-- Pendente — rode no SQL Editor do Supabase Dashboard.
--
-- Diagnóstico confirmado direto no Postgres: `lojas` tem
-- relrowsecurity = true mas ZERO policies cadastradas. Com RLS habilitado
-- e nenhuma policy, o Postgres nega por padrão qualquer SELECT/UPDATE feito
-- com a anon/authenticated key — inclusive pra admin com loja_id correto,
-- o que reproduz exatamente o bloqueio investigado em /admin/configuracoes.
-- Não sabemos como/quando as duas policies documentadas em
-- schema.sql:37-46 ("público lê lojas" e "gerente atualiza própria loja")
-- deixaram de existir no banco — só que hoje elas não existem.
--
-- Colunas usadas abaixo foram confirmadas direto no banco antes de escrever
-- esta migration (não copiadas de schema.sql às cegas, que já mostrou
-- estar desatualizado neste projeto antes — ver migration 016):
--   usuarios_perfil: id, loja_id, perfil, ativo
--   lojas: id
--
-- ativo = true na policy de UPDATE: usuário desativado não deve conseguir
-- editar a loja mesmo com loja_id/perfil corretos (schema.sql:37-46 não
-- tinha essa condição — adicionada aqui por pedido explícito).
-- ============================================================

drop policy if exists "público lê lojas" on lojas;
drop policy if exists "gerente atualiza própria loja" on lojas;

create policy "público lê lojas"
  on lojas for select
  using (true);

-- USING controla quais linhas o UPDATE consegue encontrar/mirar; sem um
-- WITH CHECK explícito, um UPDATE que tentasse trocar o loja_id implícito
-- (ex.: via alguma escrita futura que altere `lojas.id`, ou qualquer regra
-- que dependa da linha NOVA em vez da linha antiga) não teria a mesma
-- validação — Postgres só reaproveita o USING como CHECK quando a policy é
-- criada num único CREATE POLICY sem CHECK, e isso pode ter sido perdido
-- justamente na recriação que gerou o drift original. Deixando os dois
-- explícitos aqui não depende de reaproveitamento implícito.
create policy "gerente atualiza própria loja"
  on lojas for update
  using (
    exists (
      select 1 from usuarios_perfil up
      where up.id = auth.uid()
        and up.loja_id = lojas.id
        and up.ativo = true
        and up.perfil in ('gerente', 'diretor', 'admin')
    )
  )
  with check (
    exists (
      select 1 from usuarios_perfil up
      where up.id = auth.uid()
        and up.loja_id = lojas.id
        and up.ativo = true
        and up.perfil in ('gerente', 'diretor', 'admin')
    )
  );
