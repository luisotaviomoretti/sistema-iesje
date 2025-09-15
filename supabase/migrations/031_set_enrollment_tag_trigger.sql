-- =====================================================
-- MIGRATION: 031_set_enrollment_tag_trigger.sql
-- DESCRIÇÃO: Classifica tag_matricula no servidor via trigger BEFORE INSERT
--            cruzando student_cpf_digits com previous_year_students.
-- PILARES:   Segurança, idempotência, não-disrupção.
-- DATA:      2025-09-12
-- =====================================================

-- Função de gatilho: define NEW.tag_matricula com base no CPF do aluno
-- - SECURITY DEFINER para contornar RLS de leitura se necessário (owner deve ter SELECT em previous_year_students)
-- - search_path controlado para evitar resolução insegura
CREATE OR REPLACE FUNCTION public.set_enrollment_tag_from_previous_year()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_cpf_digits text;
  v_match boolean;
BEGIN
  -- Computa os dígitos do CPF de forma robusta (antes de colunas geradas serem preenchidas)
  v_cpf_digits := NULLIF(regexp_replace(COALESCE(NEW.student_cpf, ''), '\\D', '', 'g'), '');
  IF v_cpf_digits IS NULL THEN
    -- Fallback (se a coluna gerada já estiver disponível no momento do BEFORE, usa-se ela)
    v_cpf_digits := NULLIF(NEW.student_cpf_digits, '');
  END IF;

  -- Derivação da tag com base no match por CPF no ano anterior
  IF v_cpf_digits IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.previous_year_students pys
      WHERE pys.student_cpf_digits = v_cpf_digits
    ) INTO v_match;

    IF v_match THEN
      NEW.tag_matricula := 'rematricula';
    ELSE
      NEW.tag_matricula := 'novo_aluno';
    END IF;
  ELSE
    -- Sem CPF válido: classifica como novo_aluno por segurança (evita NULL)
    NEW.tag_matricula := 'novo_aluno';
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger BEFORE INSERT em public.enrollments
DROP TRIGGER IF EXISTS trg_enrollments_set_tag ON public.enrollments;
CREATE TRIGGER trg_enrollments_set_tag
BEFORE INSERT ON public.enrollments
FOR EACH ROW
EXECUTE FUNCTION public.set_enrollment_tag_from_previous_year();

-- Observações:
-- - Mantemos a assinatura e comportamento da RPC public.enroll_finalize inalterados.
-- - Qualquer INSERT (RPC ou direto) passa a receber tag_matricula correta.
-- - Rollback simples: DROP TRIGGER trg_enrollments_set_tag.
-- - A imutabilidade de tag_matricula (BEFORE UPDATE) será avaliada após estabilização em PROD.
