-- ============================================================
-- Adicionar colunas novas à tabela lojas
-- ============================================================
ALTER TABLE lojas ADD COLUMN IF NOT EXISTS sobre TEXT;
ALTER TABLE lojas ADD COLUMN IF NOT EXISTS missao TEXT;
ALTER TABLE lojas ADD COLUMN IF NOT EXISTS visao TEXT;
ALTER TABLE lojas ADD COLUMN IF NOT EXISTS horario TEXT;
ALTER TABLE lojas ADD COLUMN IF NOT EXISTS instagram TEXT;

-- ============================================================
-- Atualizar dados da Catingueira Multimarcas
-- ============================================================
UPDATE lojas SET
  sobre    = 'Empresa familiar com mais de 30 anos de história, localizada em Patos, no sertão da Paraíba. Desde a sua fundação, a empresa se dedica a oferecer veículos seminovos de qualidade, aliando um atendimento transparente, próximo e acolhedor.',
  missao   = 'Proporcionar aos nossos clientes a realização de sonhos, oferecendo veículos seminovos de qualidade, com transparência e excelência no atendimento.',
  visao    = 'Ser a primeira escolha dos clientes que desejam adquirir um veículo seminovo, sendo referência em qualidade, confiança e atendimento diferenciado.',
  horario  = 'Seg a Sex: 8h às 18h | Sáb: 8h às 13h'
WHERE nome ILIKE '%catingueira%';

-- ============================================================
-- Atualizar dados da Felizardo Veículos
-- ============================================================
UPDATE lojas SET
  sobre    = 'A Felizardo Veículos nasce em 2025 como um marco na continuidade de uma história familiar construída com paixão pelo setor automotivo. Fundada por Felipe Catingueira, a loja surge como uma homenagem ao seu pai, Felizardo, que dedicou sua vida ao mercado de veículos, deixando um legado de trabalho, honestidade e confiança.',
  missao   = 'Proporcionar aos clientes veículos seminovos de alta qualidade, com transparência e atendimento diferenciado, mantendo vivo o legado de confiança e credibilidade iniciado por Felizardo.',
  visao    = 'Ser referência no segmento de veículos em Patos e região, destacando-se pela inovação, confiança e pela capacidade de unir tradição e modernidade.',
  horario  = 'Seg a Sex: 8h às 18h | Sáb: 8h às 13h',
  instagram = 'felizardoveiculos'
WHERE nome ILIKE '%felizardo%';
