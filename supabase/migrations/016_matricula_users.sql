-- =====================================================
-- MIGRATION: 016_matricula_users.sql
-- DESCRIÇÃO: Tabela de usuários do Sistema de Matrículas (fase 1)
-- DATA: 2025-09-06
-- =====================================================

-- Extensão necessária para e-mail case-insensitive
CREATE EXTENSION IF NOT EXISTS citext;

-- =====================================================
-- TABELA: matricula_users
-- Usuários do Sistema de Matrículas, cada um vinculado a UMA escola
-- =====================================================
CREATE TABLE IF NOT EXISTS public.matricula_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id UUID UNIQUE, -- Referência lógica a auth.users.id (não FK direta)
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

-- Índices complementares
CREATE INDEX IF NOT EXISTS idx_matricula_users_ativo ON public.matricula_users(ativo);
CREATE INDEX IF NOT EXISTS idx_matricula_users_escola ON public.matricula_users(escola);

-- Comentários
COMMENT ON TABLE public.matricula_users IS 'Usuários do Sistema de Matrículas, um usuário por escola.';
COMMENT ON COLUMN public.matricula_users.auth_user_id IS 'ID do usuário no auth.users (referência lógica).';
COMMENT ON COLUMN public.matricula_users.escola IS 'Escola do usuário (Pelicano ou Sete de Setembro).';

-- =====================================================
-- TRIGGERS: updated_at e auditoria
-- =====================================================
-- Trigger para updated_at (usa função já presente em migrações anteriores)
DROP TRIGGER IF EXISTS trigger_matricula_users_updated_at ON public.matricula_users;
CREATE TRIGGER trigger_matricula_users_updated_at
  BEFORE UPDATE ON public.matricula_users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger de auditoria genérica (usa public.audit_changes se disponível)
DO $$
BEGIN
  -- Tenta criar o trigger de auditoria apenas se a função existir
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
