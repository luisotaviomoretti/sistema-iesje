-- =====================================================
-- MIGRATION: 028_add_discount_fields_to_previous_year_students.sql
-- DESCRIÇÃO: Adiciona colunas para detalhar o "Desconto sugerido"
--            na tabela public.previous_year_students
--            - discount_code TEXT (nullable)
--            - discount_description TEXT (nullable)
-- NOTAS: Idempotente e compatível (zero downtime). Rollback documentado.
-- DATA: 2025-09-09
-- =====================================================

-- Garantir extensão utilizada por migrações (não estritamente necessária aqui)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =====================================
-- ALTER TABLE: adicionar colunas (compatível)
-- =====================================
ALTER TABLE IF EXISTS public.previous_year_students
  ADD COLUMN IF NOT EXISTS discount_code TEXT,
  ADD COLUMN IF NOT EXISTS discount_description TEXT;

COMMENT ON COLUMN public.previous_year_students.discount_code IS 'Código do desconto sugerido (ano anterior).';
COMMENT ON COLUMN public.previous_year_students.discount_description IS 'Descrição do desconto sugerido (ano anterior).';

-- =====================================
-- (Opcional) Backfill seguro - DESCOMENTAR apenas em DEV/STAGING após validação
--   Estratégia: quando houver exatamente um item em applied_discounts, usar seus campos
--   para preencher as novas colunas, preservando valores já existentes.
-- =====================================
-- UPDATE public.previous_year_students
-- SET 
--   discount_code = COALESCE(discount_code, (applied_discounts->0->>'discount_code')),
--   discount_description = COALESCE(discount_description, (applied_discounts->0->>'discount_name'))
-- WHERE (discount_code IS NULL OR discount_description IS NULL)
--   AND jsonb_typeof(applied_discounts) = 'array'
--   AND jsonb_array_length(applied_discounts) = 1;

-- =====================================
-- Verificação (log com RAISE NOTICE)
-- =====================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'previous_year_students'
      AND column_name = 'discount_code'
  ) THEN
    RAISE NOTICE 'previous_year_students.discount_code: OK';
  ELSE
    RAISE WARNING 'previous_year_students.discount_code: NÃO ENCONTRADA';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'previous_year_students'
      AND column_name = 'discount_description'
  ) THEN
    RAISE NOTICE 'previous_year_students.discount_description: OK';
  ELSE
    RAISE WARNING 'previous_year_students.discount_description: NÃO ENCONTRADA';
  END IF;
END $$;

-- ============================
-- ROLLBACK (DEV):
-- -- Descomentar para desfazer em ambiente de desenvolvimento
-- -- ATENÇÃO: Avalie impactos antes de remover colunas em produção
-- -- ALTER TABLE public.previous_year_students
-- --   DROP COLUMN IF EXISTS discount_description,
-- --   DROP COLUMN IF EXISTS discount_code;
-- ============================

-- Fim da migração 028

