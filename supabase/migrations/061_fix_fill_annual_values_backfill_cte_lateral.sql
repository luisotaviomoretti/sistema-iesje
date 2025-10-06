-- =====================================================
-- MIGRATION: 061_fix_fill_annual_values_backfill_cte_lateral.sql
-- PROPÓSITO: Corrigir backfill da 060 usando CTE + LATERAL sem referência inválida ao alvo
-- DATA: 2025-10-03
-- =====================================================

BEGIN;

-- 1) Reafirmar a função do trigger (mesma lógica da 060, para garantir que ficou aplicada)
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
  IF NEW.annual_base_value IS NOT NULL
     AND NEW.annual_material_value IS NOT NULL
     AND NEW.annual_total_value IS NOT NULL THEN
    RETURN NEW;
  END IF;

  WITH candidates AS (
    SELECT s.*, 1 AS prio
    FROM public.series s
    WHERE s.ativo = true
      AND s.id::text = NEW.series_id
    UNION ALL
    SELECT s.*, 2 AS prio
    FROM public.series s
    WHERE s.ativo = true
      AND lower(regexp_replace(regexp_replace(COALESCE(s.escola, ''), '\\s+', '_', 'g'), '_de_', '_', 'g'))
          = lower(regexp_replace(regexp_replace(COALESCE(NEW.student_escola, ''), '\\s+', '_', 'g'), '_de_', '_', 'g'))
      AND (s.ano_serie = NEW.series_id OR s.nome = NEW.series_name)
  )
  SELECT
    COALESCE(s.valor_anual_sem_material, ROUND(s.valor_mensal_sem_material * 12, 2)) AS v_sem,
    COALESCE(s.valor_anual_material, ROUND(s.valor_material * 12, 2))               AS v_mat,
    COALESCE(s.valor_anual_com_material, ROUND(s.valor_mensal_com_material * 12, 2)) AS v_com
  INTO v_sem, v_mat, v_com
  FROM candidates s
  ORDER BY s.prio, s.updated_at DESC
  LIMIT 1;

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

-- 2) Backfill reescrito com CTE + LATERAL referenciando a CTE, não o alvo diretamente
WITH tofix AS (
  SELECT e.id, e.series_id, e.series_name, e.student_escola
  FROM public.enrollments e
  WHERE (e.annual_base_value IS NULL OR e.annual_material_value IS NULL OR e.annual_total_value IS NULL)
),
calc AS (
  SELECT t.id,
         m.v_sem,
         m.v_mat,
         m.v_com
  FROM tofix t
  LEFT JOIN LATERAL (
    SELECT
      COALESCE(s.valor_anual_sem_material, ROUND(s.valor_mensal_sem_material * 12, 2)) AS v_sem,
      COALESCE(s.valor_anual_material, ROUND(s.valor_material * 12, 2))               AS v_mat,
      COALESCE(s.valor_anual_com_material, ROUND(s.valor_mensal_com_material * 12, 2)) AS v_com
    FROM (
      SELECT s.*, 1 AS prio
      FROM public.series s
      WHERE s.ativo = true AND s.id::text = t.series_id
      UNION ALL
      SELECT s.*, 2 AS prio
      FROM public.series s
      WHERE s.ativo = true
        AND lower(regexp_replace(regexp_replace(COALESCE(s.escola, ''), '\\s+', '_', 'g'), '_de_', '_', 'g'))
            = lower(regexp_replace(regexp_replace(COALESCE(t.student_escola, ''), '\\s+', '_', 'g'), '_de_', '_', 'g'))
        AND (s.ano_serie = t.series_id OR s.nome = t.series_name)
    ) s
    ORDER BY s.prio, s.updated_at DESC
    LIMIT 1
  ) m ON TRUE
)
UPDATE public.enrollments e
SET
  annual_base_value = COALESCE(e.annual_base_value, c.v_sem),
  annual_material_value = COALESCE(e.annual_material_value, c.v_mat),
  annual_total_value = COALESCE(e.annual_total_value, c.v_com),
  updated_at = now()
FROM calc c
WHERE e.id = c.id
  AND (e.annual_base_value IS NULL OR e.annual_material_value IS NULL OR e.annual_total_value IS NULL);

COMMIT;

DO $$ BEGIN
  RAISE NOTICE '061_fix_fill_annual_values_backfill_cte_lateral applied.';
END $$;
