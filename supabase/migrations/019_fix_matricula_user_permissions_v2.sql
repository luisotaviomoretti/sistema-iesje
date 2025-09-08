-- =====================================================
-- MIGRATION: 019_fix_matricula_user_permissions_v2.sql
-- DESCRIÇÃO: Corrige permissões para QUALQUER usuário logado criar enrollments
-- DATA: 2025-01-07
-- =====================================================

-- =====================================================
-- OBJETIVO: Qualquer usuário logado no Sistema de Matrículas pode criar matrículas
-- =====================================================

-- 1. Limpar políticas antigas problemáticas
DROP POLICY IF EXISTS "Público pode inserir enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Público pode atualizar enrollments recentes" ON public.enrollments;
DROP POLICY IF EXISTS "Todos podem inserir enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Pode atualizar enrollments recentes" ON public.enrollments;
DROP POLICY IF EXISTS "Usuários de matrícula podem ler enrollments" ON public.enrollments;

-- 2. POLÍTICA PRINCIPAL: Qualquer um pode inserir matrículas
CREATE POLICY "inserir_enrollments_publico"
  ON public.enrollments
  FOR INSERT
  WITH CHECK (true);

-- 3. POLÍTICA DE ATUALIZAÇÃO: Matrículas recentes ou admins
CREATE POLICY "atualizar_enrollments"
  ON public.enrollments
  FOR UPDATE
  USING (
    -- Admins podem atualizar tudo
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE auth_user_id = auth.uid() 
      AND ativo = true
    )
    OR 
    -- Qualquer um pode atualizar matrículas das últimas 2 horas
    (created_at >= NOW() - INTERVAL '2 hours')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE auth_user_id = auth.uid() 
      AND ativo = true
    )
    OR 
    (created_at >= NOW() - INTERVAL '2 hours')
  );

-- 4. POLÍTICA DE LEITURA: Admins e usuários de matrícula
CREATE POLICY "ler_enrollments"
  ON public.enrollments
  FOR SELECT
  USING (
    -- Admins podem ver tudo
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE auth_user_id = auth.uid() 
      AND ativo = true
    )
    OR
    -- Usuários de matrícula podem ver
    EXISTS (
      SELECT 1 FROM public.matricula_users 
      WHERE auth_user_id = auth.uid() 
      AND ativo = true
    )
  );

-- 5. Garantir GRANTS corretos
-- Para usuários autenticados (logados)
GRANT ALL ON public.enrollments TO authenticated;
GRANT ALL ON public.enrollment_discounts TO authenticated;
GRANT ALL ON public.enrollment_documents TO authenticated;

-- Para usuários anônimos (não logados - formulário público)
GRANT INSERT, UPDATE ON public.enrollments TO anon;
GRANT INSERT ON public.enrollment_discounts TO anon;
GRANT INSERT ON public.enrollment_documents TO anon;

-- Service role tem tudo
GRANT ALL ON public.enrollments TO service_role;
GRANT ALL ON public.enrollment_discounts TO service_role;
GRANT ALL ON public.enrollment_documents TO service_role;

-- 6. Políticas para tabelas relacionadas (enrollment_discounts)
DROP POLICY IF EXISTS "Público pode inserir enrollment_discounts de matrículas recentes" ON public.enrollment_discounts;
DROP POLICY IF EXISTS "Todos podem inserir enrollment_discounts para matrículas recentes" ON public.enrollment_discounts;
DROP POLICY IF EXISTS "Usuários de matrícula podem ler enrollment_discounts" ON public.enrollment_discounts;

CREATE POLICY "inserir_enrollment_discounts"
  ON public.enrollment_discounts
  FOR INSERT
  WITH CHECK (
    -- Pode inserir se a matrícula existe e é recente
    EXISTS (
      SELECT 1 
      FROM public.enrollments e
      WHERE e.id = enrollment_id
        AND e.created_at >= NOW() - INTERVAL '2 hours'
    )
  );

CREATE POLICY "ler_enrollment_discounts"
  ON public.enrollment_discounts
  FOR SELECT
  USING (
    -- Admins ou usuários de matrícula
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE auth_user_id = auth.uid() 
      AND ativo = true
    )
    OR
    EXISTS (
      SELECT 1 FROM public.matricula_users 
      WHERE auth_user_id = auth.uid() 
      AND ativo = true
    )
  );

