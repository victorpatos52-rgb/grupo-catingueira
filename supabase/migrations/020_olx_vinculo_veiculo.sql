-- ============================================================
-- MIGRATION 020 — Vínculo do veículo com o catálogo e o anúncio da OLX
-- PROPOSTA / Pendente — revise e rode no SQL Editor do Supabase Dashboard.
--
-- olx_marca_id / olx_modelo_id / olx_versao_id: ids do catálogo de Autos da
--   OLX (POST apps.olx.com.br/autoupload/car_info[/marca[/modelo]]). A doc
--   devolve números, mas o anúncio os envia como string em
--   params.vehicle_brand/model/version — text evita conversão nos dois lados.
--   Gravados pelo botão "Vincular ao catálogo OLX" (VeiculoForm), que só
--   aceita ids presentes no catálogo no momento do vínculo.
--
-- olx_ad_id: o `id` que NÓS enviamos em ad_list[] no import
--   (apps.olx.com.br/autoupload/import). A doc exige
--   [A-Za-z0-9_{}-]{1,19} e único — o uuid do veículo (36 chars, ou 32 sem
--   hífen) NÃO cabe, então precisa ser gerado na primeira publicação e
--   reaproveitado em toda edição/deleção (a OLX identifica o anúncio por ele;
--   sem o mesmo id não dá para despublicar um vendido). unique parcial abaixo.
--   Não é o id público do anúncio na OLX (list_id) — esse vem de outra parte
--   da doc ("Anúncios Publicados"), ainda não lida.
--
-- olx_status / olx_erro: último resultado conhecido da integração. Sem CHECK
--   de propósito: o retorno do import é síncrono (statusCode 0 = "importado
--   e será processado", não publicado) e a moderação é assíncrona — os
--   estados possíveis dependem da parte da doc ainda não lida. Fechar a lista
--   de valores quando o fluxo de envio (próxima fase) estiver definido.
--
-- Atenção: `veiculos` tem SELECT público (publico_ve_disponiveis) para
-- veículos disponíveis — estas colunas ficam legíveis pela anon key. Nenhuma
-- é segredo (token fica em olx_integracoes), mas olx_erro não deve conter
-- dado sensível.
-- ============================================================

alter table veiculos add column if not exists olx_marca_id  text;
alter table veiculos add column if not exists olx_modelo_id text;
alter table veiculos add column if not exists olx_versao_id text;
alter table veiculos add column if not exists olx_ad_id     text;
alter table veiculos add column if not exists olx_status    text;
alter table veiculos add column if not exists olx_erro      text;

alter table veiculos add constraint veiculos_olx_ad_id_formato
  check (olx_ad_id is null or olx_ad_id ~ '^[A-Za-z0-9_{}-]{1,19}$');

create unique index if not exists veiculos_olx_ad_id_key
  on veiculos (olx_ad_id) where olx_ad_id is not null;

-- Vínculo é tudo-ou-nada: versão sem modelo/marca não serve para o anúncio.
alter table veiculos add constraint veiculos_olx_vinculo_completo
  check (
    (olx_marca_id is null and olx_modelo_id is null and olx_versao_id is null)
    or (olx_marca_id is not null and olx_modelo_id is not null and olx_versao_id is not null)
  );
