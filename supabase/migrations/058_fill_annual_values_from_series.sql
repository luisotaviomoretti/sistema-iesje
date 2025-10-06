-- =====================================================
-- MIGRATION: 058_fill_annual_values_from_series.sql
-- PROPÓSITO: Preencher annual_* em public.enrollments a partir de series
--            quando estiverem NULL, sem mudanças disruptivas.
--            Inclui trigger BEFORE INSERT/UPDATE e backfill idempotente.
-- DATA: 2025-10-03
-- =====================================================

BEGIN;

-- 0) Garantir colunas em enrollments (idempotente; caso já existam, nada muda)
ALTER TABLE public.enrollments
  ADD COLUMN IF NOT EXISTS annual_base_value numeric(12,2),
  ADD COLUMN IF NOT EXISTS annual_material_value numeric(12,2),
  ADD COLUMN IF NOT EXISTS annual_total_value numeric(12,2);

-- 1) Função de trigger para preencher annual_* quando NULL
CREATE OR REPLACE FUNCTION public.fill_enrollment_annual_values()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sem numeric;
  v_mat numeric;
  v_com numeric;
BEGIN
  -- Se já temos os 3 valores, não faz nada
  IF NEW.annual_base_value IS NOT NULL
     AND NEW.annual_material_value IS NOT NULL
     AND NEW.annual_total_value IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Buscar série correspondente pela escola e por uma das chaves conhecidas
  SELECT
    COALESCE(s.valor_anual_sem_material, ROUND(s.valor_mensal_sem_material * 12, 2)) AS v_sem,
    COALESCE(s.valor_anual_material, ROUND(s.valor_material * 12, 2))               AS v_mat,
    COALESCE(s.valor_anual_com_material, ROUND(s.valor_mensal_com_material * 12, 2)) AS v_com
  INTO v_sem, v_mat, v_com
  FROM public.series s
  WHERE lower(replace(s.escola, ' ', '_')) = lower(replace(COALESCE(NEW.student_escola, ''), ' ', '_'))
    AND s.ativo = true
    AND (
      s.id::text = NEW.series_id
      OR s.ano_serie = NEW.series_id
      OR s.nome = NEW.series_name
    )
  ORDER BY s.updated_at DESC
  LIMIT 1;

  -- Preencher apenas os campos que permanecerem NULL
  IF v_sem IS NOT NULL AND NEW.annual_base_value IS NULL THEN
    NEW.annual_base_value := v_sem;
  END IF;
  IF v_mat IS NOT NULL AND NEW.annual_material_value IS NULL THEN
    NEW.annual_material_value := v_mat;
  END IF;
  IF v_com IS NOT NULL AND NEW.annual_total_value IS NULL THEN
    NEW.annual_total_value := v_com;
  END IF;

  RETURN NEW;
END;
$$;

-- 2) Trigger BEFORE INSERT/UPDATE para aplicar a regra automaticamente
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_fill_enrollment_annual_values'
  ) THEN
    CREATE TRIGGER trg_fill_enrollment_annual_values
      BEFORE INSERT OR UPDATE ON public.enrollments
      FOR EACH ROW
      EXECUTE FUNCTION public.fill_enrollment_annual_values();
  END IF;
END $$;

-- 3) Backfill idempotente para registros existentes com algum annual_* NULL
WITH matched AS (
  SELECT e.id,
         COALESCE(s.valor_anual_sem_material, ROUND(s.valor_mensal_sem_material * 12, 2)) AS v_sem,
         COALESCE(s.valor_anual_material, ROUND(s.valor_material * 12, 2))               AS v_mat,
         COALESCE(s.valor_anual_com_material, ROUND(s.valor_mensal_com_material * 12, 2)) AS v_com
  FROM public.enrollments e
  JOIN public.series s
    ON lower(replace(s.escola, ' ', '_')) = lower(replace(COALESCE(e.student_escola, ''), ' ', '_'))
   AND s.ativo = true
   AND (
     s.id::text = e.series_id
     OR s.ano_serie = e.series_id
     OR s.nome = e.series_name
   )
  WHERE (e.annual_base_value IS NULL OR e.annual_material_value IS NULL OR e.annual_total_value IS NULL)
)
UPDATE public.enrollments e
SET
  annual_base_value = COALESCE(e.annual_base_value, m.v_sem),
  annual_material_value = COALESCE(e.annual_material_value, m.v_mat),
  annual_total_value = COALESCE(e.annual_total_value, m.v_com),
  updated_at = now()
FROM matched m
WHERE e.id = m.id;

COMMIT;

DO $$ BEGIN
  RAISE NOTICE '058_fill_annual_values_from_series applied.';
END $$;
