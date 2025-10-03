-- =====================================================
-- MIGRATION: 057_list_inad_override_current.sql
-- PROPÓSITO: Expor uma listagem segura de matrículas finalizadas com exceção
--            (1 mês de inadimplência) que AINDA constam como inadimplentes na base atual.
--            Mantém arquitetura Supabase-first, sem mudanças disruptivas.
-- DATA: 2025-10-03
-- =====================================================

CREATE OR REPLACE FUNCTION public.list_inad_override_enrollments_current()
RETURNS TABLE (
  id uuid,
  student_name text,
  student_escola text,
  guardian1_name text,
  created_at timestamptz,
  inad_snapshot jsonb
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = extensions, public
AS $$
BEGIN
  -- Restringe a admins (consistente com políticas de leitura de enrollments)
  PERFORM public._ensure_admin();

  RETURN QUERY
  SELECT
    e.id,
    e.student_name,
    e.student_escola,
    e.guardian1_name,
    e.created_at,
    e.inad_snapshot
  FROM public.enrollments e
  WHERE e.inad_override_1m_used = true
    AND (
      SELECT COALESCE(ci.is_inadimplente, false) AS is_inadimplente
      FROM public.check_inadimplencia(
        COALESCE(e.student_name, ''),
        NULLIF(e.guardian1_name, ''),
        NULLIF(e.student_escola, '')
      ) AS ci
      LIMIT 1
    ) = true
  ORDER BY e.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_inad_override_enrollments_current() TO authenticated;

DO $$ BEGIN
  RAISE NOTICE '057_list_inad_override_current applied.';
END $$;
