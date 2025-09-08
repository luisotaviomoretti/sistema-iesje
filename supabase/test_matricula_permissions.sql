-- =====================================================
-- SCRIPT DE TESTE: Permissões de Usuário de Matrícula
-- Execute este script para verificar as permissões
-- =====================================================

-- 1. Verificar políticas RLS na tabela enrollments
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'enrollments'
  AND schemaname = 'public'
ORDER BY policyname;

-- 2. Verificar grants na tabela enrollments
SELECT 
  grantee,
  privilege_type,
  is_grantable
FROM information_schema.table_privileges
WHERE table_schema = 'public'
  AND table_name = 'enrollments'
  AND grantee IN ('anon', 'authenticated', 'service_role')
ORDER BY grantee, privilege_type;

-- 3. Testar função is_matricula_user
SELECT public.is_matricula_user();

-- 4. Testar função is_admin_user
SELECT public.is_admin_user();

-- 5. Verificar se o usuário atual pode inserir em enrollments
SELECT has_table_privilege('enrollments', 'INSERT') as pode_inserir,
       has_table_privilege('enrollments', 'SELECT') as pode_ler,
       has_table_privilege('enrollments', 'UPDATE') as pode_atualizar,
       has_table_privilege('enrollments', 'DELETE') as pode_deletar;

-- 6. Verificar usuário atual
SELECT 
  auth.uid() as user_id,
  auth.email() as user_email,
  auth.role() as role,
  CASE 
    WHEN auth.uid() IS NULL THEN 'Não autenticado'
    WHEN EXISTS (
      SELECT 1 FROM admin_users 
      WHERE auth_user_id = auth.uid() AND ativo = true
    ) THEN 'Admin'
    WHEN EXISTS (
      SELECT 1 FROM matricula_users 
      WHERE auth_user_id = auth.uid() AND ativo = true
    ) THEN 'Matrícula'
    ELSE 'Autenticado sem role'
  END as tipo_usuario;

-- 7. Simular inserção (sem executar)
EXPLAIN (ANALYZE false, BUFFERS false, FORMAT TEXT)
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
  created_by_user_type
) VALUES (
  'Teste Permissão',
  '00000000000',
  '2010-01-01',
  'test',
  'Test',
  'test',
  'Test',
  'Guardian Test',
  '11111111111',
  '11999999999',
  'test@test.com',
  'Pai',
  '01310-100',
  'Av. Paulista',
  '1000',
  'Bela Vista',
  'São Paulo',
  'SP',
  1000,
  850,
  'matricula'
);

-- 8. Verificar se existem políticas conflitantes
WITH policy_details AS (
  SELECT 
    pol.polname as policy_name,
    pol.polcmd as command,
    pol.polpermissive as permissive,
    CASE pol.polcmd
      WHEN 'r' THEN 'SELECT'
      WHEN 'a' THEN 'INSERT'
      WHEN 'w' THEN 'UPDATE'
      WHEN 'd' THEN 'DELETE'
      ELSE pol.polcmd::text
    END as operation,
    pg_get_expr(pol.polqual, pol.polrelid) as using_expr,
    pg_get_expr(pol.polwithcheck, pol.polrelid) as with_check_expr,
    rol.rolname as role_name
  FROM pg_policy pol
  JOIN pg_class cls ON pol.polrelid = cls.oid
  JOIN pg_namespace nsp ON cls.relnamespace = nsp.oid
  LEFT JOIN pg_roles rol ON pol.polroles @> ARRAY[rol.oid]
  WHERE nsp.nspname = 'public'
    AND cls.relname = 'enrollments'
)
SELECT 
  policy_name,
  operation,
  permissive,
  role_name,
  CASE 
    WHEN using_expr IS NULL THEN 'Sem restrição'
    ELSE using_expr
  END as condicao_leitura,
  CASE 
    WHEN with_check_expr IS NULL THEN 'Sem restrição'
    ELSE with_check_expr
  END as condicao_escrita
FROM policy_details
ORDER BY operation, policy_name;