-- =============================================================
-- FASE 0 — PRÉ-CHECAGENS (Somente Leitura) 
-- Objetivo: Confirmar diagnóstico sem alterar dados de produção.
-- Use em DEV/STAGING. Em PROD, rode apenas as seções A–D.
-- Observação: As seções E (A/B) usam BEGIN/ROLLBACK para não persistir.
-- =============================================================

-- ==============
-- SEÇÃO A — Schema
-- ==============
-- Verificar se a coluna existe e se o tipo ENUM está criado
SELECT 'A1: coluna tag_matricula' AS check,
       column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'enrollments'
  AND column_name = 'tag_matricula';

SELECT 'A2: tipo ENUM tag_matricula_enum' AS check,
       n.nspname AS schema, t.typname AS enum_name, t.typtype
FROM pg_type t
JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public' AND t.typname = 'tag_matricula_enum';

-- Índice auxiliar (opcional)
SELECT 'A3: índice idx_enrollments_tag_matricula' AS check,
       indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'enrollments' AND indexname = 'idx_enrollments_tag_matricula';

-- ============================
-- SEÇÃO B — Definição da RPC
-- ============================
-- Obter a(s) definição(ões) da função enroll_finalize
SELECT 'B1: definição da função' AS check,
       p.oid,
       n.nspname AS schema,
       p.proname AS function,
       pg_get_function_identity_arguments(p.oid) AS args,
       pg_get_functiondef(p.oid) AS definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'enroll_finalize'
ORDER BY p.oid DESC;

-- ==================================
-- SEÇÃO C — Distribuição das flags
-- ==================================
-- Distribuição nos últimos 30 dias
SELECT 'C1: distribuição 30 dias' AS check,
       tag_matricula, COUNT(*)
FROM public.enrollments
WHERE created_at >= now() - interval '30 days'
GROUP BY tag_matricula
ORDER BY COUNT(*) DESC, tag_matricula NULLS FIRST;

-- Distribuição diária (14 dias)
SELECT 'C2: distribuição diária 14 dias' AS check,
       date_trunc('day', created_at) AS day,
       tag_matricula,
       COUNT(*)
FROM public.enrollments
WHERE created_at >= now() - interval '14 days'
GROUP BY day, tag_matricula
ORDER BY day DESC, tag_matricula NULLS FIRST;

-- Cruzamento por tipo de usuário (30 dias)
SELECT 'C3: por created_by_user_type (30 dias)' AS check,
       COALESCE(created_by_user_type,'(null)') AS created_by_user_type,
       COALESCE(tag_matricula::text,'(null)') AS tag_matricula,
       COUNT(*)
FROM public.enrollments
WHERE created_at >= now() - interval '30 days'
GROUP BY COALESCE(created_by_user_type,'(null)'), COALESCE(tag_matricula::text,'(null)')
ORDER BY 1, 2;

-- =================================
-- SEÇÃO D — Amostra de registros
-- =================================
SELECT 'D1: amostra recente' AS check,
       id, student_name, student_cpf, tag_matricula, created_by_user_type, status, created_at
FROM public.enrollments
ORDER BY created_at DESC
LIMIT 50;

-- ==============================================
-- SEÇÃO E — Teste A/B (usar em DEV/STAGING)
-- ==============================================
-- Observações importantes:
-- 1) Cada bloco roda dentro de uma transação e finaliza com ROLLBACK.
-- 2) Exige gen_random_uuid(). Se indisponível, use uuid_generate_v4() ou substitua por um UUID fixo.
-- 3) O payload atende aos campos usados pelo INSERT da RPC (migr. 025/026).

-- ---------
-- Teste A — RPC: Esperado ANTES da correção: tag_matricula = NULL
-- ---------
BEGIN;
SELECT 'E-A: RPC enroll_finalize com tag_matricula=novo_aluno' AS step;

WITH payload AS (
  SELECT '{
    "student_name":"Teste F0 RPC",
    "student_cpf":"00000000191",
    "student_birth_date":"2010-01-01",
    "student_escola":"sete_setembro",
    "series_id":"S1",
    "series_name":"1ª Série",
    "track_id":"T1",
    "track_name":"Combinado",
    "shift":"morning",

    "guardian1_name":"Resp A",
    "guardian1_cpf":"00000000191",
    "guardian1_phone":"11900000000",
    "guardian1_email":"resp@example.com",
    "guardian1_relationship":"pai",

    "address_cep":"37700000",
    "address_street":"Rua A",
    "address_number":"123",
    "address_district":"Centro",
    "address_city":"Poços",
    "address_state":"MG",

    "base_value":1000,
    "total_discount_percentage":10,
    "total_discount_value":100,
    "final_monthly_value":900,
    "material_cost":50,

    "status":"submitted",
    "approval_level":"automatic",
    "approval_status":"pending",

    "created_by_user_type":"matricula",

    "tag_matricula":"novo_aluno"
  }'::jsonb AS p_enrollment
),
tx AS (
  SELECT gen_random_uuid() AS client_tx_id
),
rpc_call AS (
  SELECT *
  FROM public.enroll_finalize(
    (SELECT p_enrollment FROM payload),
    '[]'::jsonb,
    (SELECT client_tx_id FROM tx)
  )
)
SELECT 'E-A: resultado' AS step, e.id, e.tag_matricula, e.created_at
FROM public.enrollments e
JOIN tx ON e.client_tx_id = tx.client_tx_id
JOIN rpc_call ON true;

