-- =====================================================
-- MIGRATION: 022_add_cpf_digits_columns.sql
-- DESCRIÇÃO: Adiciona colunas geradas com CPF apenas dígitos
--            e índices para consultas robustas por CPF.
-- DATA: 2025-01-XX
-- =====================================================

-- ENROLLMENTS: coluna gerada e índice
ALTER TABLE public.enrollments
  ADD COLUMN IF NOT EXISTS student_cpf_digits TEXT GENERATED ALWAYS AS (
    regexp_replace(student_cpf, '\\D', '', 'g')
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_enrollments_cpf_digits
  ON public.enrollments (student_cpf_digits);

-- PREVIOUS YEAR STUDENTS: coluna gerada e índice
ALTER TABLE public.previous_year_students
  ADD COLUMN IF NOT EXISTS student_cpf_digits TEXT GENERATED ALWAYS AS (
    regexp_replace(student_cpf, '\\D', '', 'g')
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_pys_cpf_digits
  ON public.previous_year_students (student_cpf_digits);

-- Fim da migração 022

