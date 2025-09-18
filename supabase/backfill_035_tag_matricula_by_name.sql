-- =====================================================
-- BACKFILL 035: tag_matricula por NOME (seguro e idempotente)
-- Objetivo: Preencher tag_matricula = 'rematricula' para registros
--           antigos de enrollments quando houver match por nome
--           normalizado (+ birth_date, se configurado) com a base
--           previous_year_students do ano anterior ao created_at.
-- Estratégia conservadora:
--   - SOMENTE marca 'rematricula' quando há match inequívoco
--   - NÃO marca automaticamente 'novo_aluno' (permanece NULL)
--   - Idempotente: não altera registros já preenchidos
-- Dependências:
--   - Função public.norm_text(text)
--   - Chave opcional: rematricula.tag_matricula.name_match.require_birth_date
-- =====================================================

BEGIN;

DO $$
DECLARE
  v_total int;
  v_nulls int;
BEGIN
  SELECT COUNT(*) INTO v_total FROM public.enrollments;
  SELECT COUNT(*) INTO v_nulls FROM public.enrollments WHERE tag_matricula IS NULL;
  RAISE NOTICE '[Backfill 035] Total enrollments: %', v_total;
  RAISE NOTICE '[Backfill 035] tag_matricula NULL: %', v_nulls;
END$$;

-- Ler configuração de exigência de birth_date (padrão: true)
DO $$
DECLARE
  v_req_birth_cfg text;
  v_require_birth boolean := true;
  v_updated int;
BEGIN
  v_req_birth_cfg := NULL;
  BEGIN
    SELECT public.get_system_config('rematricula.tag_matricula.name_match.require_birth_date') INTO v_req_birth_cfg;
  EXCEPTION WHEN OTHERS THEN
    v_req_birth_cfg := NULL;
  END;
  IF COALESCE(lower(trim(v_req_birth_cfg)),'true') IN ('false','0','no','off') THEN
    v_require_birth := false;
  END IF;

  IF v_require_birth THEN
    WITH candidates AS (
      SELECT e.id
      FROM public.enrollments e
      WHERE e.tag_matricula IS NULL
        AND e.student_name IS NOT NULL AND length(trim(e.student_name)) > 0
        AND e.student_birth_date IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.previous_year_students pys
          WHERE norm_text(pys.student_name) = norm_text(e.student_name)
            AND pys.student_birth_date = e.student_birth_date
            AND pys.academic_year = (date_part('year', e.created_at)::int - 1)::text
        )
    )
    UPDATE public.enrollments e
    SET tag_matricula = 'rematricula'
    FROM candidates c
    WHERE e.id = c.id;
  ELSE
    WITH candidates AS (
      SELECT e.id
      FROM public.enrollments e
      WHERE e.tag_matricula IS NULL
        AND e.student_name IS NOT NULL AND length(trim(e.student_name)) > 0
        AND EXISTS (
          SELECT 1
          FROM public.previous_year_students pys
          WHERE norm_text(pys.student_name) = norm_text(e.student_name)
            AND pys.academic_year = (date_part('year', e.created_at)::int - 1)::text
        )
    )
    UPDATE public.enrollments e
    SET tag_matricula = 'rematricula'
    FROM candidates c
    WHERE e.id = c.id;
  END IF;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RAISE NOTICE '[Backfill 035] Registros atualizados para rematricula: %', v_updated;
END$$;

-- Resumo final
DO $$
DECLARE
  v_new int;
  v_re int;
  v_null int;
BEGIN
  SELECT COUNT(*) INTO v_new FROM public.enrollments WHERE tag_matricula = 'novo_aluno';
  SELECT COUNT(*) INTO v_re  FROM public.enrollments WHERE tag_matricula = 'rematricula';
  SELECT COUNT(*) INTO v_null FROM public.enrollments WHERE tag_matricula IS NULL;
  RAISE NOTICE '[Backfill 035] Totais => novo_aluno: %, rematricula: %, NULL: %', v_new, v_re, v_null;
END$$;

COMMIT;

-- Dicas de execução:
-- - Executar primeiro em DEV/STG e validar amostras
-- - Verificar se a base previous_year_students está correta e com academic_year coerente
-- - Ajustar a flag rematricula.tag_matricula.name_match.require_birth_date conforme a necessidade
