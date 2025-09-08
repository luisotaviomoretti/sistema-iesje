-- =====================================================
-- SCRIPT DE TESTE PARA MIGRAÇÃO 018
-- Execute este script após aplicar a migração para verificar
-- =====================================================

-- 1. Verificar se as colunas foram criadas
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'enrollments'
  AND column_name IN ('created_by_user_id', 'created_by_user_email', 'created_by_user_name', 'created_by_user_type')
ORDER BY column_name;

-- 2. Verificar se os índices foram criados
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public' 
  AND tablename = 'enrollments'
  AND indexname IN ('idx_enrollments_created_by_user_id', 'idx_enrollments_created_by_user_type', 'idx_enrollments_created_by_user_email');

-- 3. Verificar se a função foi criada
SELECT 
  proname as function_name,
  pg_get_function_result(oid) as return_type
FROM pg_proc
WHERE proname = 'get_current_user_info'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- 4. Testar a função get_current_user_info
SELECT * FROM public.get_current_user_info();

-- 5. Verificar constraint do campo created_by_user_type
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.enrollments'::regclass
  AND pg_get_constraintdef(oid) LIKE '%created_by_user_type%';

-- 6. Contar matrículas por tipo de usuário
SELECT 
  created_by_user_type,
  COUNT(*) as total_matriculas,
  COUNT(created_by_user_id) as com_user_id,
  COUNT(created_by_user_email) as com_email,
  COUNT(created_by_user_name) as com_nome
FROM public.enrollments
GROUP BY created_by_user_type
ORDER BY created_by_user_type;

-- 7. Verificar comentários das colunas
SELECT 
  column_name,
  pg_catalog.col_description(pgc.oid, cols.ordinal_position) as column_comment
FROM information_schema.columns cols
INNER JOIN pg_catalog.pg_class pgc ON pgc.relname = cols.table_name
WHERE cols.table_schema = 'public'
  AND cols.table_name = 'enrollments'
  AND cols.column_name IN ('created_by_user_id', 'created_by_user_email', 'created_by_user_name', 'created_by_user_type')
ORDER BY cols.column_name;

-- 8. Teste de inserção com novos campos
-- (Este é apenas um exemplo, não execute em produção)
/*
INSERT INTO public.enrollments (
  student_name,
  student_cpf,
  student_birth_date,
  series_id,
  series_name,
  track_id,
  track_name,
  guardian1_name,
  guardian1_cpf,
  guardian1_phone,
  guardian1_email,
  guardian1_relationship,
  address_cep,
  address_street,
  address_number,
  address_district,
  address_city,
  address_state,
  base_value,
  final_monthly_value,
  created_by_user_type,
  created_by_user_email,
  created_by_user_name
) VALUES (
  'Teste User Tracking',
  '00000000000',
  '2010-01-01',
  'test-series',
  'Test Series',
  'test-track',
  'Test Track',
  'Guardian Test',
  '11111111111',
  '11999999999',
  'test@example.com',
  'Pai',
  '01310-100',
  'Av. Paulista',
  '1000',
  'Bela Vista',
  'São Paulo',
  'SP',
  1000.00,
  850.00,
  'anonymous',
  'test@example.com',
  'Test User'
) RETURNING id, created_by_user_type, created_by_user_email;
*/

-- 9. Resumo final
SELECT 
  'Migration 018 Status' as check_type,
  CASE 
    WHEN COUNT(*) = 4 THEN '✅ All columns created'
    ELSE '❌ Missing columns: ' || (4 - COUNT(*))::text
  END as status
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'enrollments'
  AND column_name IN ('created_by_user_id', 'created_by_user_email', 'created_by_user_name', 'created_by_user_type')

UNION ALL

SELECT 
  'Indexes Status' as check_type,
  CASE 
    WHEN COUNT(*) = 3 THEN '✅ All indexes created'
    ELSE '❌ Missing indexes: ' || (3 - COUNT(*))::text
  END as status
FROM pg_indexes
WHERE schemaname = 'public' 
  AND tablename = 'enrollments'
  AND indexname IN ('idx_enrollments_created_by_user_id', 'idx_enrollments_created_by_user_type', 'idx_enrollments_created_by_user_email')

UNION ALL

SELECT 
  'Function Status' as check_type,
  CASE 
    WHEN COUNT(*) = 1 THEN '✅ Function created'
    ELSE '❌ Function not found'
  END as status
FROM pg_proc
WHERE proname = 'get_current_user_info'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');