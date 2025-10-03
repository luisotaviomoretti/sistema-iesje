-- =====================================================
-- MIGRATION: 055_harden_meses_inadim_replace_inadimplentes.sql
-- PROPÓSITO: Tornar robusta a leitura de meses_inadim (number/string) e defaultar para 1
--            na RPC replace_inadimplentes_by_school. Sem mudanças disruptivas.
-- DATA: 2025-10-03
-- =====================================================

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
  PERFORM public._ensure_admin();
  IF v_escola IS NULL THEN RAISE EXCEPTION 'p_escola é obrigatório'; END IF;

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

  WITH src AS (
    SELECT
      nullif(trim(x->>'codigo_inadim'), '') AS codigo_inadim,
      nullif(trim(x->>'student_name'), '') AS student_name,
      nullif(trim(x->>'guardian1_name'), '') AS guardian1_name,
      nullif(trim(x->>'student_escola'), '') AS student_escola_raw,
      -- meses_raw pode ser number ou string; convertemos com segurança
      CASE
        WHEN x ? 'meses_inadim' THEN
          CASE jsonb_typeof(x->'meses_inadim')
            WHEN 'number' THEN (x->>'meses_inadim')::int
            WHEN 'string' THEN CASE WHEN nullif(trim(x->>'meses_inadim'),'') ~ '^\\d+$' THEN (x->>'meses_inadim')::int ELSE NULL END
            ELSE NULL
          END
        ELSE NULL
      END AS meses_val
    FROM jsonb_array_elements(p_rows) x
  ),
  to_ins AS (
    SELECT DISTINCT ON ((s.student_name, COALESCE(s.student_escola_raw, v_escola)))
      s.codigo_inadim,
      s.student_name,
      s.guardian1_name,
      COALESCE(s.student_escola_raw, v_escola) AS student_escola,
      COALESCE(s.meses_val, 1) AS meses_inadim
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

-- OPCIONAL: Normalização pontual de dados antigos (executar manualmente se desejar)
-- UPDATE public.inadimplentes SET meses_inadim = 1 WHERE is_active = true AND meses_inadim IS NULL;

DO $$ BEGIN
  RAISE NOTICE '055_harden_meses_inadim_replace_inadimplentes applied.';
END $$;