-- 7. Políticas para tabelas relacionadas (enrollment_documents)
DROP POLICY IF EXISTS "Público pode inserir enrollment_documents de matrículas recentes" ON public.enrollment_documents;
DROP POLICY IF EXISTS "Todos podem inserir enrollment_documents para matrículas recentes" ON public.enrollment_documents;
DROP POLICY IF EXISTS "Usuários de matrícula podem ler enrollment_documents" ON public.enrollment_documents;

CREATE POLICY "inserir_enrollment_documents"
  ON public.enrollment_documents
  FOR INSERT
  WITH CHECK (
    -- Pode inserir se a matrícula existe e é recente
    EXISTS (
      SELECT 1 
      FROM public.enrollments e
      WHERE e.id = enrollment_id
        AND e.created_at >= NOW() - INTERVAL '2 hours'
    )
  );

CREATE POLICY "ler_enrollment_documents"
  ON public.enrollment_documents
  FOR SELECT
  USING (
    -- Admins ou usuários de matrícula
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE auth_user_id = auth.uid() 
      AND ativo = true
    )
    OR
    EXISTS (
      SELECT 1 FROM public.matricula_users 
      WHERE auth_user_id = auth.uid() 
      AND ativo = true
    )
  );

-- 8. Função auxiliar simplificada para verificar usuário de matrícula
CREATE OR REPLACE FUNCTION public.is_matricula_user()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.matricula_users 
    WHERE auth_user_id = auth.uid() 
      AND ativo = true
  );
$$;

-- Grants para a função
GRANT EXECUTE ON FUNCTION public.is_matricula_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_matricula_user() TO anon;

-- =====================================================
-- VALIDAÇÃO SIMPLES (sem o loop problemático)
-- =====================================================
DO $$
DECLARE
  v_policy_count INTEGER;
  v_grant_count INTEGER;
BEGIN
  -- Contar políticas
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE tablename = 'enrollments'
    AND schemaname = 'public';
  
  RAISE NOTICE '✅ Total de políticas em enrollments: %', v_policy_count;
  
  -- Verificar grants para authenticated
  SELECT COUNT(*) INTO v_grant_count
  FROM information_schema.table_privileges
  WHERE table_schema = 'public'
    AND table_name = 'enrollments'
    AND grantee = 'authenticated'
    AND privilege_type IN ('INSERT', 'SELECT', 'UPDATE');
    
  RAISE NOTICE '✅ Grants para authenticated em enrollments: %', v_grant_count;
  
  IF v_policy_count >= 3 AND v_grant_count >= 3 THEN
    RAISE NOTICE '✅ Migration aplicada com sucesso!';
  ELSE
    RAISE WARNING '⚠️ Verifique as políticas e grants manualmente';
  END IF;
END $$;

-- =====================================================
-- INFORMAÇÕES IMPORTANTES
-- =====================================================
-- Após aplicar esta migration:
-- 1. QUALQUER usuário (logado ou não) pode CRIAR matrículas
-- 2. Usuários logados como admin ou matrícula podem VER matrículas
-- 3. Matrículas recentes (2h) podem ser ATUALIZADAS por qualquer um
-- 4. O sistema registra automaticamente quem criou cada matrícula
-- =====================================================

-- ROLLBACK (apenas para desenvolvimento)
-- DROP POLICY IF EXISTS "inserir_enrollments_publico" ON public.enrollments;
-- DROP POLICY IF EXISTS "atualizar_enrollments" ON public.enrollments;
-- DROP POLICY IF EXISTS "ler_enrollments" ON public.enrollments;
-- DROP POLICY IF EXISTS "inserir_enrollment_discounts" ON public.enrollment_discounts;
-- DROP POLICY IF EXISTS "ler_enrollment_discounts" ON public.enrollment_discounts;
-- DROP POLICY IF EXISTS "inserir_enrollment_documents" ON public.enrollment_documents;
-- DROP POLICY IF EXISTS "ler_enrollment_documents" ON public.enrollment_documents;

-- Fim da migração 019 v2