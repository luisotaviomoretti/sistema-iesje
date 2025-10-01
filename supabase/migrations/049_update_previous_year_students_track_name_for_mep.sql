-- =====================================================
-- MIGRATION: 049_update_previous_year_students_track_name_for_mep.sql
-- DESCRIÇÃO: Ajusta track_name para 'maçom' em todos os registros
--            onde discount_code = 'MEP' na tabela previous_year_students.
--            Operação idempotente e segura (só atualiza quando necessário).
-- DATA: 2025-09-29 12:41:00-03:00
-- =====================================================

-- Garantir extensão (não estritamente necessária aqui)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Atualização idempotente com verificação de existência de colunas
DO $$
DECLARE
  v_rows INTEGER := 0;
BEGIN
  -- Verifica se as colunas existem antes de atualizar (robustez entre ambientes)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'previous_year_students' AND column_name = 'discount_code'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'previous_year_students' AND column_name = 'track_name'
  ) THEN

    UPDATE public.previous_year_students
    SET track_name = 'maçom'
    WHERE discount_code = 'MEP'
      AND track_name IS DISTINCT FROM 'maçom';

    GET DIAGNOSTICS v_rows = ROW_COUNT;
    RAISE NOTICE 'previous_year_students: track_name atualizado para "maçom" em % linha(s) (discount_code = MEP).', v_rows;
  ELSE
    RAISE WARNING 'Colunas discount_code e/ou track_name não encontradas em public.previous_year_students. Nenhuma linha atualizada.';
  END IF;
END $$;

-- Verificação (opcional): quantas linhas possuem discount_code = 'MEP' e track_name = 'maçom'
-- SELECT COUNT(*) AS mep_macom_count
-- FROM public.previous_year_students
-- WHERE discount_code = 'MEP' AND track_name = 'maçom';

-- Fim da migração 049
