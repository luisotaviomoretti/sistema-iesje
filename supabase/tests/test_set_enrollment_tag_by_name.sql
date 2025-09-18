-- =============================================================
-- TESTES (DEV) — Classificação server-side de tag_matricula por NOME
-- Objetivo: Validar que INSERT via RPC e direto resultam na tag correta
--           com base no match (nome normalizado + data de nascimento)
--           em previous_year_students do ano anterior.
-- Observação: ESTE SCRIPT NÃO PERSISTE ALTERAÇÕES DE DADOS (usa BEGIN/ROLLBACK)
-- Pré-requisitos:
--   - Migração 031 aplicada (função + trigger BEFORE INSERT)
--   - Migração 035 aplicada (estratégia por nome via system_config)
--   - Funções get_system_config/set_system_config disponíveis
--   - Base previous_year_students populada para o ano anterior (ex.: 2024)
-- =============================================================

BEGIN;

-- Definir estratégia para 'name' e exigir birth_date (mais robusto)
INSERT INTO public.system_configs (chave, valor, descricao, categoria, updated_by)
VALUES ('rematricula.tag_matricula.strategy', 'name', 'Estratégia de classificação (name|cpf)', 'geral', 'test')
ON CONFLICT (chave) DO UPDATE
SET valor = EXCLUDED.valor, descricao = EXCLUDED.descricao, categoria = EXCLUDED.categoria, updated_by = EXCLUDED.updated_by, updated_at = NOW();

INSERT INTO public.system_configs (chave, valor, descricao, categoria, updated_by)
VALUES ('rematricula.tag_matricula.name_match.require_birth_date', 'true', 'Se true, exige nome+birth_date no match por nome', 'geral', 'test')
ON CONFLICT (chave) DO UPDATE
SET valor = EXCLUDED.valor, descricao = EXCLUDED.descricao, categoria = EXCLUDED.categoria, updated_by = EXCLUDED.updated_by, updated_at = NOW();

-- Contexto: obter um registro da base do ano anterior para testar MATCH
WITH prev AS (
  SELECT student_name, student_birth_date
  FROM public.previous_year_students
  WHERE academic_year = (extract(year from now())::int - 1)::text
    AND student_name IS NOT NULL
    AND student_birth_date IS NOT NULL
  ORDER BY created_at DESC
  LIMIT 1
)
SELECT 'Contexto-NOME' AS step,
       (SELECT student_name FROM prev)     AS sample_student_name,
       (SELECT student_birth_date FROM prev) AS sample_birth_date;

-- =========================
-- RPC — Caso com MATCH por nome+birth_date
-- =========================
WITH ctx AS (
  SELECT (extract(year from now())::int - 1)::text AS prev_year,
         (SELECT student_name FROM public.previous_year_students WHERE academic_year = (extract(year from now())::int - 1)::text ORDER BY created_at DESC LIMIT 1) AS s_name,
         (SELECT student_birth_date FROM public.previous_year_students WHERE academic_year = (extract(year from now())::int - 1)::text ORDER BY created_at DESC LIMIT 1) AS s_birth
),
payload AS (
  SELECT jsonb_build_object(
    'student_name', (SELECT s_name FROM ctx),
    'student_cpf',  '00000000000', -- irrelevante para estratégia por nome
    'student_birth_date', (SELECT s_birth FROM ctx),
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
SELECT 'RPC-NAME-MATCH' AS step,
       'rematricula' AS expected_tag,
       e.tag_matricula AS actual_tag
FROM public.enrollments e
JOIN tx ON e.client_tx_id = tx.client_tx_id
JOIN rpc_call ON true;

-- =========================
-- RPC — Caso SEM MATCH por nome (nome inexistente; CPF vazio)
-- =========================
WITH payload AS (
  SELECT jsonb_build_object(
    'student_name', 'Aluno Inexistente ZZZ 123',
    'student_cpf',  NULL,
    'student_birth_date', '2011-02-02',
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
SELECT 'RPC-NAME-NO-MATCH' AS step,
       'novo_aluno' AS expected_tag,
       e.tag_matricula AS actual_tag
FROM public.enrollments e
JOIN tx ON e.client_tx_id = tx.client_tx_id
JOIN rpc_call ON true;

-- =========================
-- INSERT direto — Caso com MATCH por nome+birth_date
-- =========================
WITH ctx AS (
  SELECT (extract(year from now())::int - 1)::text AS prev_year,
         (SELECT student_name FROM public.previous_year_students WHERE academic_year = (extract(year from now())::int - 1)::text ORDER BY created_at DESC LIMIT 1) AS s_name,
         (SELECT student_birth_date FROM public.previous_year_students WHERE academic_year = (extract(year from now())::int - 1)::text ORDER BY created_at DESC LIMIT 1) AS s_birth
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
    (SELECT s_name FROM ctx),
    '00000000000',
    (SELECT s_birth FROM ctx), 'sete_setembro',
    'S1', '1ª Série', 'T1', 'Combinado', 'morning',
    'Resp A', '00000000191', '11900000000', 'resp@example.com', 'pai',
    '37700000', 'Rua A', '123', 'Centro', 'Pocos', 'MG',
    1000, 10, 100, 900, 50,
    'submitted', 'automatic', 'pending',
    'matricula', gen_random_uuid(),
    now(), now()
  RETURNING id
)
SELECT 'INS-NAME-MATCH' AS step,
       'rematricula' AS expected_tag,
       e.tag_matricula AS actual_tag
FROM ins i
JOIN public.enrollments e ON e.id = i.id;

-- =========================
-- INSERT direto — Caso SEM MATCH por nome (CPF vazio)
-- =========================
WITH ins AS (
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
    'Aluno Inexistente ZZZ 456',
    NULL,
    '2012-03-03', 'sete_setembro',
    'S1', '1ª Série', 'T1', 'Combinado', 'morning',
    'Resp A', '00000000191', '11900000000', 'resp@example.com', 'pai',
    '37700000', 'Rua A', '123', 'Centro', 'Pocos', 'MG',
    1000, 10, 100, 900, 50,
    'submitted', 'automatic', 'pending',
    'matricula', gen_random_uuid(),
    now(), now()
  RETURNING id
)
SELECT 'INS-NAME-NO-MATCH' AS step,
       'novo_aluno' AS expected_tag,
       e.tag_matricula AS actual_tag
FROM ins i
JOIN public.enrollments e ON e.id = i.id;

ROLLBACK;
