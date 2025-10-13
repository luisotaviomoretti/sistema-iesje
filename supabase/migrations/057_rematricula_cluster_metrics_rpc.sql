-- =====================================================
-- MIGRATION: 057_rematricula_cluster_metrics_rpc.sql
-- DESCRIÇÃO: Cria a RPC segura para métricas por Cluster
--            a partir de public.previous_year_students.
--            Retorna quantidade de alunos e receita anual (12x final_monthly_value)
--            por cluster A/B/C/D, filtrado por academic_year.
-- =====================================================

-- Função segura (SECURITY DEFINER) — restrita a usuários admin (RLS helpers em 003)
CREATE OR REPLACE FUNCTION public.get_rematricula_cluster_metrics(p_academic_year TEXT DEFAULT ((EXTRACT(YEAR FROM NOW()) - 1)::INT)::TEXT)
RETURNS TABLE (
  cluster_code TEXT,
  student_count BIGINT,
  annual_revenue NUMERIC(14,2)
) AS $$
BEGIN
  -- Somente admins podem consultar
  IF NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT
      CASE
        WHEN COALESCE(total_discount_percentage, 0) >= 5  AND COALESCE(total_discount_percentage, 0) < 10 THEN 'A'
        WHEN COALESCE(total_discount_percentage, 0) >= 10 AND COALESCE(total_discount_percentage, 0) < 15 THEN 'B'
        WHEN COALESCE(total_discount_percentage, 0) >= 15 AND COALESCE(total_discount_percentage, 0) < 20 THEN 'C'
        WHEN COALESCE(total_discount_percentage, 0) >= 20 THEN 'D'
        ELSE NULL
      END AS cluster_code,
      final_monthly_value
    FROM public.previous_year_students
    WHERE academic_year = p_academic_year
  )
  SELECT
    b.cluster_code,
    COUNT(*)::BIGINT AS student_count,
    COALESCE(SUM(COALESCE(b.final_monthly_value, 0) * 12), 0)::NUMERIC(14,2) AS annual_revenue
  FROM base b
  WHERE b.cluster_code IS NOT NULL
  GROUP BY b.cluster_code
  ORDER BY b.cluster_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_rematricula_cluster_metrics(TEXT)
  IS 'Retorna métricas por Cluster (A/B/C/D) da base do ano anterior: quantidade de alunos e receita anual (12x mensal). Acesso restrito a admins.';

-- Grants: apenas anon/authenticated podem executar; RLS + SECURITY DEFINER controlam acesso real
GRANT EXECUTE ON FUNCTION public.get_rematricula_cluster_metrics(TEXT) TO anon, authenticated;
