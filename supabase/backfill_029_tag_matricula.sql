-- =====================================================
-- BACKFILL 029: tag_matricula em public.enrollments
-- Objetivo: Preencher tag_matricula para registros antigos de forma segura e idempotente.
-- Estratégia faseada e conservadora:
--   1) Marcar como 'rematricula' onde houver correspondência em previous_year_students por CPF (coluna gerada student_cpf_digits)
--   2) (Opcional) Marcar como 'novo_aluno' os demais ainda NULL — DESLIGADO por padrão para evitar classificações indevidas
-- Reexecução: idempotente; não altera registros já preenchidos.
-- =====================================================

BEGIN;

-- Diagnóstico inicial
DO $$
DECLARE
  v_total int;
  v_nulls int;
BEGIN
  SELECT COUNT(*) INTO v_total FROM public.enrollments;
  SELECT COUNT(*) INTO v_nulls FROM public.enrollments WHERE tag_matricula IS NULL;
  RAISE NOTICE '[Backfill 029] Total enrollments: %', v_total;
  RAISE NOTICE '[Backfill 029] tag_matricula NULL: %', v_nulls;
END$$;

-- Passo 1: Preencher como 'rematricula' quando há match por CPF no ano anterior
WITH candidates AS (
  SELECT e.id
  FROM public.enrollments e
  WHERE e.tag_matricula IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.previous_year_students pys
      WHERE pys.student_cpf_digits IS NOT NULL
        AND pys.student_cpf_digits = e.student_cpf_digits
    )
)
UPDATE public.enrollments e
SET tag_matricula = 'rematricula'
FROM candidates c
WHERE e.id = c.id;

-- Relatório após Passo 1
DO $$
DECLARE
  v_rematriculas int;
  v_remaining_nulls int;
BEGIN
  SELECT COUNT(*) INTO v_rematriculas FROM public.enrollments WHERE tag_matricula = 'rematricula';
  SELECT COUNT(*) INTO v_remaining_nulls FROM public.enrollments WHERE tag_matricula IS NULL;
  RAISE NOTICE '[Backfill 029] Marcadas como rematricula: %', v_rematriculas;
  RAISE NOTICE '[Backfill 029] Restantes NULL após passo 1: %', v_remaining_nulls;
END$$;

-- Passo 2 (OPCIONAL - DESATIVADO): Classificar automaticamente o restante como 'novo_aluno'
-- Para ativar este passo, remova os comentários do bloco abaixo
-- UPDATE public.enrollments e
-- SET tag_matricula = 'novo_aluno'
-- WHERE e.tag_matricula IS NULL
--   AND NOT EXISTS (
--     SELECT 1
--     FROM public.previous_year_students pys
--     WHERE pys.student_cpf_digits IS NOT NULL
--       AND pys.student_cpf_digits = e.student_cpf_digits
--   );

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
  RAISE NOTICE '[Backfill 029] Totais => novo_aluno: %, rematricula: %, NULL: %', v_new, v_re, v_null;
END$$;

COMMIT;

-- Dicas de execução:
-- - Execute em ambiente de desenvolvimento/staging primeiro
-- - Verifique amostras antes/depois:
--   SELECT id, student_name, student_cpf, student_cpf_digits, tag_matricula, created_at
--   FROM public.enrollments
--   ORDER BY created_at DESC
--   LIMIT 50;

