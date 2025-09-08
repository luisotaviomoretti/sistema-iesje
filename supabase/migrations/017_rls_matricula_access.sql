-- =====================================================
-- MIGRATION: 017_rls_matricula_access.sql
-- DESCRIÇÃO: Políticas RLS para matrícula (fase 2)
-- DATA: 2025-09-06
-- =====================================================

-- Habilitar RLS na tabela de usuários de matrícula
ALTER TABLE public.matricula_users ENABLE ROW LEVEL SECURITY;

-- Limpeza de políticas antigas (idempotente)
DROP POLICY IF EXISTS matricula_users_admin_manage ON public.matricula_users;
DROP POLICY IF EXISTS matricula_users_select_self ON public.matricula_users;

-- Admins podem gerenciar completamente matricula_users
CREATE POLICY matricula_users_admin_manage
  ON public.matricula_users
  FOR ALL
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

-- Usuário de matrícula pode visualizar apenas seu próprio registro
CREATE POLICY matricula_users_select_self
  ON public.matricula_users
  FOR SELECT
  USING (auth.uid() = auth_user_id);

-- Grants básicos
GRANT SELECT ON public.matricula_users TO authenticated;
GRANT ALL ON public.matricula_users TO service_role;

-- =====================================================
-- RLS por escola para tabelas de matrículas
-- Observação: public.enrollments usa student_escola = 'pelicano'|'sete_setembro'
-- enquanto matricula_users.escola usa 'Pelicano'|'Sete de Setembro'.
-- O mapeamento abaixo trata essa diferença de valores.
-- =====================================================

-- Habilitar RLS já feito na migração 014 para as tabelas abaixo.
-- Aqui adicionamos políticas adicionais para usuários de matrícula.

-- Remover políticas antigas específicas (se existirem) para evitar conflitos de nome
DROP POLICY IF EXISTS "Matricula users read enrollments by school" ON public.enrollments;
DROP POLICY IF EXISTS "Matricula users read enrollment_discounts by school" ON public.enrollment_discounts;
DROP POLICY IF EXISTS "Matricula users read enrollment_documents by school" ON public.enrollment_documents;

-- SELECT em enrollments por escola do usuário de matrícula
CREATE POLICY "Matricula users read enrollments by school"
  ON public.enrollments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.matricula_users mu
      WHERE mu.auth_user_id = auth.uid()
        AND mu.ativo = TRUE
        AND (
          (mu.escola = 'Pelicano' AND public.enrollments.student_escola = 'pelicano')
          OR (mu.escola = 'Sete de Setembro' AND public.enrollments.student_escola = 'sete_setembro')
        )
    )
  );

-- SELECT em enrollment_discounts vinculado a enrollments acessíveis
CREATE POLICY "Matricula users read enrollment_discounts by school"
  ON public.enrollment_discounts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.enrollments e
      JOIN public.matricula_users mu ON mu.auth_user_id = auth.uid() AND mu.ativo = TRUE
      WHERE e.id = public.enrollment_discounts.enrollment_id
        AND (
          (mu.escola = 'Pelicano' AND e.student_escola = 'pelicano')
          OR (mu.escola = 'Sete de Setembro' AND e.student_escola = 'sete_setembro')
        )
    )
  );

-- SELECT em enrollment_documents vinculado a enrollments acessíveis
CREATE POLICY "Matricula users read enrollment_documents by school"
  ON public.enrollment_documents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.enrollments e
      JOIN public.matricula_users mu ON mu.auth_user_id = auth.uid() AND mu.ativo = TRUE
      WHERE e.id = public.enrollment_documents.enrollment_id
        AND (
          (mu.escola = 'Pelicano' AND e.student_escola = 'pelicano')
          OR (mu.escola = 'Sete de Setembro' AND e.student_escola = 'sete_setembro')
        )
    )
  );

-- Notas:
-- - As políticas de INSERT/UPDATE/DELETE existentes permanecem válidas (ver migração 014).
-- - Admins continuam com acesso pelas políticas já existentes (is_admin_user()).
-- - Usuário inativo (mu.ativo = FALSE) não passa nas políticas acima.
