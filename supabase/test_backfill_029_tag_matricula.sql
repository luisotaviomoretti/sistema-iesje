-- =====================================================
-- TESTE: Backfill 029 (tag_matricula)
-- Objetivo: Validar o efeito do backfill e conferir distribuições
-- Não altera dados; apenas SELECTs (a menos que você ative o Passo 2 no backfill).
-- =====================================================

-- 1) Distribuição geral
SELECT tag_matricula, COUNT(*) AS total
FROM public.enrollments
GROUP BY tag_matricula
ORDER BY tag_matricula NULLS FIRST;

-- 2) Amostra de registros marcados como rematricula
SELECT id, student_name, student_cpf, student_cpf_digits, created_at
FROM public.enrollments
WHERE tag_matricula = 'rematricula'
ORDER BY created_at DESC
LIMIT 20;

-- 3) Amostra de registros ainda NULL (para inspeção manual)
SELECT id, student_name, student_cpf, student_cpf_digits, created_at
FROM public.enrollments
WHERE tag_matricula IS NULL
ORDER BY created_at DESC
LIMIT 20;

-- 4) Conferência de match com base anterior (quantos NULLs têm match e poderiam ser rematricula)
SELECT COUNT(*) AS nulls_com_match
FROM public.enrollments e
WHERE e.tag_matricula IS NULL
  AND EXISTS (
    SELECT 1
    FROM public.previous_year_students pys
    WHERE pys.student_cpf_digits = e.student_cpf_digits
  );

-- 5) Conferência inversa: registros marcados como rematricula com base em match real
SELECT COUNT(*) AS rematricula_com_base
FROM public.enrollments e
WHERE e.tag_matricula = 'rematricula'
  AND EXISTS (
    SELECT 1
    FROM public.previous_year_students pys
    WHERE pys.student_cpf_digits = e.student_cpf_digits
  );

