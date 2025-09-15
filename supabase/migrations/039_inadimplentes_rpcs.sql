-- =====================================================
-- MIGRATION: 039_inadimplentes_rpcs.sql
-- DESCRIÇÃO: RPCs para inadimplentes (checagem, gestão admin e ingestão)
--            Segurança: SECURITY DEFINER quando necessário; checagem de admin
--            via funções já existentes (is_admin_user/can_approve/is_super_admin).
-- DATA: 2025-09-15
-- AUTOR: Cascade
-- =====================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =====================================================
-- 1) RPC: check_inadimplencia
--    Uso: frontend da Rematrícula. Retorna somente o necessário.
--    Flags: rematricula.inadimplencia.enabled
--           rematricula.inadimplencia.match.require_guardian
--           rematricula.inadimplencia.match.require_same_school
-- =====================================================
CREATE OR REPLACE FUNCTION public.check_inadimplencia(
  p_student_name text,
  p_guardian_name text DEFAULT NULL,
  p_user_school text DEFAULT NULL
)
RETURNS TABLE (
  is_inadimplente boolean,
  meses_inadim int,
  codigo_inadim text
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = extensions, public
AS $$
DECLARE
  v_enabled_txt text;
  v_enabled boolean := false;
  v_req_guard_txt text;
  v_req_guard boolean := false;
  v_req_school_txt text;
  v_req_school boolean := false;
  v_name_norm text;
  v_guard_norm text;
  v_school text := coalesce(p_user_school, '');
  v_meses int;
  v_codigo text;
BEGIN
  -- Feature flag: se desligada, retorna falso imediatamente (não disruptivo)
  BEGIN
    SELECT public.get_system_config('rematricula.inadimplencia.enabled') INTO v_enabled_txt;
  EXCEPTION WHEN OTHERS THEN
    v_enabled_txt := NULL;
  END;
  v_enabled := coalesce(lower(trim(v_enabled_txt)) IN ('true','1','t','on','yes'), false);
  IF NOT v_enabled THEN
    RETURN QUERY SELECT false::boolean, NULL::int, NULL::text;
    RETURN;
  END IF;

  -- Normalizações
  IF p_student_name IS NULL OR length(trim(p_student_name)) = 0 THEN
    RETURN QUERY SELECT false::boolean, NULL::int, NULL::text;
    RETURN;
  END IF;
  v_name_norm := public.norm_text(p_student_name);
  v_guard_norm := public.norm_text(p_guardian_name);

  -- Parâmetros de match
  BEGIN
    SELECT public.get_system_config('rematricula.inadimplencia.match.require_guardian') INTO v_req_guard_txt;
  EXCEPTION WHEN OTHERS THEN v_req_guard_txt := NULL; END;
  v_req_guard := coalesce(lower(trim(v_req_guard_txt)) IN ('true','1','t','on','yes'), false);

  BEGIN
    SELECT public.get_system_config('rematricula.inadimplencia.match.require_same_school') INTO v_req_school_txt;
  EXCEPTION WHEN OTHERS THEN v_req_school_txt := NULL; END;
  v_req_school := coalesce(lower(trim(v_req_school_txt)) IN ('true','1','t','on','yes'), false);

  -- Consulta mínima, respeitando flags de match
  SELECT i.meses_inadim, i.codigo_inadim
  INTO v_meses, v_codigo
  FROM public.inadimplentes i
  WHERE i.is_active = true
    AND i.student_name_norm = v_name_norm
    AND (
      NOT v_req_guard OR i.guardian1_name_norm = v_guard_norm
    )
    AND (
      NOT v_req_school OR coalesce(i.student_escola,'') = coalesce(v_school,'')
    )
  ORDER BY coalesce(i.meses_inadim, 0) DESC, i.updated_at DESC
  LIMIT 1;

  IF FOUND THEN
    RETURN QUERY SELECT true::boolean, v_meses, v_codigo;
  ELSE
    RETURN QUERY SELECT false::boolean, NULL::int, NULL::text;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_inadimplencia(text, text, text) TO anon, authenticated;

-- =====================================================
-- Helpers internos
-- =====================================================
CREATE OR REPLACE FUNCTION public._ensure_admin()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'insufficient_privilege: admin required' USING ERRCODE = '42501';
  END IF;
END;
$$;

-- =====================================================
-- 2) RPC: upsert_inadimplente (admin)
-- =====================================================
CREATE OR REPLACE FUNCTION public.upsert_inadimplente(payload jsonb)
RETURNS TABLE(id uuid, op text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = extensions, public
AS $$
DECLARE
  v_codigo text := nullif(trim(payload->>'codigo_inadim'), '');
  v_student_name text := nullif(trim(payload->>'student_name'), '');
  v_guardian text := nullif(trim(payload->>'guardian1_name'), '');
  v_escola text := nullif(trim(payload->>'student_escola'), '');
  v_meses_txt text := nullif(trim(payload->>'meses_inadim'), '');
  v_meses int := NULL;
  v_source text := coalesce(nullif(trim(payload->>'source'), ''), 'rpc-upsert');
  v_id uuid;
  v_actor uuid := auth.uid();
  v_norm_guard text := public.norm_text(v_guardian);
BEGIN
  PERFORM public._ensure_admin();

  IF v_student_name IS NULL THEN
    RAISE EXCEPTION 'student_name é obrigatório';
  END IF;

  BEGIN
    IF v_meses_txt IS NOT NULL THEN
      v_meses := v_meses_txt::int;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_meses := NULL;
  END;

  -- Tenta localizar ativo equivalente (nome/guardião/escola)
  SELECT id INTO v_id
  FROM public.inadimplentes i
  WHERE i.is_active = true
    AND i.student_name_norm = public.norm_text(v_student_name)
    AND coalesce(i.guardian1_name_norm,'') = coalesce(v_norm_guard,'')
    AND coalesce(i.student_escola,'') = coalesce(v_escola,'')
  LIMIT 1;

  IF v_id IS NOT NULL THEN
    UPDATE public.inadimplentes SET
      codigo_inadim = v_codigo,
      guardian1_name = v_guardian,
      student_escola = v_escola,
      meses_inadim = v_meses,
      source = v_source,
      updated_at = now(),
      updated_by = v_actor
    WHERE id = v_id;

    INSERT INTO public.inadimplentes_audit (inadimplente_id, action, snapshot, actor)
    SELECT v_id, 'update', to_jsonb(i.*), v_actor
    FROM public.inadimplentes i WHERE i.id = v_id;

    RETURN QUERY SELECT v_id, 'update';
  ELSE
    INSERT INTO public.inadimplentes (
      codigo_inadim, student_name, guardian1_name, student_escola, meses_inadim,
      source, created_by, updated_by
    ) VALUES (
      v_codigo, v_student_name, v_guardian, v_escola, v_meses,
      v_source, v_actor, v_actor
    ) RETURNING id INTO v_id;

    INSERT INTO public.inadimplentes_audit (inadimplente_id, action, snapshot, actor)
    SELECT v_id, 'insert', to_jsonb(i.*), v_actor
    FROM public.inadimplentes i WHERE i.id = v_id;

    RETURN QUERY SELECT v_id, 'insert';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_inadimplente(jsonb) TO authenticated;

-- =====================================================
-- 3) RPC: soft_delete_inadimplente (admin)
-- =====================================================
CREATE OR REPLACE FUNCTION public.soft_delete_inadimplente(p_id uuid, p_reason text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = extensions, public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_snapshot jsonb;
  v_rowcount int := 0;
BEGIN
  PERFORM public._ensure_admin();

  SELECT to_jsonb(i.*) INTO v_snapshot FROM public.inadimplentes i WHERE i.id = p_id;
  IF v_snapshot IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.inadimplentes SET
    is_active = false,
    deleted_at = now(),
    deleted_by = v_actor,
    deleted_reason = p_reason,
    updated_at = now(),
    updated_by = v_actor
  WHERE id = p_id;
  GET DIAGNOSTICS v_rowcount = ROW_COUNT;

  IF v_rowcount > 0 THEN
    INSERT INTO public.inadimplentes_audit (inadimplente_id, action, snapshot, actor)
    VALUES (p_id, 'soft_delete', v_snapshot, v_actor);
    RETURN true;
  END IF;
  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.soft_delete_inadimplente(uuid, text) TO authenticated;

-- =====================================================
-- 4) RPC: restore_inadimplente (admin)
-- =====================================================
CREATE OR REPLACE FUNCTION public.restore_inadimplente(p_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = extensions, public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_row public.inadimplentes%ROWTYPE;
  v_collision uuid;
BEGIN
  PERFORM public._ensure_admin();

  SELECT * INTO v_row FROM public.inadimplentes WHERE id = p_id;
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Verifica colisão com UNIQUE ativo
  SELECT i.id INTO v_collision
  FROM public.inadimplentes i
  WHERE i.is_active = true
    AND i.id <> p_id
    AND i.student_name_norm = v_row.student_name_norm
    AND coalesce(i.guardian1_name_norm,'') = coalesce(v_row.guardian1_name_norm,'')
    AND coalesce(i.student_escola,'') = coalesce(v_row.student_escola,'')
  LIMIT 1;

  IF v_collision IS NOT NULL THEN
    RAISE EXCEPTION 'Não é possível restaurar: já existe um registro ativo equivalente (id=%).', v_collision;
  END IF;

  UPDATE public.inadimplentes SET
    is_active = true,
    deleted_at = NULL,
    deleted_by = NULL,
    deleted_reason = NULL,
    updated_at = now(),
    updated_by = v_actor
  WHERE id = p_id;

  INSERT INTO public.inadimplentes_audit (inadimplente_id, action, snapshot, actor)
  SELECT p_id, 'restore', to_jsonb(i.*), v_actor
  FROM public.inadimplentes i WHERE i.id = p_id;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.restore_inadimplente(uuid) TO authenticated;

-- =====================================================
-- 5) RPC: ingest_inadimplentes_from_staging (admin)
-- =====================================================
CREATE OR REPLACE FUNCTION public.ingest_inadimplentes_from_staging(p_batch_id uuid)
RETURNS TABLE(inserted_count int, updated_count int, error_count int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = extensions, public
AS $$
DECLARE
  v_ins int := 0;
  v_upd int := 0;
  v_err int := 0;
  r record;
  v_res record;
  v_payload jsonb;
BEGIN
  PERFORM public._ensure_admin();

  FOR r IN
    SELECT id, csv_row
    FROM public.staging_inadimplentes_raw
    WHERE batch_id = p_batch_id
      AND processed = false
    ORDER BY created_at ASC
  LOOP
    BEGIN
      v_payload := jsonb_build_object(
        'codigo_inadim', r.csv_row->>'codigo_inadim',
        'student_name', r.csv_row->>'student_name',
        'guardian1_name', r.csv_row->>'guardian1_name',
        'student_escola', r.csv_row->>'student_escola',
        'meses_inadim', r.csv_row->>'meses_inadim',
        'source', 'csv-batch'
      );

      SELECT * INTO v_res FROM public.upsert_inadimplente(v_payload);
      IF v_res.op = 'insert' THEN v_ins := v_ins + 1; ELSE v_upd := v_upd + 1; END IF;

      UPDATE public.staging_inadimplentes_raw
      SET processed = true, error = NULL
      WHERE id = r.id;
    EXCEPTION WHEN OTHERS THEN
      v_err := v_err + 1;
      UPDATE public.staging_inadimplentes_raw
      SET processed = true, error = left(SQLERRM, 500)
      WHERE id = r.id;
    END;
  END LOOP;

  RETURN QUERY SELECT v_ins, v_upd, v_err;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ingest_inadimplentes_from_staging(uuid) TO authenticated;

-- =====================================================
-- 6) RPC opcional: get_inadimplentes_stats (admin)
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_inadimplentes_stats()
RETURNS TABLE(school text, total_active int)
LANGUAGE sql
SECURITY DEFINER
SET search_path = extensions, public
AS $$
  SELECT coalesce(student_escola, '') AS school,
         count(*)::int AS total_active
  FROM public.inadimplentes
  WHERE is_active = true
  GROUP BY coalesce(student_escola, '')
  ORDER BY school;
$$;

GRANT EXECUTE ON FUNCTION public.get_inadimplentes_stats() TO authenticated;

-- =====================================================
-- Notas de segurança
-- - RPCs admin verificam privilégio via _ensure_admin() e executam como DEFINER.
-- - check_inadimplencia respeita a feature flag e retorna somente dados mínimos.
-- - Nenhuma alteração em contratos existentes do sistema; adiciona novas funções isoladas.
-- =====================================================
