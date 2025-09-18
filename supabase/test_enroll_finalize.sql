-- Testes de sanidade para RPC enroll_finalize

-- 1) Payload de exemplo mínimo (ajuste valores para ambiente DEV)
WITH payload AS (
  SELECT
    jsonb_build_object(
      'student_name','Aluno Teste',
      'student_cpf','00000000191',
      'student_rg',NULL,
      'student_birth_date','2010-01-01',
      'student_gender','M',
      'student_escola','sete_setembro',

      'series_id','S1',
      'series_name','Série 1',
      'track_id','T1',
      'track_name','combinado',
      'shift','morning',

      'guardian1_name','Resp Teste',
      'guardian1_cpf','00000000191',
      'guardian1_phone','11999999999',
      'guardian1_email','resp@teste.com',
      'guardian1_relationship','pai',

      'address_cep','37700000',
      'address_street','Rua A',
      'address_number','123',
      'address_complement',NULL,
      'address_district','Centro',
      'address_city','Poços',
      'address_state','MG',

      'base_value',850,
      'total_discount_percentage',15,
      'total_discount_value',127.5,
      'final_monthly_value',722.5,
      'material_cost',50,

      'status','draft',
      'approval_level','automatic',
      'approval_status','pending',

      'created_by_user_id',NULL,
      'created_by_user_email',NULL,
      'created_by_user_name',NULL,
      'created_by_user_type','anonymous'
    ) AS enrollment,
    jsonb_build_array(
      jsonb_build_object(
        'discount_id','D1',
        'discount_code','IIR',
        'discount_name','Irmãos',
        'discount_category','regular',
        'percentage_applied',10,
        'value_applied',80
      ),
      jsonb_build_object(
        'discount_id','D2',
        'discount_code','PAV',
        'discount_name','Pagamento à Vista',
        'discount_category','negociacao',
        'percentage_applied',5,
        'value_applied',40
      )
    ) AS discounts
)
SELECT * FROM payload, LATERAL (
  SELECT * FROM public.enroll_finalize(payload.enrollment, payload.discounts, gen_random_uuid())
) f;

-- 2) Idempotência: repetir com o mesmo client_tx_id deve retornar created=false
-- DO NOT RUN in prod; this is a sample for DEV
-- WITH payload AS (
--   SELECT
--     jsonb_build_object(...)
-- ), tx AS (
--   SELECT gen_random_uuid() AS tx
-- )
-- SELECT * FROM tx, LATERAL (
--   SELECT * FROM public.enroll_finalize(payload.enrollment, payload.discounts, tx.tx)
-- ) first_call,
-- LATERAL (
--   SELECT * FROM public.enroll_finalize(payload.enrollment, payload.discounts, tx.tx)
-- ) second_call;

