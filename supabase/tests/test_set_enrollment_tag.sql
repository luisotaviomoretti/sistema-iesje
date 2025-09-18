-- =============================================================
-- TESTES (DEV) — Classificação server-side de tag_matricula
-- Objetivo: Validar que INSERT via RPC e direto resultam na tag correta
--           com base no match em previous_year_students.student_cpf_digits.
-- Observação: ESTE SCRIPT NÃO PERSISTE DADOS (usa BEGIN/ROLLBACK)
-- Pré-requisitos:
--   - Migração 022 (colunas student_cpf_digits) aplicada
--   - Migração 031 (função + trigger BEFORE INSERT) aplicada
--   - gen_random_uuid() disponível; se não, troque por uuid_generate_v4()
-- =============================================================

BEGIN;

-- Seleciona um CPF com match (se existir) e um CPF sem match
WITH pys AS (
  SELECT student_cpf_digits
  FROM public.previous_year_students
  WHERE student_cpf_digits IS NOT NULL
  ORDER BY created_at DESC
  LIMIT 1
),
no_match AS (
  SELECT CASE
           WHEN NOT EXISTS (
             SELECT 1 FROM public.previous_year_students WHERE student_cpf_digits = '98765432199'
           ) THEN '98765432199'
           ELSE '01234567890'
         END AS student_cpf_digits
)
SELECT 'Contexto' AS step,
       (SELECT student_cpf_digits FROM pys)        AS with_match_cpf_digits,
       (SELECT student_cpf_digits FROM no_match)   AS no_match_cpf_digits;

-- =========================
-- RPC — Caso com MATCH
-- =========================
WITH pys AS (
  SELECT student_cpf_digits
  FROM public.previous_year_students
  WHERE student_cpf_digits IS NOT NULL
  ORDER BY created_at DESC
  LIMIT 1
),
payload AS (
  SELECT jsonb_build_object(
    'student_name', 'Teste RPC MATCH',
    'student_cpf',  (SELECT student_cpf_digits FROM pys),
    'student_birth_date', '2010-01-01',
    'student_escola', 'sete_setembro',
    'series_id', 'S1',
    'series_name', '1ª Série',
    'track_id', 'T1',
    'track_name', 'Combinado',
    'shift', 'morning',
    'guardian1_name', 'Resp A',
    'guardian1_cpf', '00000000191',
    'guardian1_phone', '11900000000',
    'guardian1_email', 'resp@example.com',
    'guardian1_relationship', 'pai',
    'address_cep', '37700000',
    'address_street', 'Rua A',
    'address_number', '123',
    'address_district', 'Centro',
    'address_city', 'Pocos',
    'address_state', 'MG',
    'base_value', 1000,
    'total_discount_percentage', 10,
    'total_discount_value', 100,
    'final_monthly_value', 900,
    'material_cost', 50,
    'status', 'submitted',
    'approval_level', 'automatic',
    'approval_status', 'pending',
    'created_by_user_type', 'matricula'
  ) AS p_enrollment
), tx AS (
  SELECT gen_random_uuid() AS client_tx_id
), rpc_call AS (
  SELECT * FROM public.enroll_finalize(
    (SELECT p_enrollment FROM payload), '[]'::jsonb, (SELECT client_tx_id FROM tx)
  )
)
SELECT 'RPC-MATCH' AS step,
       'rematricula' AS expected_tag,
       e.tag_matricula AS actual_tag
FROM public.enrollments e
JOIN tx ON e.client_tx_id = tx.client_tx_id
JOIN rpc_call ON true;

-- =========================
-- RPC — Caso SEM MATCH
-- =========================
WITH no_match AS (
  SELECT CASE
           WHEN NOT EXISTS (
             SELECT 1 FROM public.previous_year_students WHERE student_cpf_digits = '98765432199'
           ) THEN '98765432199'
           ELSE '01234567890'
         END AS student_cpf_digits
),
payload AS (
  SELECT jsonb_build_object(
    'student_name', 'Teste RPC NO-MATCH',
    'student_cpf',  (SELECT student_cpf_digits FROM no_match),
    'student_birth_date', '2010-01-01',
    'student_escola', 'sete_setembro',
    'series_id', 'S1',
    'series_name', '1ª Série',
    'track_id', 'T1',
    'track_name', 'Combinado',
    'shift', 'morning',
    'guardian1_name', 'Resp A',
    'guardian1_cpf', '00000000191',
    'guardian1_phone', '11900000000',
    'guardian1_email', 'resp@example.com',
    'guardian1_relationship', 'pai',
    'address_cep', '37700000',
    'address_street', 'Rua A',
    'address_number', '123',
    'address_district', 'Centro',
    'address_city', 'Pocos',
    'address_state', 'MG',
    'base_value', 1000,
    'total_discount_percentage', 10,
    'total_discount_value', 100,
    'final_monthly_value', 900,
    'material_cost', 50,
    'status', 'submitted',
    'approval_level', 'automatic',
    'approval_status', 'pending',
    'created_by_user_type', 'matricula'
  ) AS p_enrollment
), tx AS (
  SELECT gen_random_uuid() AS client_tx_id
), rpc_call AS (
  SELECT * FROM public.enroll_finalize(
    (SELECT p_enrollment FROM payload), '[]'::jsonb, (SELECT client_tx_id FROM tx)
  )
)
SELECT 'RPC-NO-MATCH' AS step,
       'novo_aluno' AS expected_tag,
       e.tag_matricula AS actual_tag
