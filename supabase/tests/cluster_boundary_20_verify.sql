-- Verificação: Boundary 20% (C <= 20, D > 20)
-- Data: 2025-10-19
-- Objetivo: confirmar que alunos com 20% estão no Cluster C (e não no D)

\echo '=== CONTAGEM PONTUAL: p=20% ==='
WITH ay AS (
  SELECT ((EXTRACT(YEAR FROM NOW()) - 1)::INT)::TEXT AS v
)
SELECT COUNT(*) AS students_at_20
FROM previous_year_students pys, ay
WHERE pys.academic_year = ay.v
  AND COALESCE(pys.total_discount_percentage, 0) = 20;

\echo '=== CLASSIFICAÇÃO (ANTIGA vs NOVA) ==='
WITH ay AS (
  SELECT ((EXTRACT(YEAR FROM NOW()) - 1)::INT)::TEXT AS v
),
old_class AS (
  SELECT CASE
           WHEN COALESCE(total_discount_percentage, 0) >= 5  AND COALESCE(total_discount_percentage, 0) < 10 THEN 'A'
           WHEN COALESCE(total_discount_percentage, 0) >= 10 AND COALESCE(total_discount_percentage, 0) < 15 THEN 'B'
           WHEN COALESCE(total_discount_percentage, 0) >= 15 AND COALESCE(total_discount_percentage, 0) < 20 THEN 'C'
           WHEN COALESCE(total_discount_percentage, 0) >= 20 THEN 'D'
           ELSE NULL
         END AS cluster_old
  FROM previous_year_students pys, ay
  WHERE pys.academic_year = ay.v
),
new_class AS (
  SELECT CASE
           WHEN COALESCE(total_discount_percentage, 0) >= 5  AND COALESCE(total_discount_percentage, 0) < 10 THEN 'A'
           WHEN COALESCE(total_discount_percentage, 0) >= 10 AND COALESCE(total_discount_percentage, 0) < 15 THEN 'B'
           WHEN COALESCE(total_discount_percentage, 0) >= 15 AND COALESCE(total_discount_percentage, 0) <= 20 THEN 'C'
           WHEN COALESCE(total_discount_percentage, 0) > 20 THEN 'D'
           ELSE NULL
         END AS cluster_new,
         total_discount_percentage
  FROM previous_year_students pys, ay
  WHERE pys.academic_year = ay.v
)
SELECT 
  (SELECT COUNT(*) FROM old_class WHERE cluster_old = 'C') AS old_c,
  (SELECT COUNT(*) FROM old_class WHERE cluster_old = 'D') AS old_d,
  (SELECT COUNT(*) FROM new_class WHERE cluster_new = 'C') AS new_c,
  (SELECT COUNT(*) FROM new_class WHERE cluster_new = 'D') AS new_d,
  (SELECT COUNT(*) FROM new_class WHERE cluster_new = 'C' AND total_discount_percentage = 20) AS new_c_at_20,
  (SELECT COUNT(*) FROM new_class WHERE cluster_new = 'D' AND total_discount_percentage = 20) AS new_d_at_20;

\echo '=== RPC get_rematricula_cluster_metrics (nova lógica) ==='
SELECT * FROM public.get_rematricula_cluster_metrics();
