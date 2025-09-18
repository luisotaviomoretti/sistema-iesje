-- =====================================================
-- TEST: novomatricula_payment_notes_fase2_verify.sql
-- Objetivo: Validar RPC public.enroll_finalize aceitando/sanitizando payment_notes
--           e persistindo em public.enrollments.* de forma resiliente.
-- Execução: DEV/STG, após aplicar migrações 042 e 043.
-- =====================================================

-- 1) Preparar payload mínimo para Nova Matrícula com payment_notes (inclui excesso de quebras)
WITH input AS (
  SELECT
    jsonb_build_object(
      'student_name', 'Teste Aluno Novo RPC',
      'student_cpf', '00000000191',
      'student_birth_date', '2012-01-01',
      'student_escola', 'sete_setembro',
      'series_id', 'S1',
      'series_name', '1ª Série',
      'track_id', 'T1',
      'track_name', 'combinado',
      'guardian1_name', 'Responsável Teste',
      'guardian1_cpf', '00000000191',
      'guardian1_phone', '11999999999',
      'guardian1_email', 'resp@test.com',
      'guardian1_relationship', 'pai',
      'address_cep', '37700000',
      'address_street', 'Rua A',
      'address_number', '123',
      'address_complement', null,
      'address_district', 'Centro',
      'address_city', 'Poços',
      'address_state', 'MG',
      'base_value', 850,
      'total_discount_percentage', 15,
      'total_discount_value', 127.5,
      'final_monthly_value', 722.5,
      'material_cost', 50,
      'created_by_user_type', 'matricula',
      'payment_notes', E'  Linha 1\r\n\n\nLinha 2 com texto longo ' || repeat('x', 1100)
    ) AS p_enrollment,
    '[]'::jsonb AS p_discounts,
    gen_random_uuid()::uuid AS p_client_tx_id
)
, rpc_call AS (
  SELECT *
  FROM input i,
       LATERAL public.enroll_finalize(i.p_enrollment, i.p_discounts, i.p_client_tx_id)
)
SELECT
  c.enrollment_id,
  c.created,
  e.payment_notes,
  e.payment_notes_at,
  e.payment_notes_by,
  (char_length(e.payment_notes) <= 1000) AS len_ok,
  (e.payment_notes LIKE '%\n\n%' AND e.payment_notes NOT LIKE '%\n\n\n%') AS breaks_normalized
FROM rpc_call c
JOIN public.enrollments e ON e.id = c.enrollment_id;

-- Esperado:
-- - created = true
-- - payment_notes não nulo
-- - len_ok = true (servidor limita a 1000)
-- - breaks_normalized = true (colapsa 3+ LFs em duplas)
-- - payment_notes_at não nulo
-- - payment_notes_by pode ser NULL (em contexto SQL sem JWT)
