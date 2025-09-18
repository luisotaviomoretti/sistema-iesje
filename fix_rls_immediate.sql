-- =====================================================
-- FIX RLS IMMEDIATE - Execute este script no Supabase SQL Editor
-- =====================================================

-- 1. Remover política existente (se houver) e criar nova
DROP POLICY IF EXISTS "Allow public read for CPF validation" ON public.previous_year_students;

CREATE POLICY "Allow public read for CPF validation"
  ON public.previous_year_students
  FOR SELECT
  USING (true);

-- 2. Garantir permissões de SELECT
GRANT SELECT ON public.previous_year_students TO anon;
GRANT SELECT ON public.previous_year_students TO authenticated;

-- 3. Verificar que funcionou
SELECT 
  'Teste de leitura' as teste,
  COUNT(*) as total_registros 
FROM public.previous_year_students;

-- 4. Testar busca específica
SELECT 
  student_name,
  student_cpf,
  academic_year,
  series_name,
  student_escola
FROM public.previous_year_students
WHERE student_cpf = '11111111111'
  AND academic_year = '2025';