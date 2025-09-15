-- =====================================================
-- MIGRATION: 024_add_client_tx_id_to_enrollments.sql
-- DESCRIÇÃO: Adiciona coluna para idempotência de submissão no fluxo
--            de matrícula (client_tx_id) e índice único parcial.
-- DATA: 2025-09-09
-- =====================================================

-- Observação:
--  - Mantém compatibilidade com o schema atual (014_create_enrollments.sql)
--  - Não altera RLS ou comportamento de inserção existente
--  - Permite futura adoção de RPC transacional com idempotência

-- Adiciona coluna client_tx_id (opcional) para identificar submissões do cliente
ALTER TABLE public.enrollments
  ADD COLUMN IF NOT EXISTS client_tx_id uuid;

-- Índice único parcial para garantir idempotência apenas quando informado
-- (permite múltiplos NULLs)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
      AND indexname = 'idx_enrollments_client_tx_id_unique'
  ) THEN
    CREATE UNIQUE INDEX idx_enrollments_client_tx_id_unique
      ON public.enrollments(client_tx_id)
      WHERE client_tx_id IS NOT NULL;
  END IF;
END $$;

COMMENT ON COLUMN public.enrollments.client_tx_id IS 'Identificador idempotente da submissão do cliente';

