-- ============================================================
-- MIGRATION 003 — Bucket de documentos do veículo
-- NÃO EXECUTAR AINDA — apenas para revisão.
-- Independente das migrations 001 e 002, mas a feature de
-- "Documentação" no admin só funciona com esta + a 001 aplicadas
-- (usa a tabela `anexos`, criada na 001).
-- ============================================================

-- Bucket PRIVADO (public = false) — diferente do "veiculos-fotos",
-- que é público. Downloads são feitos via signed URL gerada no
-- servidor com a service role key, então não é necessário expor
-- os arquivos publicamente.
insert into storage.buckets (id, name, public)
values ('veiculos-documentos', 'veiculos-documentos', false)
on conflict (id) do nothing;

-- Mesmo nível de granularidade já usado nas políticas do bucket
-- "veiculos-fotos" (schema.sql): qualquer usuário autenticado pode
-- enviar/ler/excluir. Não há isolamento por loja no Storage — quem
-- quiser reforçar isso precisaria validar o prefixo do path (loja_id/...)
-- dentro da própria policy, o que não foi feito aqui para manter
-- paridade com o bucket existente.
create policy "equipe envia documentos"
  on storage.objects for insert
  with check (bucket_id = 'veiculos-documentos' and auth.role() = 'authenticated');

create policy "equipe le documentos"
  on storage.objects for select
  using (bucket_id = 'veiculos-documentos' and auth.role() = 'authenticated');

create policy "equipe exclui documentos"
  on storage.objects for delete
  using (bucket_id = 'veiculos-documentos' and auth.role() = 'authenticated');
