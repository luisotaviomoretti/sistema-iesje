-- =====================================================
-- MIGRATION: 062_update_cluster_boundary_20.sql
-- DESC: Adjust cluster boundaries so that Cluster C is 15% to ≤20%
--       and Cluster D is >20%. Updates RPC metrics and config descriptions.
-- DATE: 2025-10-19
-- SAFETY: Idempotent (CREATE OR REPLACE FUNCTION; UPDATE ... WHERE)
-- =====================================================

-- 1) Update metrics RPC to reflect new boundary
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
        WHEN COALESCE(total_discount_percentage, 0) >= 15 AND COALESCE(total_discount_percentage, 0) <= 20 THEN 'C'
        WHEN COALESCE(total_discount_percentage, 0) > 20 THEN 'D'
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

GRANT EXECUTE ON FUNCTION public.get_rematricula_cluster_metrics(TEXT) TO anon, authenticated;

-- 2) Adjust descriptions of config keys to match the new boundary (idempotent, safe)
UPDATE system_configs
SET descricao = 'Ajuste em pontos percentuais para Cluster C (15% a ≤20%). Valores negativos reduzem, positivos aumentam.'
WHERE chave = 'rematricula.cluster_adjustment.cluster_c.adjustment'
  AND (descricao IS NULL OR descricao NOT LIKE '%≤20%');

UPDATE system_configs
SET descricao = 'Ajuste em pontos percentuais para Cluster D (>20%). Valores negativos reduzem, positivos aumentam.'
WHERE chave = 'rematricula.cluster_adjustment.cluster_d.adjustment'
  AND (descricao IS NULL OR descricao NOT LIKE '%>20%');

-- 3) Quick sanity notice
DO $$
BEGIN
  RAISE NOTICE '✅ Cluster boundary updated: C (<=20), D (>20).';
END $$;
