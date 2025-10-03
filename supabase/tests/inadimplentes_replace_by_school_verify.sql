-- =====================================================
-- TEST: inadimplentes_replace_by_school_verify.sql
-- OBJETIVO: Verificar operação segura da RPC replace_inadimplentes_by_school
-- ESTRATÉGIA: Executa dentro de transação; cria dataset sintético; ROLLBACK
-- DATA: 2025-10-02
-- =====================================================

BEGIN;

-- Pré-condição: função e tabelas existentes
DO $$ BEGIN
  PERFORM 1 FROM pg_proc WHERE proname = 'replace_inadimplentes_by_school';
  IF NOT FOUND THEN RAISE EXCEPTION 'replace_inadimplentes_by_school ausente'; END IF;
END $$;

-- Capturar baseline
SELECT 'baseline' AS step,
       coalesce(student_escola,'') AS school,
       count(*) FILTER (WHERE is_active) AS active_count
FROM public.inadimplentes
GROUP BY coalesce(student_escola,'')
ORDER BY school;

-- Criar payload para escola de teste
WITH payload AS (
  SELECT jsonb_build_array(
    jsonb_build_object('codigo_inadim','1°AEM','student_name','Aluno A','guardian1_name','Resp A','student_escola','pelicano','meses_inadim',2),
    jsonb_build_object('codigo_inadim','2°AEF','student_name','Aluno B','guardian1_name',NULL,'student_escola','pelicano','meses_inadim',1)
  ) AS rows
)
SELECT 'replace-call' AS step, (res).deactivated_count, (res).inserted_count
FROM (
  SELECT (public.replace_inadimplentes_by_school('pelicano', rows)).* AS res FROM payload
) t;

-- Pós-chamada: conferir ativos por escola
SELECT 'post' AS step,
       coalesce(student_escola,'') AS school,
       count(*) FILTER (WHERE is_active) AS active_count
FROM public.inadimplentes
GROUP BY coalesce(student_escola,'')
ORDER BY school;

ROLLBACK;

-- Fim do teste
