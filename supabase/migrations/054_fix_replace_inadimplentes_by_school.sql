-- =====================================================
-- MIGRATION: 054_fix_replace_inadimplentes_by_school.sql
-- PROPÓSITO: Hotfix para recriar a função replace_inadimplentes_by_school
--            sem referenciar constraint inexistente em ON CONFLICT.
-- DATA: 2025-10-02
-- =====================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.replace_inadimplentes_by_school(
  p_escola text,
  p_rows jsonb
)
RETURNS TABLE(
  deactivated_count int,
  inserted_count int
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = extensions, public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_escola text := nullif(trim(p_escola), '');
  v_deact int := 0;
  v_ins int := 0;
BEGIN
  -- Requer admin
  PERFORM public._ensure_admin();

  IF v_escola IS NULL THEN
    RAISE EXCEPTION 'p_escola é obrigatório';
  END IF;

  -- Soft desativar registros ativos da escola
  UPDATE public.inadimplentes i SET
    is_active = false,
    deleted_at = now(),
    deleted_by = v_actor,
    deleted_reason = 'replace_by_school',
    updated_at = now(),
    updated_by = v_actor
  WHERE i.is_active = true
    AND coalesce(i.student_escola, '') = v_escola;
  GET DIAGNOSTICS v_deact = ROW_COUNT;

  -- Inserção em lote a partir de JSONB
  WITH src AS (
    SELECT
      nullif(trim(x->>'codigo_inadim'), '') AS codigo_inadim,
      nullif(trim(x->>'student_name'), '') AS student_name,
      nullif(trim(x->>'guardian1_name'), '') AS guardian1_name,
      nullif(trim(x->>'student_escola'), '') AS student_escola_raw,
      nullif(trim(x->>'meses_inadim'), '') AS meses_txt
    FROM jsonb_array_elements(p_rows) x
  ),
  to_ins AS (
    SELECT DISTINCT ON ((s.student_name, COALESCE(s.student_escola_raw, v_escola)))
      s.codigo_inadim,
      s.student_name,
      s.guardian1_name,
      COALESCE(s.student_escola_raw, v_escola) AS student_escola,
      CASE WHEN s.meses_txt ~ '^\\d+$' THEN s.meses_txt::int ELSE NULL END AS meses_inadim
    FROM src s
    WHERE s.student_name IS NOT NULL
  ),
  ins AS (
    INSERT INTO public.inadimplentes (
      codigo_inadim, student_name, guardian1_name, student_escola, meses_inadim,
      source, created_by, updated_by
    )
    SELECT
      t.codigo_inadim, t.student_name, t.guardian1_name, t.student_escola, t.meses_inadim,
      'admin-replace', v_actor, v_actor
    FROM to_ins t
    ON CONFLICT DO NOTHING
    RETURNING 1
  )
  SELECT count(*)::int INTO v_ins FROM ins;

  -- Auditoria
  INSERT INTO public.inadimplentes_audit (action, snapshot, actor)
  VALUES ('import', jsonb_build_object(
    'student_escola', v_escola,
    'deactivated_count', v_deact,
    'inserted_count', v_ins,
    'payload_size', COALESCE(jsonb_array_length(p_rows), 0)
  ), v_actor);

  RETURN QUERY SELECT v_deact, v_ins;
END;
$$;

GRANT EXECUTE ON FUNCTION public.replace_inadimplentes_by_school(text, jsonb) TO authenticated;

DO $$ BEGIN
  RAISE NOTICE '054_fix_replace_inadimplentes_by_school applied.';
END $$;
