-- =====================================================
-- MIGRATION: 052_update_previous_year_students_discount_percentages.sql
-- DESCRIÇÃO: Ajusta total_discount_percentage na tabela previous_year_students
--            para os seguintes casos:
--            - discount_code IN ('ABP','COL'): 50.00
--            - discount_code = 'SAE': 40.00
--            Operação idempotente, atualiza somente quando necessário.
-- DATA: 2025-09-30 14:08:49-03:00
-- =====================================================

-- Extensão comum (não estritamente necessária, por consistência com outras migrações)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  v_rows_abp_col INTEGER := 0;
  v_rows_sae INTEGER := 0;
BEGIN
  -- Verifica colunas necessárias antes de atualizar
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'previous_year_students' AND column_name = 'discount_code'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'previous_year_students' AND column_name = 'total_discount_percentage'
  ) THEN

    -- 1) ABP/COL => 50.00 (somente quando diferente do alvo)
    UPDATE public.previous_year_students
    SET total_discount_percentage = 50.00
    WHERE discount_code IN ('ABP', 'COL')
      AND total_discount_percentage IS DISTINCT FROM 50.00;

    GET DIAGNOSTICS v_rows_abp_col = ROW_COUNT;
    RAISE NOTICE 'previous_year_students: total_discount_percentage ajustado para 50.00 em % linha(s) (discount_code IN (ABP, COL)).', v_rows_abp_col;

    -- 2) SAE => 40.00 (somente quando diferente do alvo)
    UPDATE public.previous_year_students
    SET total_discount_percentage = 40.00
    WHERE discount_code = 'SAE'
      AND total_discount_percentage IS DISTINCT FROM 40.00;

    GET DIAGNOSTICS v_rows_sae = ROW_COUNT;
    RAISE NOTICE 'previous_year_students: total_discount_percentage ajustado para 40.00 em % linha(s) (discount_code = SAE).', v_rows_sae;

  ELSE
    RAISE WARNING 'Colunas discount_code e/ou total_discount_percentage não encontradas em public.previous_year_students. Nenhuma linha atualizada.';
  END IF;
END $$;

-- Verificações opcionais (comente/descomente para inspeção manual)
-- SELECT discount_code, COUNT(*)
-- FROM public.previous_year_students
-- WHERE discount_code IN ('ABP','COL','SAE')
-- GROUP BY discount_code;

-- Fim da migração 052
