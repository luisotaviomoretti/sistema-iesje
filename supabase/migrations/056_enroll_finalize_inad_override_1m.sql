-- =====================================================
-- MIGRATION: 056_enroll_finalize_inad_override_1m.sql
-- PROPÓSITO: Permitir exceção de 1 mês de inadimplência com confirmação do usuário
--            sem mudar a assinatura da RPC enroll_finalize. Registrar flag e snapshot
--            na tabela enrollments para auditoria e listagem no Admin.
-- DATA: 2025-10-03
-- =====================================================

-- 1) Colunas novas e opcionais em enrollments (não disruptivas)
ALTER TABLE public.enrollments
  ADD COLUMN IF NOT EXISTS inad_override_1m_used boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS inad_snapshot jsonb NULL;

COMMENT ON COLUMN public.enrollments.inad_override_1m_used IS 'True quando a finalização ocorreu com exceção de inadimplência de 1 mês (confirmada pelo usuário).';
COMMENT ON COLUMN public.enrollments.inad_snapshot IS 'Snapshot leve da checagem de inadimplência no momento da finalização (meses_inadim, codigo_inadim).';

-- 2) Ajuste da RPC enroll_finalize para aceitar override via campo opcional no p_enrollment
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
  v_is_inad boolean := false;
  v_meses int;
  v_codigo text;
  v_allow_override boolean := false;
  v_snap jsonb := NULL;
BEGIN
  -- Idempotência por client_tx_id (inalterado)
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

  -- Checagem de inadimplência (inalterada em essência)
  BEGIN
    SELECT is_inadimplente, meses_inadim, codigo_inadim
    INTO v_is_inad, v_meses, v_codigo
    FROM public.check_inadimplencia(
      COALESCE(p_enrollment->>'student_name',''),
      NULLIF(p_enrollment->>'guardian1_name',''),
      NULLIF(p_enrollment->>'student_escola','')
    );
  EXCEPTION WHEN OTHERS THEN
    v_is_inad := false;
  END;

  -- Regra: permite exceção se meses_inadim = 1 e o cliente confirmou (p_enrollment.inad_override_1m)
  v_allow_override := (
    (v_is_inad = true) AND COALESCE(v_meses, 0) = 1 AND (
      CASE
        WHEN p_enrollment ? 'inad_override_1m' THEN
          lower(nullif(trim(p_enrollment->>'inad_override_1m'),'')) IN ('true','1','t','on','yes')
        ELSE false
      END
    )
  );

  IF v_is_inad AND NOT v_allow_override THEN
    RAISE EXCEPTION 'rematricula_bloqueada_inadimplencia: aluno em inadimplência (% meses, código %)', COALESCE(v_meses, 0), COALESCE(v_codigo, 'N/A')
      USING ERRCODE = 'P0001';
  END IF;

  IF v_allow_override THEN
    v_snap := jsonb_build_object('meses_inadim', v_meses, 'codigo_inadim', v_codigo);
  END IF;

  -- Inserção inalterada com adição dos campos de override/snapshot
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
    inad_override_1m_used, inad_snapshot
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

    now(), now(),
    v_allow_override, v_snap
  )
  RETURNING id INTO v_enrollment_id;

  -- Descontos (inalterado)
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
IS 'Finaliza matrícula; bloqueia inadimplente exceto 1 mês com confirmação (p_enrollment.inad_override_1m). Registra flags em enrollments.';

DO $$ BEGIN
  RAISE NOTICE '056_enroll_finalize_inad_override_1m applied.';
END $$;
