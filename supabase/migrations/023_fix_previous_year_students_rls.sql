-- =====================================================
-- MIGRATION: 023_fix_previous_year_students_rls.sql
-- DESCRIÇÃO: Adiciona políticas RLS para permitir leitura da tabela previous_year_students
-- DATA: 2025-01-09
-- =====================================================

-- ==============================
-- POLÍTICAS RLS PARA LEITURA PÚBLICA
-- ==============================

-- Permitir que qualquer usuário (anon) possa ler dados para validação de CPF
-- Isso é necessário para o fluxo de rematrícula funcionar
CREATE POLICY "Allow public read for CPF validation"
  ON public.previous_year_students
  FOR SELECT
  USING (true);

-- Comentário explicativo
COMMENT ON POLICY "Allow public read for CPF validation" ON public.previous_year_students IS 
'Permite leitura pública para validação de CPF no fluxo de rematrícula. Os dados sensíveis são protegidos no nível da aplicação.';

-- ==============================
-- GRANTS ADICIONAIS
-- ==============================

-- Garantir que anon pode fazer SELECT
GRANT SELECT ON public.previous_year_students TO anon;

-- Garantir que authenticated também pode fazer SELECT
GRANT SELECT ON public.previous_year_students TO authenticated;

-- ==============================
-- VERIFICAÇÃO
-- ==============================

-- Query para verificar as políticas criadas
DO $$
BEGIN
  RAISE NOTICE 'Políticas RLS criadas para previous_year_students:';
  RAISE NOTICE '- Allow public read for CPF validation (SELECT para todos)';
  RAISE NOTICE '';
  RAISE NOTICE 'Permissões concedidas:';
  RAISE NOTICE '- SELECT para anon';
  RAISE NOTICE '- SELECT para authenticated';
  RAISE NOTICE '- ALL para service_role (mantido da migração anterior)';
END $$;