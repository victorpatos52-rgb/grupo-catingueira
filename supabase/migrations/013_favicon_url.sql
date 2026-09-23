-- ============================================================
-- MIGRATION 013 — favicon_url por loja
-- Aplicada.
--
-- Guarda a URL do favicon/ícone de app de cada loja, separado do logo
-- (lojas.logo_url) usado no header/footer/PDFs. Serve como base para
-- servir favicon.ico dinamicamente por domínio (src/app/favicon.ico hoje é
-- um arquivo estático único, compartilhado por todas as lojas) — trabalho
-- de servir isso dinamicamente ainda não foi feito, é pendência separada.
-- ============================================================

alter table lojas add column favicon_url text;
