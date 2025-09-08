-- =====================================================
-- MIGRATION: 018_add_user_tracking_enrollments.sql
-- DESCRIÇÃO: Adiciona rastreamento de usuário nas matrículas
-- DATA: 2025-01-07
-- =====================================================

-- Adicionar colunas de rastreamento de usuário na tabela enrollments
ALTER TABLE public.enrollments 
ADD COLUMN IF NOT EXISTS created_by_user_id UUID NULL,
ADD COLUMN IF NOT EXISTS created_by_user_email TEXT NULL,
ADD COLUMN IF NOT EXISTS created_by_user_name TEXT NULL,
ADD COLUMN IF NOT EXISTS created_by_user_type TEXT CHECK (created_by_user_type IN ('admin', 'matricula', 'anonymous')) DEFAULT 'anonymous';

-- Índices para consultas de auditoria
CREATE INDEX IF NOT EXISTS idx_enrollments_created_by_user_id ON public.enrollments(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_created_by_user_type ON public.enrollments(created_by_user_type);
CREATE INDEX IF NOT EXISTS idx_enrollments_created_by_user_email ON public.enrollments(created_by_user_email);

-- Comentários explicativos
COMMENT ON COLUMN public.enrollments.created_by_user_id IS 'ID do usuário que criou a matrícula (admin_users.id ou matricula_users.id)';
COMMENT ON COLUMN public.enrollments.created_by_user_email IS 'Email do usuário que criou a matrícula (para auditoria)';
COMMENT ON COLUMN public.enrollments.created_by_user_name IS 'Nome do usuário que criou a matrícula (para auditoria)';
COMMENT ON COLUMN public.enrollments.created_by_user_type IS 'Tipo do usuário: admin, matricula ou anonymous';

-- =====================================================
-- Atualizar políticas RLS existentes para incluir novos campos
-- As políticas já existentes continuam funcionando
-- Apenas garantimos que os novos campos sejam acessíveis
-- =====================================================

-- Grants mínimos para garantir que os campos possam ser preenchidos
-- (complementa os grants já existentes)
GRANT UPDATE (created_by_user_id, created_by_user_email, created_by_user_name, created_by_user_type) 
  ON public.enrollments TO anon;

-- =====================================================
-- Função auxiliar para obter informações do usuário atual
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_current_user_info()
RETURNS TABLE (
  user_id UUID,
  user_email TEXT,
  user_name TEXT,
  user_type TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_auth_id UUID;
  v_admin_user RECORD;
  v_matricula_user RECORD;
BEGIN
  -- Obter ID do usuário autenticado (se houver)
  v_auth_id := auth.uid();
  
  -- Se não há usuário autenticado, retornar anônimo
  IF v_auth_id IS NULL THEN
    RETURN QUERY SELECT 
      NULL::UUID as user_id,
      NULL::TEXT as user_email,
      NULL::TEXT as user_name,
      'anonymous'::TEXT as user_type;
    RETURN;
  END IF;
  
  -- Verificar se é um admin
  SELECT * INTO v_admin_user
  FROM public.admin_users
  WHERE auth_user_id = v_auth_id
    AND ativo = true
  LIMIT 1;
  
  IF FOUND THEN
    RETURN QUERY SELECT 
      v_admin_user.id as user_id,
      v_admin_user.email::TEXT as user_email,
      v_admin_user.nome as user_name,
      'admin'::TEXT as user_type;
    RETURN;
  END IF;
  
  -- Verificar se é um usuário de matrícula
  SELECT * INTO v_matricula_user
  FROM public.matricula_users
  WHERE auth_user_id = v_auth_id
    AND ativo = true
  LIMIT 1;
  
  IF FOUND THEN
    RETURN QUERY SELECT 
      v_matricula_user.id as user_id,
      v_matricula_user.email::TEXT as user_email,
      v_matricula_user.nome as user_name,
      'matricula'::TEXT as user_type;
    RETURN;
  END IF;
  
  -- Se chegou aqui, é um usuário autenticado mas não identificado
  RETURN QUERY SELECT 
    v_auth_id as user_id,
    auth.email()::TEXT as user_email,
    'Authenticated User'::TEXT as user_name,
    'anonymous'::TEXT as user_type;
END;
$$;

-- Grant de execução para a função
GRANT EXECUTE ON FUNCTION public.get_current_user_info() TO anon;
GRANT EXECUTE ON FUNCTION public.get_current_user_info() TO authenticated;

-- =====================================================
-- Atualizar matrículas existentes (opcional)
-- Define todas as matrículas antigas como criadas por "anonymous"
-- =====================================================
UPDATE public.enrollments 
SET 
  created_by_user_type = 'anonymous'
WHERE 
  created_by_user_type IS NULL;

-- =====================================================
-- Estatísticas pós-migração (apenas informativo)
-- =====================================================
DO $$
DECLARE
  v_total_enrollments INTEGER;
  v_columns_exist BOOLEAN;
BEGIN
  -- Verificar se as colunas foram criadas
  SELECT COUNT(*) > 0 INTO v_columns_exist
  FROM information_schema.columns
  WHERE table_schema = 'public' 
    AND table_name = 'enrollments'
    AND column_name IN ('created_by_user_id', 'created_by_user_email', 'created_by_user_name', 'created_by_user_type');
  
  IF v_columns_exist THEN
    SELECT COUNT(*) INTO v_total_enrollments FROM public.enrollments;
    RAISE NOTICE 'Migração 018 aplicada com sucesso!';
    RAISE NOTICE 'Total de matrículas na base: %', v_total_enrollments;
    RAISE NOTICE 'Colunas de rastreamento de usuário adicionadas.';
  ELSE
    RAISE WARNING 'Erro na aplicação da migração 018 - colunas não foram criadas';
  END IF;
END $$;

-- =====================================================
-- ROLLBACK (apenas para desenvolvimento)
-- Descomente as linhas abaixo se precisar reverter
-- =====================================================
-- ALTER TABLE public.enrollments 
-- DROP COLUMN IF EXISTS created_by_user_id,
-- DROP COLUMN IF EXISTS created_by_user_email,
-- DROP COLUMN IF EXISTS created_by_user_name,
-- DROP COLUMN IF EXISTS created_by_user_type;
-- 
-- DROP FUNCTION IF EXISTS public.get_current_user_info();
-- 
-- DROP INDEX IF EXISTS idx_enrollments_created_by_user_id;
-- DROP INDEX IF EXISTS idx_enrollments_created_by_user_type;
-- DROP INDEX IF EXISTS idx_enrollments_created_by_user_email;

-- Fim da migração 018