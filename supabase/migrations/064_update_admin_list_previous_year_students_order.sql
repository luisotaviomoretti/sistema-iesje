-- =====================================================
-- MIGRATION: 064_update_admin_list_previous_year_students_order.sql
-- PROPÓSITO: Ajustar ordenação padrão da listagem admin para
--            exibir primeiro alunos com matrícula e ordenar por matrícula mais recente.
--            Mantém segurança via _ensure_admin e contrato estável.
-- DATA: 2025-10-22
-- =====================================================

CREATE OR REPLACE FUNCTION public.admin_list_previous_year_students(
  p_academic_year TEXT DEFAULT ((EXTRACT(YEAR FROM NOW()) - 1)::INT)::TEXT,
  p_escola TEXT DEFAULT NULL,
  p_has_enrollment TEXT DEFAULT NULL,
  p_name_query TEXT DEFAULT NULL,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  student_name text,
  student_escola text,
  series_name text,
  track_name text,
  total_discount_percentage numeric,
  discount_code text,
  has_enrollment boolean,
  enrollment_status text,
  enrollment_id uuid,
  enrollment_discount_percentage numeric,
  enrollment_created_at timestamptz,
  total_count bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = extensions, public
AS $$
WITH guard AS (
  SELECT public._ensure_admin()
),
params AS (
  SELECT
    COALESCE(NULLIF(TRIM(p_escola), ''), NULL) AS escola,
    CASE WHEN LOWER(COALESCE(TRIM(p_has_enrollment), '')) IN ('true','1','t','yes','sim') THEN true
         WHEN LOWER(COALESCE(TRIM(p_has_enrollment), '')) IN ('false','0','f','no','nao','não') THEN false
         ELSE NULL
    END AS has_enr,
    CASE WHEN LENGTH(COALESCE(TRIM(p_name_query), '')) >= 2 THEN public.norm_text(p_name_query) ELSE NULL END AS nq,
    GREATEST(1, COALESCE(p_limit, 50)) AS lim,
    GREATEST(0, COALESCE(p_offset, 0)) AS off,
    COALESCE(NULLIF(TRIM(p_academic_year), ''), ((EXTRACT(YEAR FROM NOW()) - 1)::INT)::TEXT) AS ay
),
base AS (
  SELECT
    pys.*,
    einfo.id AS e_id,
    einfo.status AS e_status,
    einfo.total_discount_percentage AS e_discount,
    einfo.created_at AS e_created_at
  FROM public.previous_year_students pys
  CROSS JOIN params p
  LEFT JOIN LATERAL (
    SELECT e.id, e.status, e.total_discount_percentage, e.created_at
    FROM public.enrollments e
    WHERE public.norm_text(e.student_name) = public.norm_text(pys.student_name)
      AND COALESCE(e.student_escola,'') = COALESCE(pys.student_escola,'')
      AND date_part('year', e.created_at)::int = (p.ay::int + 1)
      AND e.status IN ('submitted','approved')
      AND e.deleted_at IS NULL
    ORDER BY e.created_at DESC
    LIMIT 1
  ) einfo ON true
  WHERE pys.academic_year = (SELECT ay FROM params)
    AND ( (SELECT escola FROM params) IS NULL OR COALESCE(pys.student_escola,'') = (SELECT escola FROM params) )
    AND ( (SELECT nq FROM params) IS NULL OR public.norm_text(pys.student_name) LIKE '%' || (SELECT nq FROM params) || '%' )
)
SELECT
  b.id,
  b.student_name,
  b.student_escola,
  b.series_name,
  b.track_name,
  b.total_discount_percentage,
  b.discount_code,
  (b.e_id IS NOT NULL) AS has_enrollment,
  b.e_status AS enrollment_status,
  b.e_id AS enrollment_id,
  b.e_discount AS enrollment_discount_percentage,
  b.e_created_at AS enrollment_created_at,
  COUNT(*) OVER() AS total_count
FROM base b, params p
WHERE (p.has_enr IS NULL OR (p.has_enr = true AND b.e_id IS NOT NULL) OR (p.has_enr = false AND b.e_id IS NULL))
ORDER BY (b.e_id IS NOT NULL) DESC, b.e_created_at DESC NULLS LAST, b.student_name ASC
LIMIT (SELECT lim FROM params)
OFFSET (SELECT off FROM params)
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_previous_year_students(TEXT, TEXT, TEXT, TEXT, INT, INT) TO authenticated;

DO $$ BEGIN
  RAISE NOTICE '064_update_admin_list_previous_year_students_order applied.';
END $$;
