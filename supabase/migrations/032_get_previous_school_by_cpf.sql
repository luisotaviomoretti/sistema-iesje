-- 032_get_previous_school_by_cpf.sql
-- Read-only RPC to fetch previous school name by CPF (digits or masked)
-- SAFE: SECURITY DEFINER, search_path restricted, no writes

CREATE OR REPLACE FUNCTION public.get_previous_school_by_cpf(p_cpf_digits text)
RETURNS TABLE(found boolean, school_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_digits text;
BEGIN
  -- Normalize to digits only, tolerate masked input
  v_digits := regexp_replace(COALESCE(p_cpf_digits, ''), '[^0-9]', '', 'g');

  IF v_digits = '' THEN
    RETURN QUERY SELECT FALSE::boolean, NULL::text;
    RETURN;
  END IF;

  RETURN QUERY
  WITH latest AS (
    SELECT pys.student_escola AS school_name,
           pys.academic_year,
           pys.created_at,
           ROW_NUMBER() OVER (
             ORDER BY pys.academic_year DESC NULLS LAST,
                      pys.created_at DESC NULLS LAST
           ) AS rn
    FROM public.previous_year_students pys
    WHERE pys.student_cpf_digits = v_digits
  )
  SELECT EXISTS (SELECT 1 FROM latest) AS found,
         (SELECT l.school_name FROM latest l WHERE l.rn = 1) AS school_name;
END;
$$;

COMMENT ON FUNCTION public.get_previous_school_by_cpf(text)
IS 'Returns whether CPF exists in previous_year_students and the most recent school_name (student_escola). Read-only.';

-- Grant execute to standard client roles (adjust as needed)
GRANT EXECUTE ON FUNCTION public.get_previous_school_by_cpf(text) TO authenticated;
