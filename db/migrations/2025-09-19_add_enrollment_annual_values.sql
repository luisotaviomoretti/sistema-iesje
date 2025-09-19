-- Migration: Add optional annual value snapshot columns to public.enrollments
-- Purpose: Persist annual_base_value, annual_material_value, annual_total_value when provided by the client payload (F5)
-- Safety: Non-breaking (nullable, no defaults). Existing code keeps working.

BEGIN;

ALTER TABLE public.enrollments
  ADD COLUMN IF NOT EXISTS annual_base_value numeric(12,2),
  ADD COLUMN IF NOT EXISTS annual_material_value numeric(12,2),
  ADD COLUMN IF NOT EXISTS annual_total_value numeric(12,2);

COMMENT ON COLUMN public.enrollments.annual_base_value IS 'Snapshot anual (sem material) da série no momento da matrícula (informativo)';
COMMENT ON COLUMN public.enrollments.annual_material_value IS 'Snapshot anual do material da série no momento da matrícula (informativo)';
COMMENT ON COLUMN public.enrollments.annual_total_value IS 'Snapshot anual total (com material) da série no momento da matrícula (informativo)';

COMMIT;

-- NOTE ABOUT RPC enroll_finalize
-- If your RPC uses jsonb_populate_record/json_populate_record to map p_enrollment -> enrollments,
-- these new columns will be filled automatically whenever the client sends the keys
-- (annual_base_value, annual_material_value, annual_total_value).
--
-- If your RPC uses an explicit INSERT list, ensure the three columns are included.
-- Example (sketch; adjust to your function signature):
--
-- CREATE OR REPLACE FUNCTION public.enroll_finalize(
--   p_enrollment jsonb,
--   p_discounts jsonb,
--   p_client_tx_id uuid
-- ) RETURNS TABLE(enrollment_id uuid) AS $$
-- DECLARE
--   v_id uuid;
-- BEGIN
--   INSERT INTO public.enrollments (
--     student_name, student_cpf, student_rg, student_birth_date, student_gender, student_escola,
--     series_id, series_name, track_id, track_name, shift,
--     guardian1_name, guardian1_cpf, guardian1_phone, guardian1_email, guardian1_relationship,
--     guardian2_name, guardian2_cpf, guardian2_phone, guardian2_email, guardian2_relationship,
--     address_cep, address_street, address_number, address_complement, address_district, address_city, address_state,
--     base_value, total_discount_percentage, total_discount_value, final_monthly_value, material_cost,
--     status, approval_level, approval_status,
--     created_by_user_id, created_by_user_email, created_by_user_name, created_by_user_type,
--     payment_notes,
--     annual_base_value, annual_material_value, annual_total_value,
--     client_tx_id
--   )
--   VALUES (
--     p_enrollment->>'student_name', p_enrollment->>'student_cpf', p_enrollment->>'student_rg', (p_enrollment->>'student_birth_date')::date, p_enrollment->>'student_gender', p_enrollment->>'student_escola',
--     p_enrollment->>'series_id', p_enrollment->>'series_name', p_enrollment->>'track_id', p_enrollment->>'track_name', p_enrollment->>'shift',
--     p_enrollment->>'guardian1_name', p_enrollment->>'guardian1_cpf', p_enrollment->>'guardian1_phone', p_enrollment->>'guardian1_email', p_enrollment->>'guardian1_relationship',
--     NULLIF(p_enrollment->>'guardian2_name',''), NULLIF(p_enrollment->>'guardian2_cpf',''), NULLIF(p_enrollment->>'guardian2_phone',''), NULLIF(p_enrollment->>'guardian2_email',''), NULLIF(p_enrollment->>'guardian2_relationship',''),
--     p_enrollment->>'address_cep', p_enrollment->>'address_street', p_enrollment->>'address_number', NULLIF(p_enrollment->>'address_complement',''), p_enrollment->>'address_district', p_enrollment->>'address_city', p_enrollment->>'address_state',
--     (p_enrollment->>'base_value')::numeric, (p_enrollment->>'total_discount_percentage')::numeric, (p_enrollment->>'total_discount_value')::numeric, (p_enrollment->>'final_monthly_value')::numeric, (p_enrollment->>'material_cost')::numeric,
--     COALESCE(p_enrollment->>'status','draft'), COALESCE(p_enrollment->>'approval_level','automatic'), COALESCE(p_enrollment->>'approval_status','pending'),
--     (p_enrollment->>'created_by_user_id')::uuid, p_enrollment->>'created_by_user_email', p_enrollment->>'created_by_user_name', p_enrollment->>'created_by_user_type',
--     NULLIF(p_enrollment->>'payment_notes',''),
--     NULLIF(p_enrollment->>'annual_base_value','')::numeric, NULLIF(p_enrollment->>'annual_material_value','')::numeric, NULLIF(p_enrollment->>'annual_total_value','')::numeric,
--     p_client_tx_id
--   ) RETURNING id INTO v_id;
--
--   -- handle discounts (p_discounts) ...
--   RETURN QUERY SELECT v_id;
-- END;
-- $$ LANGUAGE plpgsql SECURITY DEFINER;
