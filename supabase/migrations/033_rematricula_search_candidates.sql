-- =====================================================
-- MIGRATION: 033_rematricula_search_candidates.sql
-- DESCRIÇÃO: Implementa RPC de busca de candidatos à Rematrícula
--            baseada em previous_year_students, com token de seleção
--            e índices de performance (TRGM + unaccent).
--            Segurança não disruptiva: SECURITY INVOKER (respeita RLS).
-- DATA: 2025-09-13
-- =====================================================

-- Extensões necessárias (idempotentes)
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Helper simples: normalização (lower + unaccent)
CREATE OR REPLACE FUNCTION public.norm_text(p_text text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = extensions, public
AS $$
  SELECT unaccent(lower(coalesce(p_text, '')));
$$;

-- Emissor de selection_token com HMAC (base64(payload).hex(hmac))
-- OBS: Em produção, substituir por implementação com pgjwt ou chave segura
-- obtida de uma tabela/variável segura. Aqui usamos system_config (se existir)
-- via função get_system_config; fallback para 'dev-secret' se ausente.
CREATE OR REPLACE FUNCTION public.issue_selection_token(
  p_student_id uuid,
  p_student_escola text,
  p_year int,
  p_ttl_seconds int DEFAULT 900  -- 15 minutos
) RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
SET search_path = extensions, public
AS $$
DECLARE
  v_now int := extract(epoch from now());
  v_exp int := v_now + GREATEST(60, LEAST(p_ttl_seconds, 3600));
  v_secret text;
  v_payload jsonb;
  v_payload_b64 text;
  v_sig text;
BEGIN
  -- Tentar obter segredo de system_config (opcional)
  BEGIN
    SELECT public.get_system_config('rematricula.selection_token.secret') INTO v_secret;
  EXCEPTION WHEN OTHERS THEN
    v_secret := NULL;
  END;
  IF v_secret IS NULL OR length(trim(v_secret)) = 0 THEN
    v_secret := 'dev-secret'; -- fallback não-disruptivo (trocar em PROD)
  END IF;

  v_payload := jsonb_build_object(
    'sid', p_student_id,
    'sc', coalesce(p_student_escola, ''),
    'yr', p_year,
    'iat', v_now,
    'exp', v_exp
  );
  v_payload_b64 := encode(convert_to(v_payload::text, 'UTF8'), 'base64');
  v_sig := encode(hmac(v_payload_b64::text, v_secret::text, 'sha256'), 'hex');
  RETURN v_payload_b64 || '.' || v_sig;
END;
$$;

-- RPC principal: rematricula_search_candidates
-- Segurança: SECURITY INVOKER (respeita RLS existentes nas tabelas)
-- Nota: academic_year em previous_year_students é TEXT; convertendo ano para TEXT
CREATE OR REPLACE FUNCTION public.rematricula_search_candidates(
  q text,
  search_scope text,
  year int,
  limit_ int DEFAULT 20,
  offset_ int DEFAULT 0,
  school_id_hint uuid DEFAULT NULL
)
RETURNS TABLE (
  student_id uuid,
  student_name text,
  student_slug text,
  selection_token text,
  guardian_names text[],
  school_name text,
  grade_name text,
  reenrollment_status text,
  reenrollment_id uuid,
  has_reenrollment boolean
) AS $$
  WITH params AS (
    SELECT
      CASE WHEN length(coalesce(trim(q), '')) >= 2 THEN true ELSE false END AS pass_min_chars,
      GREATEST(10, LEAST(coalesce(limit_, 20), 50)) AS lim,
      GREATEST(0, coalesce(offset_, 0)) AS off,
      CASE WHEN lower(coalesce(search_scope,'student')) IN ('guardian') THEN 'guardian' ELSE 'student' END AS scope,
      norm_text(q) AS nq,
      coalesce(year, extract(year from now())::int) AS y
  )
  SELECT
    pys.id AS student_id,
    pys.student_name,
    -- slug exibicional (sem PII): lower(unaccent), remove não-alfa e hifena
    regexp_replace(norm_text(pys.student_name), '[^a-z0-9]+', '-', 'g') AS student_slug,
    public.issue_selection_token(pys.id, pys.student_escola, p.y, 900) AS selection_token,
    ARRAY_REMOVE(ARRAY[pys.guardian1_name, pys.guardian2_name], NULL) AS guardian_names,
    pys.student_escola AS school_name,
    pys.series_name AS grade_name,
    COALESCE(einfo.status, 'NONE') AS reenrollment_status,
    einfo.id AS reenrollment_id,
    (einfo.status IS NOT NULL) AS has_reenrollment
  FROM public.previous_year_students pys
  CROSS JOIN params p
  LEFT JOIN LATERAL (
    SELECT e.id,
           CASE
             WHEN e.status IN ('submitted','approved') AND e.deleted_at IS NULL THEN 'COMPLETED'
             WHEN e.status IN ('draft') AND date_part('year', e.created_at)::int = p.y AND e.deleted_at IS NULL THEN 'IN_PROGRESS'
             ELSE NULL
           END AS status
    FROM public.enrollments e
    WHERE norm_text(e.student_name) = norm_text(pys.student_name)
      AND COALESCE(e.student_escola, '') = COALESCE(pys.student_escola, '')
      AND date_part('year', e.created_at)::int = p.y
    ORDER BY e.created_at DESC
    LIMIT 1
  ) AS einfo ON true
  WHERE p.pass_min_chars
    AND pys.academic_year = (p.y - 1)::text
    AND (
      (p.scope = 'student' AND norm_text(pys.student_name) LIKE '%' || p.nq || '%')
      OR
      (p.scope = 'guardian' AND (
         norm_text(pys.guardian1_name) LIKE '%' || p.nq || '%'
         OR norm_text(pys.guardian2_name) LIKE '%' || p.nq || '%'
      ))
    )
  ORDER BY
    -- Quando TRGM disponível, a similaridade melhora ordenação; fallback: nome
    CASE
      WHEN p.scope = 'student' THEN word_similarity(norm_text(pys.student_name), p.nq)
      ELSE GREATEST(word_similarity(norm_text(pys.guardian1_name), p.nq), word_similarity(norm_text(pys.guardian2_name), p.nq))
    END DESC NULLS LAST,
    pys.student_name ASC
  LIMIT (SELECT GREATEST(10, LEAST(COALESCE(limit_, 20), 50)))
  OFFSET (SELECT GREATEST(0, COALESCE(offset_, 0)));
$$ LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = extensions, public;

-- Grants mínimos: permitir execução para authenticated/anon conforme políticas
GRANT EXECUTE ON FUNCTION public.rematricula_search_candidates(text, text, int, int, int, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.issue_selection_token(uuid, text, int, int) TO anon, authenticated;

-- Índices para acelerar busca
-- previous_year_students: nome do aluno (TRGM) e chave escola/ano
CREATE INDEX IF NOT EXISTS idx_pys_student_name_trgm
  ON public.previous_year_students USING gin ((norm_text(student_name)) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_pys_guardian1_name_trgm
  ON public.previous_year_students USING gin ((norm_text(guardian1_name)) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_pys_guardian2_name_trgm
  ON public.previous_year_students USING gin ((norm_text(guardian2_name)) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_pys_school_year
  ON public.previous_year_students (student_escola, academic_year);

-- Observações de segurança:
-- 1) SECURITY INVOKER mantém RLS vigente (não amplia acesso).
-- 2) selection_token usa chave de system_config se disponível; trocar por segredo gerenciado em PROD.
-- 3) Não retornamos CPF ou dados sensíveis (apenas nomes e metadados necessários).
-- =====================================================
-- Fim da migração 033
