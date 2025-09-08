-- =====================================================
-- MIGRATION: 021_align_previous_year_students_with_enrollments.sql
-- DESCRIÇÃO: Alinhar schema de previous_year_students ao de enrollments
--            para facilitar mapeamento 1:1 na rematrícula.
-- DATA: 2025-01-XX
-- =====================================================

-- Garantir extensão
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ==============================
-- ALTER TABLE: adicionar campos
-- ==============================
ALTER TABLE public.previous_year_students
  ADD COLUMN IF NOT EXISTS total_discount_value NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS material_cost NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pdf_url TEXT,
  ADD COLUMN IF NOT EXISTS pdf_generated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'deleted')),
  ADD COLUMN IF NOT EXISTS approval_level TEXT CHECK (approval_level IN ('automatic', 'coordinator', 'director')),
  ADD COLUMN IF NOT EXISTS approval_status TEXT CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

COMMENT ON COLUMN public.previous_year_students.total_discount_value IS 'Valor total de desconto do ano anterior';
COMMENT ON COLUMN public.previous_year_students.material_cost IS 'Custo de material do ano anterior';
COMMENT ON COLUMN public.previous_year_students.status IS 'Status final da matrícula do ano anterior (enum compatível)';
COMMENT ON COLUMN public.previous_year_students.approval_level IS 'Nível de aprovação do ano anterior (enum compatível)';
COMMENT ON COLUMN public.previous_year_students.approval_status IS 'Status de aprovação do ano anterior (enum compatível)';

-- =====================================================
-- VIEW: mapeamento para shape de enrollments (somente leitura)
--       Facilita INSERT INTO enrollments (...) SELECT ... FROM view
-- =====================================================
DROP VIEW IF EXISTS public.v_previous_year_students_enrollment_shape;
CREATE VIEW public.v_previous_year_students_enrollment_shape AS
SELECT
  pys.student_name,
  pys.student_cpf,
  pys.student_rg,
  pys.student_birth_date,
  pys.student_gender,
  pys.student_escola,
  pys.series_id,
  pys.series_name,
  pys.track_id,
  pys.track_name,
  pys.shift,
  pys.guardian1_name,
  pys.guardian1_cpf,
  pys.guardian1_phone,
  pys.guardian1_email,
  pys.guardian1_relationship,
  pys.guardian2_name,
  pys.guardian2_cpf,
  pys.guardian2_phone,
  pys.guardian2_email,
  pys.guardian2_relationship,
  pys.address_cep,
  pys.address_street,
  pys.address_number,
  pys.address_complement,
  pys.address_district,
  pys.address_city,
  pys.address_state,
  pys.base_value,
  pys.total_discount_percentage,
  COALESCE(pys.total_discount_value, 0) AS total_discount_value,
  pys.final_monthly_value,
  COALESCE(pys.material_cost, 0) AS material_cost,
  pys.pdf_url,
  pys.pdf_generated_at,
  pys.status,
  pys.approval_level,
  pys.approval_status,
  pys.created_at,
  pys.updated_at,
  pys.deleted_at
FROM public.previous_year_students pys;

COMMENT ON VIEW public.v_previous_year_students_enrollment_shape IS 'Projeção de previous_year_students com colunas compatíveis a enrollments para facilitar INSERT.';

-- RLS: view herda políticas da tabela base; sem exposição pública adicional

-- ============================
-- ROLLBACK (DEV):
-- -- Descomentar para desfazer em ambiente de desenvolvimento
-- -- ATENÇÃO: Avalie impactos antes de remover colunas em produção
-- -- DROP VIEW IF EXISTS public.v_previous_year_students_enrollment_shape;
-- -- ALTER TABLE public.previous_year_students
-- --   DROP COLUMN IF EXISTS total_discount_value,
-- --   DROP COLUMN IF EXISTS material_cost,
-- --   DROP COLUMN IF EXISTS pdf_url,
-- --   DROP COLUMN IF EXISTS pdf_generated_at,
-- --   DROP COLUMN IF EXISTS status,
-- --   DROP COLUMN IF EXISTS approval_level,
-- --   DROP COLUMN IF EXISTS approval_status,
-- --   DROP COLUMN IF EXISTS deleted_at;
-- ============================

-- Fim da migração 021

