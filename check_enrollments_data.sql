-- =====================================================
-- VERIFICAÇÃO DE DADOS PARA DIAGNÓSTICO DO PROBLEMA
-- =====================================================

-- 1. Ver todas as matrículas na tabela enrollments
SELECT 
  id,
  student_cpf,
  student_name,
  status,
  created_at,
  updated_at,
  EXTRACT(YEAR FROM created_at) as year_created
FROM enrollments
ORDER BY created_at DESC
LIMIT 20;

-- 2. Buscar especificamente matrículas de 2026
SELECT 
  id,
  student_cpf,
  student_name,
  status,
  created_at
FROM enrollments
WHERE created_at >= '2026-01-01'
  AND created_at <= '2026-12-31';

-- 3. Ver alunos do ano anterior (2025)
SELECT 
  id,
  student_cpf,
  student_name,
  academic_year,
  series_name,
  status
FROM previous_year_students
WHERE academic_year = '2025'
LIMIT 10;

-- 4. Verificar se há CPFs duplicados entre as tabelas
SELECT 
  'enrollments' as source,
  student_cpf,
  student_name,
  created_at::date as date_info
FROM enrollments
WHERE student_cpf IN (
  SELECT student_cpf 
  FROM previous_year_students 
  WHERE academic_year = '2025'
)
UNION ALL
SELECT 
  'previous_year' as source,
  student_cpf,
  student_name,
  academic_year as date_info
FROM previous_year_students
WHERE academic_year = '2025'
  AND student_cpf IN (
    SELECT student_cpf 
    FROM enrollments
  )
ORDER BY student_cpf, source;