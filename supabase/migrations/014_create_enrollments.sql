-- =====================================================
-- MIGRATION: 014_create_enrollments.sql
-- DESCRIÇÃO: Criação do schema de matrículas (enrollments)
--            e tabelas auxiliares + RLS + índices + trigger
-- DATA: 2025-01-10
-- =====================================================

-- Extensão para UUIDs, caso não esteja habilitada
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================
-- TABELA PRINCIPAL: enrollments
-- ============================
CREATE TABLE IF NOT EXISTS public.enrollments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Dados do Aluno
  student_name TEXT NOT NULL,
  student_cpf TEXT NOT NULL,
  student_rg TEXT,
  student_birth_date DATE NOT NULL,
  student_gender TEXT CHECK (student_gender IN ('M', 'F', 'other')),
  student_escola TEXT CHECK (student_escola IN ('pelicano', 'sete_setembro')),

  -- Dados Acadêmicos
  series_id TEXT NOT NULL,
  series_name TEXT NOT NULL,
  track_id TEXT NOT NULL,
  track_name TEXT NOT NULL,
  shift TEXT CHECK (shift IN ('morning', 'afternoon', 'night')),

  -- Dados do Responsável Principal
  guardian1_name TEXT NOT NULL,
  guardian1_cpf TEXT NOT NULL,
  guardian1_phone TEXT NOT NULL,
  guardian1_email TEXT NOT NULL,
  guardian1_relationship TEXT NOT NULL,

  -- Dados do Responsável Secundário (Opcional)
  guardian2_name TEXT,
  guardian2_cpf TEXT,
  guardian2_phone TEXT,
  guardian2_email TEXT,
  guardian2_relationship TEXT,

  -- Endereço
  address_cep TEXT NOT NULL,
  address_street TEXT NOT NULL,
  address_number TEXT NOT NULL,
  address_complement TEXT,
  address_district TEXT NOT NULL,
  address_city TEXT NOT NULL,
  address_state TEXT NOT NULL,

  -- Resumo Financeiro
  base_value NUMERIC(10,2) NOT NULL,
  total_discount_percentage NUMERIC(5,2) DEFAULT 0,
  total_discount_value NUMERIC(10,2) DEFAULT 0,
  final_monthly_value NUMERIC(10,2) NOT NULL,
  material_cost NUMERIC(10,2) DEFAULT 0,

  -- PDF e Documentos
  pdf_url TEXT,
  pdf_generated_at TIMESTAMP WITH TIME ZONE,

  -- Status e Controle
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'deleted')),
  approval_level TEXT CHECK (approval_level IN ('automatic', 'coordinator', 'director')),
  approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,

  -- Restrições
  UNIQUE(student_cpf, created_at)
);

COMMENT ON TABLE public.enrollments IS 'Matrículas com dados completos e status do fluxo';

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_enrollments_cpf ON public.enrollments(student_cpf);
CREATE INDEX IF NOT EXISTS idx_enrollments_created ON public.enrollments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON public.enrollments(status);

-- Trigger para updated_at (função já existente em migrações anteriores)
CREATE TRIGGER update_enrollments_updated_at
  BEFORE UPDATE ON public.enrollments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ==================================
