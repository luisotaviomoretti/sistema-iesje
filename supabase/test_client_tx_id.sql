-- Testes rápidos para a migração 024 (client_tx_id)

-- 1) Coluna existe?
SELECT EXISTS (
  SELECT 1 FROM information_schema.columns 
  WHERE table_schema = 'public'
    AND table_name = 'enrollments'
    AND column_name = 'client_tx_id'
) AS has_client_tx_id;

-- 2) Índice único parcial existe?
SELECT EXISTS (
  SELECT 1 FROM pg_indexes 
  WHERE schemaname = 'public'
    AND indexname = 'idx_enrollments_client_tx_id_unique'
) AS has_unique_index;

-- 3) (Opcional) Validação funcional — executar em ambiente de DEV
--    Demonstra que valores NULL podem repetir e non-NULL devem ser únicos.
-- BEGIN;
--   INSERT INTO public.enrollments (
--     id, student_name, student_cpf, student_birth_date, student_escola,
--     series_id, series_name, track_id, track_name, shift,
--     guardian1_name, guardian1_cpf, guardian1_phone, guardian1_email, guardian1_relationship,
--     address_cep, address_street, address_number, address_district, address_city, address_state,
--     base_value, final_monthly_value, status, approval_status, created_at, updated_at,
--     client_tx_id
--   ) VALUES (
--     gen_random_uuid(), 'Teste A', '00000000191', '2010-01-01', 'sete_setembro',
--     'S1', 'Série 1', 'T1', 'combinado', 'morning',
--     'Resp A', '00000000191', '11999999999', 'a@a.com', 'pai',
--     '37700000', 'Rua A', '123', 'Centro', 'Poços', 'MG',
--     100, 100, 'draft', 'pending', now(), now(),
--     '3d9f3b08-3c10-4a5a-8a6f-6ed6b7d0f001'::uuid
--   );
--   -- TENTAR repetir o mesmo client_tx_id deve falhar
--   INSERT INTO public.enrollments (...campos obrigatórios...)
--   VALUES (..., '3d9f3b08-3c10-4a5a-8a6f-6ed6b7d0f001');
-- ROLLBACK;

