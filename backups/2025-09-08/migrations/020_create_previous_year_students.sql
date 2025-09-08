-- =====================================================
-- MIGRATION: 020_create_previous_year_students.sql
-- DESCRIÇÃO: Criação da tabela previous_year_students (base 2025)
--            e da tabela validation_audit, com índices e RLS restritiva.
-- DATA: 2025-01-XX
-- =====================================================

-- Extensão necessária
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =====================================
-- TABELA: previous_year_students (base)
-- =====================================
CREATE TABLE IF NOT EXISTS public.previous_year_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Dados do Aluno (ano anterior)
  student_name TEXT NOT NULL,
  student_cpf TEXT NOT NULL,
  student_rg TEXT,
  student_birth_date DATE NOT NULL,
  student_gender TEXT CHECK (student_gender IN ('M', 'F', 'other')),
  student_escola TEXT CHECK (student_escola IN ('pelicano', 'sete_setembro')),

  -- Acadêmico (ano anterior)
  series_id TEXT NOT NULL,
  series_name TEXT NOT NULL,
  track_id TEXT NOT NULL,
  track_name TEXT NOT NULL,
  shift TEXT CHECK (shift IN ('morning', 'afternoon', 'night')),

  -- Responsáveis (ano anterior)
  guardian1_name TEXT NOT NULL,
  guardian1_cpf TEXT NOT NULL,
  guardian1_phone TEXT NOT NULL,
  guardian1_email TEXT NOT NULL,
  guardian1_relationship TEXT NOT NULL,

  guardian2_name TEXT,
  guardian2_cpf TEXT,
  guardian2_phone TEXT,
  guardian2_email TEXT,
  guardian2_relationship TEXT,

  -- Endereço (ano anterior)
  address_cep TEXT NOT NULL,
  address_street TEXT NOT NULL,
  address_number TEXT NOT NULL,
  address_complement TEXT,
  address_district TEXT NOT NULL,
  address_city TEXT NOT NULL,
  address_state TEXT NOT NULL,

  -- Financeiro (ano anterior)
  base_value NUMERIC(10,2) NOT NULL,
  total_discount_percentage NUMERIC(5,2) DEFAULT 0,
  final_monthly_value NUMERIC(10,2) NOT NULL,
  applied_discounts JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Metadados
  academic_year TEXT NOT NULL DEFAULT '2025',
  enrollment_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Restrições de formato CPF (11 dígitos numéricos após sanitização)
  CONSTRAINT chk_previous_year_student_cpf_11digits
    CHECK (char_length(regexp_replace(student_cpf, '\\D', '', 'g')) = 11),
  CONSTRAINT chk_previous_year_guardian1_cpf_11digits
    CHECK (char_length(regexp_replace(guardian1_cpf, '\\D', '', 'g')) = 11),
  CONSTRAINT chk_previous_year_guardian2_cpf_11digits
    CHECK (guardian2_cpf IS NULL OR char_length(regexp_replace(guardian2_cpf, '\\D', '', 'g')) = 11),

  -- Unicidade por ano (um registro por CPF por ano)
  CONSTRAINT uq_previous_year_students_cpf_year UNIQUE (student_cpf, academic_year)
);

COMMENT ON TABLE public.previous_year_students IS 'Base de alunos do ano anterior (2025) para rematrícula.';

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_previous_year_students_cpf
  ON public.previous_year_students (student_cpf);
CREATE INDEX IF NOT EXISTS idx_previous_year_students_year
  ON public.previous_year_students (academic_year);

-- Trigger para updated_at (função definida em migrações anteriores)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE t.tgname = 'update_previous_year_students_updated_at'
      AND n.nspname = 'public'
      AND c.relname = 'previous_year_students'
  ) THEN
    CREATE TRIGGER update_previous_year_students_updated_at
      BEFORE UPDATE ON public.previous_year_students
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- ==============================
-- RLS e Grants (restritivo)
-- ==============================
ALTER TABLE public.previous_year_students ENABLE ROW LEVEL SECURITY;

-- Nenhuma política pública: somente service_role (via key) acessa
-- Revogar permissões implícitas e conceder apenas ao service_role
REVOKE ALL ON public.previous_year_students FROM PUBLIC;
REVOKE ALL ON public.previous_year_students FROM anon;
REVOKE ALL ON public.previous_year_students FROM authenticated;
GRANT ALL ON public.previous_year_students TO service_role;

-- =====================================================
-- TABELA: validation_audit (auditoria de validação de CPF)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.validation_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cpf_hash TEXT NOT NULL,
  result TEXT NOT NULL CHECK (result IN ('invalid', 'not_found', 'previous_year', 'current_year', 'rate_limited', 'error')),
  ip INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.validation_audit IS 'Auditoria de validações de CPF (hash + resultado), sem PII bruta.';

-- Índice composto para consultas por hash e janela de tempo
CREATE INDEX IF NOT EXISTS idx_validation_audit_hash_created
  ON public.validation_audit (cpf_hash, created_at DESC);

-- RLS e Grants (somente Edge/service)
ALTER TABLE public.validation_audit ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.validation_audit FROM PUBLIC;
REVOKE ALL ON public.validation_audit FROM anon;
REVOKE ALL ON public.validation_audit FROM authenticated;
GRANT ALL ON public.validation_audit TO service_role;

-- Opcional: Política de leitura somente service_role (na prática, service_role ignora RLS)
-- Mantemos sem políticas para negar acesso a anon/authenticated por RLS + GRANTs.

-- ============================
-- ROLLBACK (DEV):
-- -- Descomentar para desfazer em ambiente de desenvolvimento
-- -- ATENÇÃO: Isto apagará os dados!
-- -- DROP TABLE IF EXISTS public.validation_audit;
-- -- DROP TABLE IF EXISTS public.previous_year_students;
-- ============================

-- Fim da migração 020
