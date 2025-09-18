-- Testes para get_previous_school_by_cpf (DEV)
-- Objetivo: validar normalização de CPF e retorno da escola

BEGIN;

-- 1) Caso positivo com CPF em digits
WITH sample AS (
  SELECT pys.student_cpf_digits AS d, pys.student_escola AS expected
  FROM public.previous_year_students pys
  WHERE pys.student_cpf_digits IS NOT NULL
  LIMIT 1
)
SELECT 'exists_digits' AS test_case,
       s.d AS input_digits,
       r.found,
       r.school_name,
       s.expected AS expected_school
FROM sample s,
LATERAL public.get_previous_school_by_cpf(s.d) r;

-- 2) Caso positivo com CPF mascarado
WITH sample AS (
  SELECT pys.student_cpf_digits AS d, pys.student_escola AS expected
  FROM public.previous_year_students pys
  WHERE pys.student_cpf_digits IS NOT NULL
  LIMIT 1
), masked AS (
  SELECT format('%s.%s.%s-%s', substr(d,1,3), substr(d,4,3), substr(d,7,3), substr(d,10,2)) AS masked,
         expected
  FROM sample
)
SELECT 'exists_masked' AS test_case,
       m.masked AS input_masked,
       r.found,
       r.school_name,
       m.expected AS expected_school
FROM masked m,
LATERAL public.get_previous_school_by_cpf(m.masked) r;

-- 3) Caso negativo
SELECT 'not_found' AS test_case,
       r.*
FROM public.get_previous_school_by_cpf('00000000000') r;

ROLLBACK; -- não há escrita; apenas por padronização de testes
