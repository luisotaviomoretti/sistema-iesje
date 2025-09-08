-- =====================================================
-- MIGRATION: 019_fix_permissions_final.sql
-- DESCRIÇÃO: Correção definitiva de permissões para matrículas
-- DATA: 2025-01-07
-- =====================================================

-- =====================================================
-- 1. VERIFICAR E CORRIGIR ESTRUTURA DAS TABELAS
-- =====================================================

-- Verificar se a coluna auth_user_id existe em admin_users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'admin_users' 
    AND column_name = 'auth_user_id'
  ) THEN
    ALTER TABLE public.admin_users ADD COLUMN auth_user_id UUID UNIQUE;
    RAISE NOTICE 'Coluna auth_user_id adicionada em admin_users';
  END IF;
END $$;

-- Verificar se a coluna auth_user_id existe em matricula_users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'matricula_users' 
    AND column_name = 'auth_user_id'
  ) THEN
    ALTER TABLE public.matricula_users ADD COLUMN auth_user_id UUID UNIQUE;
    RAISE NOTICE 'Coluna auth_user_id adicionada em matricula_users';
  END IF;
END $$;

-- =====================================================
-- 2. LIMPAR TODAS AS POLÍTICAS ANTIGAS
-- =====================================================

-- Limpar políticas de enrollments
DROP POLICY IF EXISTS "Público pode inserir enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Público pode atualizar enrollments recentes" ON public.enrollments;
DROP POLICY IF EXISTS "Todos podem inserir enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Pode atualizar enrollments recentes" ON public.enrollments;
DROP POLICY IF EXISTS "Usuários de matrícula podem ler enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "inserir_enrollments_publico" ON public.enrollments;
DROP POLICY IF EXISTS "atualizar_enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "ler_enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Admins podem ler enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Admins podem atualizar enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Super admins podem deletar enrollments" ON public.enrollments;

-- Limpar políticas de enrollment_discounts
DROP POLICY IF EXISTS "Público pode inserir enrollment_discounts de matrículas recentes" ON public.enrollment_discounts;
DROP POLICY IF EXISTS "Todos podem inserir enrollment_discounts para matrículas recentes" ON public.enrollment_discounts;
DROP POLICY IF EXISTS "Usuários de matrícula podem ler enrollment_discounts" ON public.enrollment_discounts;
DROP POLICY IF EXISTS "inserir_enrollment_discounts" ON public.enrollment_discounts;
DROP POLICY IF EXISTS "ler_enrollment_discounts" ON public.enrollment_discounts;
DROP POLICY IF EXISTS "Admins podem ler enrollment_discounts" ON public.enrollment_discounts;
DROP POLICY IF EXISTS "Admins podem atualizar enrollment_discounts" ON public.enrollment_discounts;
DROP POLICY IF EXISTS "Admins podem deletar enrollment_discounts" ON public.enrollment_discounts;

-- Limpar políticas de enrollment_documents
DROP POLICY IF EXISTS "Público pode inserir enrollment_documents de matrículas recentes" ON public.enrollment_documents;
DROP POLICY IF EXISTS "Todos podem inserir enrollment_documents para matrículas recentes" ON public.enrollment_documents;
DROP POLICY IF EXISTS "Usuários de matrícula podem ler enrollment_documents" ON public.enrollment_documents;
DROP POLICY IF EXISTS "inserir_enrollment_documents" ON public.enrollment_documents;
DROP POLICY IF EXISTS "ler_enrollment_documents" ON public.enrollment_documents;
DROP POLICY IF EXISTS "Admins podem ler enrollment_documents" ON public.enrollment_documents;
DROP POLICY IF EXISTS "Admins podem atualizar enrollment_documents" ON public.enrollment_documents;
DROP POLICY IF EXISTS "Admins podem deletar enrollment_documents" ON public.enrollment_documents;

-- =====================================================
-- 3. CRIAR POLÍTICAS SIMPLES E FUNCIONAIS
-- =====================================================

-- ENROLLMENTS: Políticas simplificadas
CREATE POLICY "policy_insert_enrollments"
  ON public.enrollments
  FOR INSERT
  WITH CHECK (true); -- Qualquer um pode inserir

CREATE POLICY "policy_select_enrollments"
  ON public.enrollments
  FOR SELECT
  USING (true); -- Temporariamente permitir leitura para todos para testes

CREATE POLICY "policy_update_enrollments"
  ON public.enrollments
  FOR UPDATE
  USING (
    -- Pode atualizar se é recente (2 horas)
    created_at >= (NOW() - INTERVAL '2 hours')
    OR
    -- Ou se é admin (verificação simplificada)
    auth.uid() IN (SELECT auth_user_id FROM public.admin_users WHERE ativo = true)
  )
  WITH CHECK (
    created_at >= (NOW() - INTERVAL '2 hours')
    OR
    auth.uid() IN (SELECT auth_user_id FROM public.admin_users WHERE ativo = true)
  );

