-- ============================================================
-- MIGRATION 014 — imagens_landing por loja
-- Aplicada.
--
-- Guarda as imagens da landing page (hero + seções decorativas) de cada
-- loja, hoje hardcoded como URLs do Unsplash em HomeCatingueira.tsx e
-- HomeFelizardo.tsx. Estrutura:
--   { "hero": "https://.../hero.jpg", "secoes": { "interior": "https://...", "fachada": "https://..." } }
-- As chaves de `secoes` são definidas em src/lib/landing-images.ts
-- (SECOES_CATINGUEIRA / SECOES_FELIZARDO) — é a fonte da verdade tanto
-- para o formulário em /admin/configuracoes quanto para os componentes
-- Home* que leem por chave.
-- ============================================================

alter table lojas add column imagens_landing jsonb not null default '{}'::jsonb;
