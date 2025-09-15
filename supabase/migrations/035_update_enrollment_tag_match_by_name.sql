-- =====================================================
-- MIGRATION: 035_update_enrollment_tag_match_by_name.sql
-- DESCRIÇÃO: Atualiza a função do gatilho de classificação de tag_matricula
--            para suportar estratégia por NOME (com data de nascimento) via
--            feature flag em system_config, com fallback por CPF.
--            Mantém a mesma assinatura/nome do trigger e função.
--            Segurança, idempotência, e não-disrupção.
-- DATA: 2025-09-15
-- =====================================================

-- Extensões úteis (idempotentes)
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Helper de normalização (redefine de forma idempotente)
-- Mantém a mesma assinatura usada na migração 033
CREATE OR REPLACE FUNCTION public.norm_text(p_text text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = extensions, public
AS $$
  SELECT unaccent(lower(coalesce(p_text, '')));
$$;

-- Índice auxiliar (opcional) para igualdade por nome normalizado
-- Útil para o EXISTS por nome; mantém TRGM para buscas parciais
CREATE INDEX IF NOT EXISTS idx_pys_student_name_norm
  ON public.previous_year_students (norm_text(student_name));

-- =====================================================
-- Função de gatilho: atualização para suportar estratégia por nome
-- Estratégias suportadas (via get_system_config('rematricula.tag_matricula.strategy')):
--   - 'name'  => match por nome normalizado + data de nascimento no ano anterior
--   - 'cpf'   => match por student_cpf_digits (comportamento anterior)
-- Qualquer outro valor ou NULL => 'cpf' (fallback seguro)
-- Chave opcional: 'rematricula.tag_matricula.name_match.require_birth_date' ('true'|'false'), padrão 'true'
-- =====================================================
CREATE OR REPLACE FUNCTION public.set_enrollment_tag_from_previous_year()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = extensions, public, pg_temp
AS $$
DECLARE
  v_strategy text;
  v_require_birth_date boolean := true;
  v_match boolean := false;
  v_cpf_digits text;
  v_prev_year text;
  v_req_birth_cfg text;
BEGIN
  -- Determinar estratégia a partir de system_config (fallback para 'cpf')
  BEGIN
    SELECT public.get_system_config('rematricula.tag_matricula.strategy') INTO v_strategy;
  EXCEPTION WHEN OTHERS THEN
    v_strategy := NULL;
  END;
  IF v_strategy IS NULL OR lower(trim(v_strategy)) NOT IN ('name','cpf') THEN
    v_strategy := 'cpf';
  ELSE
    v_strategy := lower(trim(v_strategy));
  END IF;

  -- Configuração opcional: exigir data de nascimento no match por nome (padrão: true)
  v_req_birth_cfg := NULL;
  BEGIN
    SELECT public.get_system_config('rematricula.tag_matricula.name_match.require_birth_date') INTO v_req_birth_cfg;
  EXCEPTION WHEN OTHERS THEN
    v_req_birth_cfg := NULL;
  END;
  IF COALESCE(lower(trim(v_req_birth_cfg)),'true') IN ('false','0','no','off') THEN
    v_require_birth_date := false;
  END IF;

  -- Ano anterior (previous_year_students.academic_year é TEXT)
  v_prev_year := (extract(year from now())::int - 1)::text;

  IF v_strategy = 'name' THEN
    -- Match por nome normalizado (e, por padrão, data de nascimento) no ano anterior
    IF NEW.student_name IS NOT NULL AND length(trim(NEW.student_name)) > 0 THEN
      IF v_require_birth_date AND NEW.student_birth_date IS NULL THEN
        -- Sem data para validar: considerar sem match por segurança (evita falso positivo)
        v_match := false;
      ELSE
        IF v_require_birth_date THEN
          SELECT EXISTS (
            SELECT 1
            FROM public.previous_year_students pys
            WHERE norm_text(pys.student_name) = norm_text(NEW.student_name)
              AND pys.student_birth_date = NEW.student_birth_date
              AND pys.academic_year = v_prev_year
          ) INTO v_match;
        ELSE
          SELECT EXISTS (
            SELECT 1
            FROM public.previous_year_students pys
            WHERE norm_text(pys.student_name) = norm_text(NEW.student_name)
              AND pys.academic_year = v_prev_year
          ) INTO v_match;
        END IF;
      END IF;
    END IF;

    IF v_match THEN
      NEW.tag_matricula := 'rematricula';
      RETURN NEW;
    END IF;
    -- Se estratégia por nome não encontrou match, cai para fallback por CPF abaixo
  END IF;

  -- Fallback/estratégia CPF (comportamento original)
  v_cpf_digits := NULLIF(regexp_replace(COALESCE(NEW.student_cpf, ''), '\\D', '', 'g'), '');
  IF v_cpf_digits IS NULL THEN
    v_cpf_digits := NULLIF(NEW.student_cpf_digits, '');
  END IF;

  IF v_cpf_digits IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.previous_year_students pys
      WHERE pys.student_cpf_digits = v_cpf_digits
        AND pys.academic_year = v_prev_year
    ) INTO v_match;

    IF v_match THEN
      NEW.tag_matricula := 'rematricula';
    ELSE
      NEW.tag_matricula := 'novo_aluno';
    END IF;
  ELSE
    -- Sem CPF válido e sem match por nome: classifica como novo_aluno por segurança (evita NULL)
    NEW.tag_matricula := 'novo_aluno';
  END IF;

  RETURN NEW;
END;
$$;

-- Recriar o trigger para garantir que a função atualizada está vinculada
DROP TRIGGER IF EXISTS trg_enrollments_set_tag ON public.enrollments;
CREATE TRIGGER trg_enrollments_set_tag
BEFORE INSERT ON public.enrollments
FOR EACH ROW
EXECUTE FUNCTION public.set_enrollment_tag_from_previous_year();

-- Observações:
-- - Mantém assinatura/nomes; nenhuma mudança na RPC é necessária.
-- - Rollback: setar strategy='cpf' em system_config ou restaurar função da migração 031.
-- - Estratégia por nome é mais robusta com birth_date; pode-se relaxar via system_config.