-- ENROLLMENT_DISCOUNTS: Políticas simplificadas
CREATE POLICY "policy_insert_enrollment_discounts"
  ON public.enrollment_discounts
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.enrollments 
      WHERE id = enrollment_id 
      AND created_at >= (NOW() - INTERVAL '2 hours')
    )
  );

CREATE POLICY "policy_select_enrollment_discounts"
  ON public.enrollment_discounts
  FOR SELECT
  USING (true); -- Temporariamente permitir leitura para todos

-- ENROLLMENT_DOCUMENTS: Políticas simplificadas
CREATE POLICY "policy_insert_enrollment_documents"
  ON public.enrollment_documents
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.enrollments 
      WHERE id = enrollment_id 
      AND created_at >= (NOW() - INTERVAL '2 hours')
    )
  );

CREATE POLICY "policy_select_enrollment_documents"
  ON public.enrollment_documents
  FOR SELECT
  USING (true); -- Temporariamente permitir leitura para todos

-- =====================================================
-- 4. GARANTIR GRANTS CORRETOS
-- =====================================================

-- Para authenticated (usuários logados)
GRANT ALL ON public.enrollments TO authenticated;
GRANT ALL ON public.enrollment_discounts TO authenticated;
GRANT ALL ON public.enrollment_documents TO authenticated;

-- Para anon (usuários não logados)
GRANT INSERT, UPDATE, SELECT ON public.enrollments TO anon;
GRANT INSERT, SELECT ON public.enrollment_discounts TO anon;
GRANT INSERT, SELECT ON public.enrollment_documents TO anon;

-- Service role tem tudo
GRANT ALL ON public.enrollments TO service_role;
GRANT ALL ON public.enrollment_discounts TO service_role;
GRANT ALL ON public.enrollment_documents TO service_role;

-- =====================================================
-- 5. FUNÇÕES AUXILIARES CORRIGIDAS
-- =====================================================

-- Função para verificar se é admin (corrigida)
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.admin_users 
    WHERE (
      -- Verifica por auth_user_id se existir
      (auth_user_id IS NOT NULL AND auth_user_id = auth.uid())
      OR
      -- Ou verifica por email se auth_user_id for NULL
      (auth_user_id IS NULL AND email = auth.email())
    )
    AND ativo = true
  );
$$;

-- Função para verificar se é usuário de matrícula (corrigida)
CREATE OR REPLACE FUNCTION public.is_matricula_user()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.matricula_users 
    WHERE (
      -- Verifica por auth_user_id se existir
      (auth_user_id IS NOT NULL AND auth_user_id = auth.uid())
      OR
      -- Ou verifica por email se auth_user_id for NULL
      (auth_user_id IS NULL AND email = auth.email())
    )
    AND ativo = true
  );
$$;

-- Grants para as funções
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO anon;
GRANT EXECUTE ON FUNCTION public.is_matricula_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_matricula_user() TO anon;

-- =====================================================
-- 6. VALIDAÇÃO FINAL
-- =====================================================
DO $$
DECLARE
  v_policy_count INTEGER;
  v_grant_count INTEGER;
BEGIN
  -- Contar políticas criadas
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE tablename IN ('enrollments', 'enrollment_discounts', 'enrollment_documents')
    AND schemaname = 'public';
  
  -- Contar grants para authenticated
  SELECT COUNT(DISTINCT privilege_type) INTO v_grant_count
  FROM information_schema.table_privileges
  WHERE table_schema = 'public'
    AND table_name = 'enrollments'
    AND grantee = 'authenticated';
  
  RAISE NOTICE '====================================';
  RAISE NOTICE 'MIGRATION APLICADA COM SUCESSO!';
  RAISE NOTICE '====================================';
  RAISE NOTICE 'Total de políticas criadas: %', v_policy_count;
  RAISE NOTICE 'Privilégios para authenticated: %', v_grant_count;
  RAISE NOTICE '------------------------------------';
  RAISE NOTICE 'Agora qualquer usuário pode:';
  RAISE NOTICE '✅ Inserir matrículas';
  RAISE NOTICE '✅ Ver matrículas';
  RAISE NOTICE '✅ Atualizar matrículas recentes (2h)';
  RAISE NOTICE '====================================';
END $$;

-- =====================================================
-- ROLLBACK (apenas desenvolvimento)
-- =====================================================
-- DROP POLICY IF EXISTS "policy_insert_enrollments" ON public.enrollments;
-- DROP POLICY IF EXISTS "policy_select_enrollments" ON public.enrollments;
-- DROP POLICY IF EXISTS "policy_update_enrollments" ON public.enrollments;
-- DROP POLICY IF EXISTS "policy_insert_enrollment_discounts" ON public.enrollment_discounts;
-- DROP POLICY IF EXISTS "policy_select_enrollment_discounts" ON public.enrollment_discounts;
-- DROP POLICY IF EXISTS "policy_insert_enrollment_documents" ON public.enrollment_documents;
-- DROP POLICY IF EXISTS "policy_select_enrollment_documents" ON public.enrollment_documents;

-- Fim da migração 019