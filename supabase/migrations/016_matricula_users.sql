-- =====================================================
-- MIGRATION: 016_matricula_users.sql
-- DESCRI��O: Tabela de usu�rios do Sistema de Matr�culas (fase 1)
-- DATA: 2025-09-06
-- =====================================================

-- Extens�o necess�ria para e-mail case-insensitive
CREATE EXTENSION IF NOT EXISTS citext;

-- =====================================================
-- TABELA: matricula_users
-- Usu�rios do Sistema de Matr�culas, cada um vinculado a UMA escola
-- =====================================================
CREATE TABLE IF NOT EXISTS public.matricula_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id UUID UNIQUE, -- Refer�ncia l�gica a auth.users.id (n�o FK direta)
  email CITEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  escola TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login TIMESTAMPTZ NULL,

  -- Constraints
  CONSTRAINT matricula_users_email_format CHECK (
    email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  ),
  CONSTRAINT matricula_users_nome_length CHECK (length(nome) >= 2),
  CONSTRAINT matricula_users_escola_valid CHECK (escola IN ('Pelicano', 'Sete de Setembro'))
);

-- �ndices complementares
CREATE INDEX IF NOT EXISTS idx_matricula_users_ativo ON public.matricula_users(ativo);
CREATE INDEX IF NOT EXISTS idx_matricula_users_escola ON public.matricula_users(escola);

-- Coment�rios
COMMENT ON TABLE public.matricula_users IS 'Usu�rios do Sistema de Matr�culas, um usu�rio por escola.';
COMMENT ON COLUMN public.matricula_users.auth_user_id IS 'ID do usu�rio no auth.users (refer�ncia l�gica).';
COMMENT ON COLUMN public.matricula_users.escola IS 'Escola do usu�rio (Pelicano ou Sete de Setembro).';

-- =====================================================
-- TRIGGERS: updated_at e auditoria
-- =====================================================
-- Trigger para updated_at (usa fun��o j� presente em migra��es anteriores)
DROP TRIGGER IF EXISTS trigger_matricula_users_updated_at ON public.matricula_users;
CREATE TRIGGER trigger_matricula_users_updated_at
  BEFORE UPDATE ON public.matricula_users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger de auditoria gen�rica (usa public.audit_changes se dispon�vel)
DO $$
BEGIN
  -- Tenta criar o trigger de auditoria apenas se a fun��o existir
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'audit_changes' AND n.nspname = 'public'
  ) THEN
    DROP TRIGGER IF EXISTS trigger_matricula_users_audit ON public.matricula_users;
    CREATE TRIGGER trigger_matricula_users_audit
      AFTER INSERT OR UPDATE OR DELETE ON public.matricula_users
      FOR EACH ROW
      EXECUTE FUNCTION public.audit_changes();
  END IF;
END $$;
