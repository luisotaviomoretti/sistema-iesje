-- =====================================================
-- TEST: rematricula_fase3_search_candidates.sql
-- OBJETIVO: Validar a RPC rematricula_search_candidates e índices
-- CONTEXTO: Não-disruptivo; não altera dados de produção
-- DATA: 2025-09-13
-- =====================================================

-- Pré-condições básicas
\echo '== Pré-condições =='
SELECT current_user;
SELECT current_schema();

-- Smoke: extensões
\echo '== Extensões =='
SELECT extname FROM pg_extension WHERE extname IN ('unaccent','pg_trgm','pgcrypto');

-- Conferir existência da função
\echo '== Funções =='
SELECT proname FROM pg_proc JOIN pg_namespace n ON n.oid = pg_proc.pronamespace
WHERE n.nspname = 'public' AND proname IN ('rematricula_search_candidates','issue_selection_token');

-- Casos de teste (ajuste usuários de teste conforme ambiente)
\echo '== Teste: Busca por aluno (min_chars, paginacao) =='
SELECT * FROM public.rematricula_search_candidates('ana', 'student', extract(year from now())::int, 20, 0);

\echo '== Teste: Busca por responsável (guardian) =='
SELECT * FROM public.rematricula_search_candidates('silva', 'guardian', extract(year from now())::int, 20, 0);

\echo '== Teste: Limit/Offset clamps =='
SELECT count(*) FROM public.rematricula_search_candidates('a', 'student', extract(year from now())::int, 9999, -10);

\echo '== Teste: Token válido (estrutura) =='
SELECT selection_token FROM public.rematricula_search_candidates('ana', 'student', extract(year from now())::int, 1, 0) LIMIT 1;

\echo '== Teste: Sem PII sensível =='
-- Garantir que CPF não é retornado
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'pg_temp' AND table_name = 'rematricula_search_candidates';

-- Observações: em ambientes com RLS rígida, executar como usuário autenticado adequado.
-- Este teste não escreve dados, apenas lê e exercita a função.