ROLLBACK;

-- ---------
-- Teste B — INSERT direto: Esperado ANTES da correção: tag_matricula = 'novo_aluno'
-- ---------
BEGIN;
SELECT 'E-B: INSERT direto com tag_matricula=novo_aluno' AS step;

WITH payload AS (
  SELECT '{
    "student_name":"Teste F0 INSERT",
    "student_cpf":"00000000191",
    "student_birth_date":"2010-01-01",
    "student_escola":"sete_setembro",
    "series_id":"S1",
    "series_name":"1ª Série",
    "track_id":"T1",
    "track_name":"Combinado",
    "shift":"morning",

    "guardian1_name":"Resp A",
    "guardian1_cpf":"00000000191",
    "guardian1_phone":"11900000000",
    "guardian1_email":"resp@example.com",
    "guardian1_relationship":"pai",

    "address_cep":"37700000",
    "address_street":"Rua A",
    "address_number":"123",
    "address_district":"Centro",
    "address_city":"Poços",
    "address_state":"MG",

    "base_value":1000,
    "total_discount_percentage":10,
    "total_discount_value":100,
    "final_monthly_value":900,
    "material_cost":50,

    "status":"submitted",
    "approval_level":"automatic",
    "approval_status":"pending",

    "created_by_user_type":"matricula",

    "tag_matricula":"novo_aluno"
  }'::jsonb AS p_enrollment
),
tx AS (
  SELECT gen_random_uuid() AS client_tx_id
),
ins AS (
  INSERT INTO public.enrollments (
    student_name, student_cpf, student_rg, student_birth_date, student_gender, student_escola,
    series_id, series_name, track_id, track_name, shift,
    guardian1_name, guardian1_cpf, guardian1_phone, guardian1_email, guardian1_relationship,
    guardian2_name, guardian2_cpf, guardian2_phone, guardian2_email, guardian2_relationship,
    address_cep, address_street, address_number, address_complement, address_district, address_city, address_state,
    base_value, total_discount_percentage, total_discount_value, final_monthly_value, material_cost,
    status, approval_level, approval_status,
    pdf_url, pdf_generated_at,
    created_by_user_id, created_by_user_email, created_by_user_name, created_by_user_type,
    client_tx_id,
    created_at, updated_at,
    tag_matricula
  )
  SELECT
    COALESCE(p.p_enrollment->>'student_name',''),
    p.p_enrollment->>'student_cpf',
    NULL,
    (p.p_enrollment->>'student_birth_date')::date,
    NULL,
    p.p_enrollment->>'student_escola',

    p.p_enrollment->>'series_id',
    COALESCE(p.p_enrollment->>'series_name','N/A'),
    p.p_enrollment->>'track_id',
    COALESCE(p.p_enrollment->>'track_name','N/A'),
    p.p_enrollment->>'shift',

    p.p_enrollment->>'guardian1_name',
    p.p_enrollment->>'guardian1_cpf',
    p.p_enrollment->>'guardian1_phone',
    p.p_enrollment->>'guardian1_email',
    p.p_enrollment->>'guardian1_relationship',

    NULL, NULL, NULL, NULL, NULL,

    p.p_enrollment->>'address_cep',
    p.p_enrollment->>'address_street',
    p.p_enrollment->>'address_number',
    NULL,
    p.p_enrollment->>'address_district',
    p.p_enrollment->>'address_city',
    p.p_enrollment->>'address_state',

    COALESCE((p.p_enrollment->>'base_value')::numeric, 0),
    COALESCE((p.p_enrollment->>'total_discount_percentage')::numeric, 0),
    COALESCE((p.p_enrollment->>'total_discount_value')::numeric, 0),
    COALESCE((p.p_enrollment->>'final_monthly_value')::numeric, 0),
    COALESCE((p.p_enrollment->>'material_cost')::numeric, 0),

    COALESCE(p.p_enrollment->>'status','draft'),
    COALESCE(p.p_enrollment->>'approval_level','automatic'),
    COALESCE(p.p_enrollment->>'approval_status','pending'),

    NULL, NULL,

    NULL::uuid, NULL, NULL, COALESCE(p.p_enrollment->>'created_by_user_type','anonymous'),

    (SELECT client_tx_id FROM tx),

    now(), now(),

    (p.p_enrollment->>'tag_matricula')::public.tag_matricula_enum
  FROM payload p, tx
  RETURNING id, client_tx_id
)
SELECT 'E-B: resultado' AS step, e.id, e.tag_matricula, e.created_at
FROM ins i
JOIN public.enrollments e ON e.id = i.id;

ROLLBACK;

-- FIM — Fase 0
