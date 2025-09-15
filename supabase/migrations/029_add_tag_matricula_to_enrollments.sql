-- =====================================================
-- MIGRATION: 029_add_tag_matricula_to_enrollments.sql
-- DESCRIÇÃO: Adiciona a coluna tag_matricula (enum: novo_aluno | rematricula)
--            na tabela public.enrollments, com índice opcional.
--            Mudança aditiva, segura e idempotente.
-- DATA: 2025-09-10
-- =====================================================

-- 1) Tipo ENUM para garantir integridade dos valores
DO $$
BEGIN
  CREATE TYPE public.tag_matricula_enum AS ENUM ('novo_aluno', 'rematricula');
EXCEPTION
  WHEN duplicate_object THEN
    NULL; -- tipo já existe; seguir em frente
END $$;

-- 2) Coluna nova em enrollments (sem NOT NULL e sem DEFAULT nesta fase)
ALTER TABLE public.enrollments
  ADD COLUMN IF NOT EXISTS tag_matricula public.tag_matricula_enum;

-- 3) Índice para facilitar relatórios/BI (opcional, mas útil)
CREATE INDEX IF NOT EXISTS idx_enrollments_tag_matricula
  ON public.enrollments(tag_matricula);

-- 4) Comentário explicativo
COMMENT ON COLUMN public.enrollments.tag_matricula IS 'Origem do fluxo de matrícula: novo_aluno | rematricula';

-- Notas:
-- - Não altera RLS/policies existentes; INSERT público continua válido.
-- - Campo será preenchido pela aplicação nos fluxos de aluno novo/rematrícula.
-- - Após estabilização e backfill, considerar SET NOT NULL em migração futura.