-- TABELA: enrollment_discounts (filha)
-- ==================================
CREATE TABLE IF NOT EXISTS public.enrollment_discounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  enrollment_id UUID REFERENCES public.enrollments(id) ON DELETE CASCADE,

  discount_id TEXT NOT NULL,
  discount_code TEXT NOT NULL,
  discount_name TEXT NOT NULL,
  discount_category TEXT NOT NULL,
  percentage_applied NUMERIC(5,2) NOT NULL,
  value_applied NUMERIC(10,2) NOT NULL,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_enrollment_discounts_enrollment_id ON public.enrollment_discounts(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_discounts_created ON public.enrollment_discounts(created_at DESC);

COMMENT ON TABLE public.enrollment_discounts IS 'Descontos aplicados por matrícula';

-- ==================================
-- TABELA: enrollment_documents (filha)
-- ==================================
CREATE TABLE IF NOT EXISTS public.enrollment_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  enrollment_id UUID REFERENCES public.enrollments(id) ON DELETE CASCADE,

  document_type TEXT NOT NULL,
  document_name TEXT NOT NULL,
  file_url TEXT,
  is_required BOOLEAN DEFAULT false,
  is_uploaded BOOLEAN DEFAULT false,
  upload_date TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_enrollment_documents_enrollment_id ON public.enrollment_documents(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_documents_created ON public.enrollment_documents(created_at DESC);

COMMENT ON TABLE public.enrollment_documents IS 'Documentos previstos/entregues por matrícula';

-- ============================
-- RLS: Habilitar em todas as tabelas
-- ============================
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollment_discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollment_documents ENABLE ROW LEVEL SECURITY;

-- =========================================
-- POLÍTICAS: enrollments
-- Objetivo:
--  - Inserção pública (fluxo de matrícula)
--  - Atualização imediata (ex.: URL do PDF) na mesma sessão/fluxo (período curto)
--  - Leitura e gestão completas apenas por admins (admin_users)
-- =========================================

-- Leitura: apenas admins
CREATE POLICY "Admins podem ler enrollments"
  ON public.enrollments
  FOR SELECT
  USING (public.is_admin_user());

-- Inserção: pública (anon/autenticado)
CREATE POLICY "Público pode inserir enrollments"
  ON public.enrollments
  FOR INSERT
  WITH CHECK (true);

-- Atualização: admins OU registros recentes (2 horas)
CREATE POLICY "Admins podem atualizar enrollments"
  ON public.enrollments
  FOR UPDATE
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

CREATE POLICY "Público pode atualizar enrollments recentes"
  ON public.enrollments
  FOR UPDATE
  USING ((NOW() - created_at) <= INTERVAL '2 hours')
  WITH CHECK ((NOW() - created_at) <= INTERVAL '2 hours');

-- Delete físico: apenas super admins (opcional, usamos soft delete)
CREATE POLICY "Super admins podem deletar enrollments"
  ON public.enrollments
  FOR DELETE
  USING (public.is_super_admin());

-- Grants mínimos
GRANT INSERT, UPDATE ON public.enrollments TO anon;
GRANT SELECT ON public.enrollments TO authenticated;
GRANT ALL ON public.enrollments TO service_role;

-- =========================================
-- POLÍTICAS: enrollment_discounts
-- =========================================

-- Leitura: apenas admins
CREATE POLICY "Admins podem ler enrollment_discounts"
  ON public.enrollment_discounts
  FOR SELECT
  USING (public.is_admin_user());

-- Inserção: pública vinculada a matrícula criada recentemente
CREATE POLICY "Público pode inserir enrollment_discounts de matrículas recentes"
  ON public.enrollment_discounts
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM public.enrollments e
      WHERE e.id = enrollment_id
        AND (NOW() - e.created_at) <= INTERVAL '2 hours'
    )
  );

-- Atualização/remoção: apenas admins
CREATE POLICY "Admins podem atualizar enrollment_discounts"
  ON public.enrollment_discounts
  FOR UPDATE
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

CREATE POLICY "Admins podem deletar enrollment_discounts"
  ON public.enrollment_discounts
  FOR DELETE
  USING (public.is_admin_user());

-- Grants mínimos
GRANT INSERT ON public.enrollment_discounts TO anon;
GRANT SELECT ON public.enrollment_discounts TO authenticated;
GRANT ALL ON public.enrollment_discounts TO service_role;

-- =========================================
-- POLÍTICAS: enrollment_documents
-- =========================================

-- Leitura: apenas admins
CREATE POLICY "Admins podem ler enrollment_documents"
  ON public.enrollment_documents
  FOR SELECT
  USING (public.is_admin_user());

-- Inserção: pública vinculada a matrícula criada recentemente
CREATE POLICY "Público pode inserir enrollment_documents de matrículas recentes"
  ON public.enrollment_documents
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM public.enrollments e
      WHERE e.id = enrollment_id
        AND (NOW() - e.created_at) <= INTERVAL '2 hours'
    )
  );

-- Atualização/remoção: apenas admins
CREATE POLICY "Admins podem atualizar enrollment_documents"
  ON public.enrollment_documents
  FOR UPDATE
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

CREATE POLICY "Admins podem deletar enrollment_documents"
  ON public.enrollment_documents
  FOR DELETE
  USING (public.is_admin_user());

-- Grants mínimos
GRANT INSERT ON public.enrollment_documents TO anon;
GRANT SELECT ON public.enrollment_documents TO authenticated;
GRANT ALL ON public.enrollment_documents TO service_role;

-- ============================
-- OBS: Regras simplificadas para o MVP
--  - Ajustar políticas para vincular registros ao usuário/sessão quando
--    autenticação do fluxo público estiver disponível.
--  - Em produção, considerar restringir UPDATE público apenas aos campos
--    de PDF, usando views ou funções seguras.
-- ============================

-- ============================
-- ROLLBACK (DEV):
-- -- Descomentar para desfazer em ambiente de desenvolvimento
-- -- ATENÇÃO: Isto apagará os dados das tabelas!
-- -- DROP TABLE IF EXISTS public.enrollment_documents;
-- -- DROP TABLE IF EXISTS public.enrollment_discounts;
-- -- DROP TABLE IF EXISTS public.enrollments;
-- ============================

-- Fim da migração 014