FROM public.enrollments e
JOIN tx ON e.client_tx_id = tx.client_tx_id
JOIN rpc_call ON true;

-- =========================
-- INSERT direto — Caso com MATCH
-- =========================
WITH pys AS (
  SELECT student_cpf_digits
  FROM public.previous_year_students
  WHERE student_cpf_digits IS NOT NULL
  ORDER BY created_at DESC
  LIMIT 1
), tx AS (
  SELECT gen_random_uuid() AS client_tx_id
), ins AS (
  INSERT INTO public.enrollments (
    student_name, student_cpf, student_birth_date, student_escola,
    series_id, series_name, track_id, track_name, shift,
    guardian1_name, guardian1_cpf, guardian1_phone, guardian1_email, guardian1_relationship,
    address_cep, address_street, address_number, address_district, address_city, address_state,
    base_value, total_discount_percentage, total_discount_value, final_monthly_value, material_cost,
    status, approval_level, approval_status,
    created_by_user_type, client_tx_id,
    created_at, updated_at
  )
  SELECT
    'Teste INSERT MATCH',
    (SELECT student_cpf_digits FROM pys),
    '2010-01-01', 'sete_setembro',
    'S1', '1ª Série', 'T1', 'Combinado', 'morning',
    'Resp A', '00000000191', '11900000000', 'resp@example.com', 'pai',
    '37700000', 'Rua A', '123', 'Centro', 'Pocos', 'MG',
    1000, 10, 100, 900, 50,
    'submitted', 'automatic', 'pending',
    'matricula', (SELECT client_tx_id FROM tx),
    now(), now()
  RETURNING id
)
SELECT 'INS-MATCH' AS step,
       'rematricula' AS expected_tag,
       e.tag_matricula AS actual_tag
FROM ins i
JOIN public.enrollments e ON e.id = i.id;

-- =========================
-- INSERT direto — Caso SEM MATCH
-- =========================
WITH no_match AS (
  SELECT CASE
           WHEN NOT EXISTS (
             SELECT 1 FROM public.previous_year_students WHERE student_cpf_digits = '98765432199'
           ) THEN '98765432199'
           ELSE '01234567890'
         END AS student_cpf_digits
), tx AS (
  SELECT gen_random_uuid() AS client_tx_id
), ins AS (
  INSERT INTO public.enrollments (
    student_name, student_cpf, student_birth_date, student_escola,
    series_id, series_name, track_id, track_name, shift,
    guardian1_name, guardian1_cpf, guardian1_phone, guardian1_email, guardian1_relationship,
    address_cep, address_street, address_number, address_district, address_city, address_state,
    base_value, total_discount_percentage, total_discount_value, final_monthly_value, material_cost,
    status, approval_level, approval_status,
    created_by_user_type, client_tx_id,
    created_at, updated_at
  )
  SELECT
    'Teste INSERT NO-MATCH',
    (SELECT student_cpf_digits FROM no_match),
    '2010-01-01', 'sete_setembro',
    'S1', '1ª Série', 'T1', 'Combinado', 'morning',
    'Resp A', '00000000191', '11900000000', 'resp@example.com', 'pai',
    '37700000', 'Rua A', '123', 'Centro', 'Pocos', 'MG',
    1000, 10, 100, 900, 50,
    'submitted', 'automatic', 'pending',
    'matricula', (SELECT client_tx_id FROM tx),
    now(), now()
  RETURNING id
)
SELECT 'INS-NO-MATCH' AS step,
       'novo_aluno' AS expected_tag,
       e.tag_matricula AS actual_tag
FROM ins i
JOIN public.enrollments e ON e.id = i.id;

ROLLBACK;
