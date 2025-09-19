-- =====================================================
-- MIGRATION: 044_update_enroll_finalize_rpc_annual_values.sql
-- DESCRIÇÃO: (1) Adiciona colunas annual_* em public.enrollments (idempotente)
--            (2) Atualiza a função public.enroll_finalize para inserir
--                annual_base_value, annual_material_value, annual_total_value
--            Backward-compatible: mesma assinatura/retorno.
-- DATA: 2025-09-19
-- =====================================================

BEGIN;

-- (1) Colunas opcionais na tabela (se ainda não existirem)
ALTER TABLE public.enrollments
  ADD COLUMN IF NOT EXISTS annual_base_value numeric(12,2),
  ADD COLUMN IF NOT EXISTS annual_material_value numeric(12,2),
  ADD COLUMN IF NOT EXISTS annual_total_value numeric(12,2);

COMMENT ON COLUMN public.enrollments.annual_base_value IS 'Snapshot anual (sem material) da série no momento da matrícula (informativo)';
COMMENT ON COLUMN public.enrollments.annual_material_value IS 'Snapshot anual do material da série no momento da matrícula (informativo)';
COMMENT ON COLUMN public.enrollments.annual_total_value IS 'Snapshot anual total (com material) da série no momento da matrícula (informativo)';

-- (2) Atualiza a função RPC para aceitar/gravar annual_*
CREATE OR REPLACE FUNCTION public.enroll_finalize(
  p_enrollment jsonb,
  p_discounts jsonb DEFAULT '[]'::jsonb,
  p_client_tx_id uuid DEFAULT NULL
)
RETURNS TABLE (
  enrollment_id uuid,
  created boolean,
  discount_count bigint
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_existing_id uuid;
  v_enrollment_id uuid;
  v_raw_notes text;
  v_notes text;
  v_is_inad boolean := false;
  v_meses int;
  v_codigo text;
BEGIN
  -- Idempotência
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

  -- Sanitização opcional de payment_notes
  v_raw_notes := NULLIF(p_enrollment->>'payment_notes', '');
  IF v_raw_notes IS NOT NULL THEN
    v_notes := regexp_replace(v_raw_notes, E'\r\n?', E'\n', 'g');
    v_notes := btrim(v_notes);
    v_notes := regexp_replace(v_notes, E'\n{3,}', E'\n\n', 'g');
    v_notes := substring(v_notes for 1000);
    IF v_notes IS NOT NULL AND length(v_notes) = 0 THEN
      v_notes := NULL;
    END IF;
  END IF;

  -- Inserção do enrollment
  INSERT INTO public.enrollments (
    student_name, student_cpf, student_rg, student_birth_date, student_gender, student_escola,
    series_id, series_name, track_id, track_name, shift,
    guardian1_name, guardian1_cpf, guardian1_phone, guardian1_email, guardian1_relationship,
    guardian2_name, guardian2_cpf, guardian2_phone, guardian2_email, guardian2_relationship,
    address_cep, address_street, address_number, address_complement, address_district, address_city, address_state,
    base_value, total_discount_percentage, total_discount_value, final_monthly_value, material_cost,
    -- Novos campos anuais (informativos)
    annual_base_value, annual_material_value, annual_total_value,
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

    -- annual_* do JSON quando fornecidos; NULL caso contrário
    NULLIF(p_enrollment->>'annual_base_value','')::numeric,
    NULLIF(p_enrollment->>'annual_material_value','')::numeric,
    NULLIF(p_enrollment->>'annual_total_value','')::numeric,

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

  -- Persistir descontos (dedup por discount_id)
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

  -- Atualiza notas (se houver) de forma resiliente (colunas podem não existir)
  IF v_notes IS NOT NULL AND char_length(v_notes) > 0 THEN
    BEGIN
      UPDATE public.enrollments
      SET payment_notes = v_notes,
          payment_notes_by = auth.uid(),
          payment_notes_at = now()
      WHERE id = v_enrollment_id;
    EXCEPTION WHEN undefined_column THEN
      NULL;
    WHEN others THEN
      RAISE NOTICE 'Falha ao atualizar payment_notes para enrollment %: %', v_enrollment_id, SQLERRM;
    END;
  END IF;

  RETURN QUERY
  SELECT v_enrollment_id,
         true AS created,
         (SELECT count(*) FROM public.enrollment_discounts ed WHERE ed.enrollment_id = v_enrollment_id);

END;
$$;

COMMENT ON FUNCTION public.enroll_finalize(jsonb, jsonb, uuid)
IS 'Finaliza matrícula (insert atômico + descontos). Persiste annual_* quando enviados no JSON e payment_notes quando presente; SECURITY INVOKER (respeita RLS).';

COMMIT;
