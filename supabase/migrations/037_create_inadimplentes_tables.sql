-- =====================================================
-- MIGRATION: 037_create_inadimplentes_tables.sql
-- DESCRIÇÃO: Cria as tabelas de inadimplência e staging, 
--            com índices e triggers de updated_at. Sem RLS/policies (F2).
-- DATA: 2025-09-15
-- AUTOR: Cascade
-- =====================================================

-- Extensões usadas (idempotentes)
CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS unaccent;   -- utilizada por norm_text (já definida em migrações anteriores)

-- =====================================================
-- TABELA PRINCIPAL: public.inadimplentes
-- =====================================================
CREATE TABLE IF NOT EXISTS public.inadimplentes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Controle
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NULL,
  updated_by UUID NULL,

  -- Soft delete
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  deleted_at TIMESTAMPTZ NULL,
  deleted_by UUID NULL,
  deleted_reason TEXT NULL,

  -- Metadados
  source TEXT NULL, -- ex.: "csv-2025-09-15"

  -- Dados da planilha base
  codigo_inadim TEXT NULL,
  student_name TEXT NOT NULL,
  guardian1_name TEXT NULL,
  student_escola TEXT NULL,
  meses_inadim INTEGER NULL,

  -- Colunas normalizadas (geradas) para igualdade/aceleração de busca
  student_name_norm TEXT GENERATED ALWAYS AS (public.norm_text(student_name)) STORED,
  guardian1_name_norm TEXT GENERATED ALWAYS AS (public.norm_text(guardian1_name)) STORED,

  -- Regras
  CONSTRAINT chk_mes_inadim_nonneg CHECK (meses_inadim IS NULL OR meses_inadim >= 0)
);

COMMENT ON TABLE public.inadimplentes IS 'Relação de alunos inadimplentes para bloqueio de Rematrícula (soft delete via is_active).';
COMMENT ON COLUMN public.inadimplentes.student_name_norm IS 'Nome do aluno normalizado via norm_text (lower + unaccent).';
COMMENT ON COLUMN public.inadimplentes.guardian1_name_norm IS 'Nome do responsável 1 normalizado via norm_text.';

-- Índices (parciais por is_active)
CREATE INDEX IF NOT EXISTS idx_inadimplentes_active_name_norm
  ON public.inadimplentes (student_name_norm)
  WHERE is_active;

CREATE INDEX IF NOT EXISTS idx_inadimplentes_active_guardian_norm
  ON public.inadimplentes (guardian1_name_norm)
  WHERE is_active;

CREATE INDEX IF NOT EXISTS idx_inadimplentes_active_school
  ON public.inadimplentes (student_escola)
  WHERE is_active;

CREATE INDEX IF NOT EXISTS idx_inadimplentes_updated_at
  ON public.inadimplentes (updated_at DESC);

-- Unicidade ativa (evita duplicados equivalentes enquanto is_active=true)
CREATE UNIQUE INDEX IF NOT EXISTS uq_inadimplentes_active_name_guardian_school
  ON public.inadimplentes (
    student_name_norm,
    COALESCE(guardian1_name_norm, ''),
    COALESCE(student_escola, '')
  )
  WHERE is_active;

-- Trigger updated_at (usa função padrão já existente em migrações anteriores)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE t.tgname = 'update_inadimplentes_updated_at'
      AND n.nspname = 'public'
      AND c.relname = 'inadimplentes'
  ) THEN
    CREATE TRIGGER update_inadimplentes_updated_at
      BEFORE UPDATE ON public.inadimplentes
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- =====================================================
-- TABELA DE AUDITORIA: public.inadimplentes_audit (leve)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.inadimplentes_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  inadimplente_id UUID NULL,
  action TEXT NOT NULL CHECK (action IN ('insert','update','soft_delete','restore','import')),
  snapshot JSONB NULL,
  actor UUID NULL
);

COMMENT ON TABLE public.inadimplentes_audit IS 'Auditoria leve de operações na base de inadimplentes (snapshot e ator).';

CREATE INDEX IF NOT EXISTS idx_inadimplentes_audit_created
  ON public.inadimplentes_audit (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inadimplentes_audit_action
  ON public.inadimplentes_audit (action);

CREATE INDEX IF NOT EXISTS idx_inadimplentes_audit_inadimplente
  ON public.inadimplentes_audit (inadimplente_id);

-- =====================================================
-- TABELA DE STAGING: public.staging_inadimplentes_raw
-- =====================================================
CREATE TABLE IF NOT EXISTS public.staging_inadimplentes_raw (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  uploaded_by UUID NULL,

  csv_row JSONB NOT NULL,    -- linha bruta do CSV
  batch_id UUID NOT NULL,    -- identificador do upload (lote)
  processed BOOLEAN NOT NULL DEFAULT FALSE,
  error TEXT NULL
);

COMMENT ON TABLE public.staging_inadimplentes_raw IS 'Staging de ingestão CSV para inadimplentes (idempotente por batch).';

CREATE INDEX IF NOT EXISTS idx_staging_inadimplentes_batch
  ON public.staging_inadimplentes_raw (batch_id);

CREATE INDEX IF NOT EXISTS idx_staging_inadimplentes_processed
  ON public.staging_inadimplentes_raw (processed);

CREATE INDEX IF NOT EXISTS idx_staging_inadimplentes_created
  ON public.staging_inadimplentes_raw (created_at DESC);

-- =====================================================
-- NOTAS DE SEGURANÇA (F1):
--  - Nenhuma RLS/Policy aplicada aqui (será feito em F2).
--  - Sem FKs para schemas externos (ex.: auth.users) nesta fase para evitar acoplamento.
--  - Colunas *_norm dependem de public.norm_text (definida em migração 033).
--  - ÍNDICES parciais e expressão UNIQUE asseguram deduplicação ativa sem custo excessivo.
-- =====================================================
