-- =====================================================
-- MIGRATION: 060_update_fill_annual_values_match_by_id_first.sql
-- PROPÓSITO: Priorizar match por series.id::text = series_id (independente da escola)
--            e só depois tentar por escola + (ano_serie|nome). Reexecuta backfill alvo.
-- DATA: 2025-10-03
-- =====================================================

BEGIN;

-- 1) Atualizar função do trigger para priorizar o match por ID
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

  -- Selecionar a melhor série candidata:
  --  prio 1: match exato por ID (id::text = NEW.series_id), ativo
  --  prio 2: match por escola normalizada + (ano_serie = series_id OU nome = series_name), ativo
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

-- 2) Backfill direcionado usando LATERAL para escolher o melhor candidato por linha
UPDATE public.enrollments e
SET
  annual_base_value = COALESCE(e.annual_base_value, m.v_sem),
  annual_material_value = COALESCE(e.annual_material_value, m.v_mat),
  annual_total_value = COALESCE(e.annual_total_value, m.v_com),
  updated_at = now()
FROM LATERAL (
  WITH candidates AS (
    SELECT s.*, 1 AS prio
    FROM public.series s
    WHERE s.ativo = true
      AND s.id::text = e.series_id
    UNION ALL
    SELECT s.*, 2 AS prio
    FROM public.series s
    WHERE s.ativo = true
      AND lower(regexp_replace(regexp_replace(COALESCE(s.escola, ''), '\\s+', '_', 'g'), '_de_', '_', 'g'))
          = lower(regexp_replace(regexp_replace(COALESCE(e.student_escola, ''), '\\s+', '_', 'g'), '_de_', '_', 'g'))
      AND (s.ano_serie = e.series_id OR s.nome = e.series_name)
  )
  SELECT
    COALESCE(s.valor_anual_sem_material, ROUND(s.valor_mensal_sem_material * 12, 2)) AS v_sem,
    COALESCE(s.valor_anual_material, ROUND(s.valor_material * 12, 2))               AS v_mat,
    COALESCE(s.valor_anual_com_material, ROUND(s.valor_mensal_com_material * 12, 2)) AS v_com
  FROM candidates s
  ORDER BY s.prio, s.updated_at DESC
  LIMIT 1
) m
WHERE (e.annual_base_value IS NULL OR e.annual_material_value IS NULL OR e.annual_total_value IS NULL);

COMMIT;

DO $$ BEGIN
  RAISE NOTICE '060_update_fill_annual_values_match_by_id_first applied.';
END $$;
