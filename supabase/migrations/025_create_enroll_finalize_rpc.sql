-- =====================================================
-- MIGRATION: 025_create_enroll_finalize_rpc.sql
-- DESCRIÇÃO: Cria função RPC transacional para finalizar matrícula
--            com inserção atômica de enrollment + discounts
--            e idempotência via client_tx_id.
-- DATA: 2025-09-09
-- =====================================================

-- Segurança e compatibilidade:
--  - SECURITY INVOKER: respeita RLS vigente (sem elevar privilégios)
--  - Não altera tabelas, RLS, nem índices; apenas adiciona função
--  - Idempotência: se client_tx_id existir, retorna a matrícula existente

CREATE OR REPLACE FUNCTION public.enroll_finalize(
  p_enrollment jsonb,
  p_discounts jsonb DEFAULT '[]'::jsonb,
  p_client_tx_id uuid DEFAULT NULL
)
RETURNS TABLE (
  enrollment_id uuid,
  created boolean,
  discount_count integer
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_existing_id uuid;
  v_enrollment_id uuid;
BEGIN
  -- Idempotência: se já houver registro com este client_tx_id, retorna
  IF p_client_tx_id IS NOT NULL THEN
    SELECT id INTO v_existing_id
    FROM public.enrollments
    WHERE client_tx_id = p_client_tx_id
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
      RETURN QUERY
      SELECT v_existing_id,
             false AS created,
             (SELECT count(*) FROM public.enrollment_discounts d WHERE d.enrollment_id = v_existing_id);
      RETURN;
    END IF;
  END IF;

  -- Inserir enrollment (campos whitelisted)
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
    created_at, updated_at
  )
  VALUES (
    COALESCE(p_enrollment->>'student_name',''),
    p_enrollment->>'student_cpf',
    NULLIF(p_enrollment->>'student_rg',''),
    (p_enrollment->>'student_birth_date')::date,
    NULLIF(p_enrollment->>'student_gender',''),
    p_enrollment->>'student_escola',

    p_enrollment->>'series_id',
    COALESCE(p_enrollment->>'series_name','N/A'),
    p_enrollment->>'track_id',
    COALESCE(p_enrollment->>'track_name','N/A'),
    NULLIF(p_enrollment->>'shift',''),

    p_enrollment->>'guardian1_name',
    p_enrollment->>'guardian1_cpf',
    p_enrollment->>'guardian1_phone',
    p_enrollment->>'guardian1_email',
    p_enrollment->>'guardian1_relationship',

    NULLIF(p_enrollment->>'guardian2_name',''),
    NULLIF(p_enrollment->>'guardian2_cpf',''),
    NULLIF(p_enrollment->>'guardian2_phone',''),
    NULLIF(p_enrollment->>'guardian2_email',''),
    NULLIF(p_enrollment->>'guardian2_relationship',''),

    p_enrollment->>'address_cep',
    p_enrollment->>'address_street',
    p_enrollment->>'address_number',
    NULLIF(p_enrollment->>'address_complement',''),
    p_enrollment->>'address_district',
    p_enrollment->>'address_city',
    p_enrollment->>'address_state',

    COALESCE((p_enrollment->>'base_value')::numeric, 0),
    COALESCE((p_enrollment->>'total_discount_percentage')::numeric, 0),
    COALESCE((p_enrollment->>'total_discount_value')::numeric, 0),
    COALESCE((p_enrollment->>'final_monthly_value')::numeric, 0),
    COALESCE((p_enrollment->>'material_cost')::numeric, 0),

    COALESCE(p_enrollment->>'status','draft'),
    COALESCE(p_enrollment->>'approval_level','automatic'),
    COALESCE(p_enrollment->>'approval_status','pending'),

    NULLIF(p_enrollment->>'pdf_url',''),
    CASE WHEN p_enrollment ? 'pdf_generated_at' THEN (p_enrollment->>'pdf_generated_at')::timestamptz ELSE NULL END,

    NULLIF(p_enrollment->>'created_by_user_id','')::uuid,
    NULLIF(p_enrollment->>'created_by_user_email',''),
    NULLIF(p_enrollment->>'created_by_user_name',''),
    COALESCE(p_enrollment->>'created_by_user_type','anonymous'),

    p_client_tx_id,

    now(), now()
  )
  RETURNING id INTO v_enrollment_id;

  -- Inserir discounts (dedup por discount_id dentro do payload)
  WITH items AS (
    SELECT DISTINCT ON ((d->>'discount_id'))
      (d->>'discount_id')::text AS discount_id,
      COALESCE(d->>'discount_code','')::text AS discount_code,
      COALESCE(d->>'discount_name','')::text AS discount_name,
      COALESCE(d->>'discount_category','unknown')::text AS discount_category,
      COALESCE((d->>'percentage_applied')::numeric, 0) AS percentage_applied,
      COALESCE((d->>'value_applied')::numeric, 0) AS value_applied
    FROM jsonb_array_elements(COALESCE(p_discounts, '[]'::jsonb)) AS d
  )
  INSERT INTO public.enrollment_discounts (
    enrollment_id, discount_id, discount_code, discount_name, discount_category, percentage_applied, value_applied
  )
  SELECT v_enrollment_id, i.discount_id, i.discount_code, i.discount_name, i.discount_category, i.percentage_applied, i.value_applied
  FROM items i;

  RETURN QUERY
  SELECT v_enrollment_id,
         true AS created,
         (SELECT count(*) FROM public.enrollment_discounts ed WHERE ed.enrollment_id = v_enrollment_id);

END;
$$;

COMMENT ON FUNCTION public.enroll_finalize(jsonb, jsonb, uuid)
IS 'Finaliza matrícula (insert atômico em enrollments + enrollment_discounts) com idempotência via client_tx_id; SECURITY INVOKER para respeitar RLS.';

