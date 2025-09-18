-- =============================================================
-- REMATRÍCULA • PAV — FASE 0 (PRÉ-CHECAGENS)
-- Objetivo: validar o ambiente sem alterações (somente leitura)
-- Rodar em DEV/STG (em PROD, apenas seções A–D).
-- =============================================================

-- ==============
-- SEÇÃO A — OBJETOS BÁSICOS
-- ==============
-- Tabelas essenciais
SELECT 'A1: tabela system_configs' AS check,
       to_regclass('public.system_configs') IS NOT NULL AS exists;

SELECT 'A2: tabela enrollments' AS check,
       to_regclass('public.enrollments') IS NOT NULL AS exists;

SELECT 'A3: tabela enrollment_discounts' AS check,
       to_regclass('public.enrollment_discounts') IS NOT NULL AS exists;

SELECT 'A4: tabela previous_year_students' AS check,
       to_regclass('public.previous_year_students') IS NOT NULL AS exists;

-- RPCs/Funções essenciais
SELECT 'A5: função get_system_config' AS check,
       EXISTS (
         SELECT 1 FROM pg_proc p
         JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public' AND p.proname = 'get_system_config'
       ) AS exists;

SELECT 'A6: função set_system_config' AS check,
       EXISTS (
         SELECT 1 FROM pg_proc p
         JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public' AND p.proname = 'set_system_config'
       ) AS exists;

SELECT 'A7: RPC enroll_finalize' AS check,
       EXISTS (
         SELECT 1 FROM pg_proc p
         JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public' AND p.proname = 'enroll_finalize'
       ) AS exists;

-- ======================
-- SEÇÃO B — DEFINIÇÕES
-- ======================
-- Definição da função enroll_finalize (verificar SECURITY INVOKER)
SELECT 'B1: definição enroll_finalize' AS check,
       p.oid,
       n.nspname AS schema,
       p.proname AS function,
       p.prosecdef AS security_definer, -- FALSE => SECURITY INVOKER
       pg_get_function_identity_arguments(p.oid) AS args,
       pg_get_functiondef(p.oid) AS definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'enroll_finalize'
ORDER BY p.oid DESC;

-- ================================
-- SEÇÃO C — CONFIGURAÇÕES ATUAIS
-- ================================
-- CAP do Desconto Sugerido (chaves existentes)
SELECT 'C1: chave cap.enabled' AS check, *
FROM public.system_configs
WHERE chave = 'rematricula.suggested_discount_cap.enabled'
LIMIT 10;

SELECT 'C2: chave cap.percent' AS check, *
FROM public.system_configs
WHERE chave = 'rematricula.suggested_discount_cap.percent'
LIMIT 10;

-- PAV (ainda não criado) — verificar inexistência atual (esperado)
SELECT 'C3: pav.enabled (esperado inexistente ou desabilitado)' AS check,
       COUNT(*) AS rows_found
FROM public.system_configs
WHERE chave = 'rematricula.pav.enabled';

SELECT 'C4: pav.percent (esperado inexistente ou 0)' AS check,
       COUNT(*) AS rows_found
FROM public.system_configs
WHERE chave = 'rematricula.pav.percent';

SELECT 'C5: pav.code (esperado inexistente ou PAV)' AS check,
       COUNT(*) AS rows_found
FROM public.system_configs
WHERE chave = 'rematricula.pav.code';

SELECT 'C6: pav.name (esperado inexistente ou "Pagamento à Vista")' AS check,
       COUNT(*) AS rows_found
FROM public.system_configs
WHERE chave = 'rematricula.pav.name';

-- ===============================
-- SEÇÃO D — AMOSTRAS E RLS (LEITURA)
-- ===============================
-- Amostra recente de enrollments (apenas leitura)
SELECT 'D1: amostra enrollments' AS check,
       id, student_name, student_cpf, status, approval_level, created_by_user_type, created_at
FROM public.enrollments
ORDER BY created_at DESC
LIMIT 20;

-- Distribuição de descontos persistidos (se houver)
SELECT 'D2: contagem discount rows' AS check,
       COUNT(*) AS total_discount_rows
FROM public.enrollment_discounts;

-- ==============================
-- SEÇÃO E — INSTRUÇÕES DE USO
-- ==============================
-- 1) Rodar as seções A–D. Confirmar que:
--    - Objetos e RPCs existem (A1–A7 true)
--    - enroll_finalize é SECURITY INVOKER (B1.security_definer = false)
--    - CAP sugerido possui chaves (C1, C2 retornam registros)
--    - PAV ainda não está criado (C3–C6 com rows_found = 0)
-- 2) Caso alguma checagem falhe, interromper rollout da F1 e registrar no checklist F0.

-- FIM — Fase 0 (PAV)
