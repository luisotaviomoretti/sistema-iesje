-- PRECHECKS — Rematrícula cross-school e modal da Home (Somente Leitura)
-- Ambiente: executar no SQL Editor do Supabase (DEV/STG/PROD conforme fase)
-- Objetivo: validar schema, índices, RLS e métricas de baseline sem modificar nada

-- 0) Metadados do ambiente
SELECT version() AS pg_version,
       current_database() AS db,
       current_user AS user_identity,
       current_schema() AS schema;

-- 1) Existência de tabelas principais
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('enrollments','previous_year_students','schools')
ORDER BY table_name;

-- 2) Colunas esperadas (listar todas as colunas para inspeção manual)
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('enrollments','previous_year_students')
ORDER BY table_name, ordinal_position;

-- 2.1) Verificação específica de colunas críticas
-- student_cpf_digits deve existir em ambas ou pelo menos em previous_year_students
SELECT table_name, COUNT(*) AS has_cpf_digits
FROM information_schema.columns
WHERE table_schema='public'
  AND table_name IN ('enrollments','previous_year_students')
  AND column_name='student_cpf_digits'
GROUP BY table_name;

-- tag_matricula e created_at em enrollments (úteis para métricas)
SELECT column_name
FROM information_schema.columns
WHERE table_schema='public'
  AND table_name='enrollments'
  AND column_name IN ('tag_matricula','created_at','school_id','created_by_user_type')
ORDER BY column_name;

-- 2.2) Procurar coluna(s) relacionadas à escola em previous_year_students
SELECT column_name
FROM information_schema.columns
WHERE table_schema='public'
  AND table_name='previous_year_students'
  AND (column_name ILIKE '%school%' OR column_name ILIKE '%escola%')
ORDER BY column_name;

-- 3) Índices relevantes (especialmente por student_cpf_digits)
SELECT tablename AS table_name, indexname, indexdef
FROM pg_indexes
WHERE schemaname='public'
  AND tablename IN ('enrollments','previous_year_students')
ORDER BY tablename, indexname;

-- 3.1) Plano de execução para busca por CPF no PYS (substitua o valor pelo formato usado)
EXPLAIN (ANALYZE, BUFFERS)
SELECT 1
FROM public.previous_year_students pys
WHERE pys.student_cpf_digits = '00000000000'
LIMIT 1;

-- 4) RLS habilitado e políticas
SELECT n.nspname AS schema,
       c.relname AS table,
       c.relrowsecurity AS rls_enabled,
       c.relforcerowsecurity AS rls_force,
       pg_catalog.obj_description(c.oid) AS table_description
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname='public'
  AND c.relkind='r'
  AND c.relname IN ('enrollments','previous_year_students')
ORDER BY c.relname;

SELECT schemaname, tablename, policyname, cmd, permissive,
       COALESCE(qual::text,'') AS using_qual,
       COALESCE(with_check::text,'') AS with_check
FROM pg_policies
WHERE schemaname='public'
  AND tablename IN ('enrollments','previous_year_students')
ORDER BY tablename, policyname;

-- 4.1) Grants de tabela (visão geral)
SELECT table_name, grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema='public'
  AND table_name IN ('enrollments','previous_year_students')
ORDER BY table_name, grantee, privilege_type;

-- 5) Qualidade de dados
-- 5.1) Duplicidades de CPF no PYS
SELECT student_cpf_digits, COUNT(*) AS qty
FROM public.previous_year_students
GROUP BY student_cpf_digits
HAVING COUNT(*) > 1
ORDER BY qty DESC
LIMIT 10;

-- 5.2) Nulos em CPF
SELECT 'previous_year_students' AS table,
       COUNT(*) FILTER (WHERE student_cpf_digits IS NULL) AS cpf_nulls,
       COUNT(*) AS total,
       ROUND(100.0 * COUNT(*) FILTER (WHERE student_cpf_digits IS NULL) / NULLIF(COUNT(*),0), 2) AS pct_nulls
FROM public.previous_year_students
UNION ALL
SELECT 'enrollments' AS table,
       COUNT(*) FILTER (WHERE student_cpf_digits IS NULL) AS cpf_nulls,
       COUNT(*) AS total,
       ROUND(100.0 * COUNT(*) FILTER (WHERE student_cpf_digits IS NULL) / NULLIF(COUNT(*),0), 2) AS pct_nulls
FROM public.enrollments;

-- 6) Baseline métrica (últimos 30 dias)
-- 6.1) Distribuição por tag_matricula
SELECT COALESCE(tag_matricula::text,'(null)') AS tag,
       COUNT(*)
FROM public.enrollments
WHERE created_at >= now() - interval '30 days'
GROUP BY 1
ORDER BY 2 DESC;

-- 6.2) Match de CPF com PYS (proxy para rematrícula vs novo)
SELECT COUNT(*) FILTER (WHERE pys.student_cpf_digits IS NOT NULL) AS pys_match,
       COUNT(*) FILTER (WHERE pys.student_cpf_digits IS NULL) AS pys_no_match,
       COUNT(*) AS total
FROM public.enrollments e
LEFT JOIN public.previous_year_students pys
  ON pys.student_cpf_digits = e.student_cpf_digits
WHERE e.created_at >= now() - interval '30 days';

-- 6.3) Por dia (proxy match/no match)
SELECT date_trunc('day', e.created_at) AS dia,
       COUNT(*) FILTER (WHERE pys.student_cpf_digits IS NOT NULL) AS pys_match,
       COUNT(*) FILTER (WHERE pys.student_cpf_digits IS NULL) AS pys_no_match,
       COUNT(*) AS total
FROM public.enrollments e
LEFT JOIN public.previous_year_students pys
  ON pys.student_cpf_digits = e.student_cpf_digits
WHERE e.created_at >= now() - interval '14 days'
GROUP BY 1
ORDER BY 1 DESC;

-- 7) Inspeção de escola de origem
-- Observação: rode primeiro a consulta 2.2 para descobrir a coluna real da escola (ex.: school_id, school_code, school_name)
-- Depois, opcionalmente rode uma amostra substituindo <COLUNA_ESCOLA> pela coluna existente
-- SELECT student_cpf_digits, <COLUNA_ESCOLA>
-- FROM public.previous_year_students
-- WHERE <COLUNA_ESCOLA> IS NOT NULL
-- LIMIT 10;

-- 8) Checagens adicionais (opcionais)
-- 8.1) Distribuição por created_by_user_type (últimos 14 dias)
SELECT date_trunc('day', created_at) AS dia,
       COALESCE(created_by_user_type,'(null)') AS origem,
       COUNT(*)
FROM public.enrollments
WHERE created_at >= now() - interval '14 days'
GROUP BY 1,2
ORDER BY 1 DESC, 2;

-- 8.2) Presença de school_id em enrollments
SELECT COUNT(*) FILTER (WHERE school_id IS NULL) AS school_nulls,
       COUNT(*) AS total
FROM public.enrollments
WHERE created_at >= now() - interval '90 days';

-- Fim — todas as consultas acima são somente leitura.
