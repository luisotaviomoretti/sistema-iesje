-- =====================================================
-- MIGRATION: 030_update_view_enrollment_discounts_add_tag.sql
-- DESCRIÇÃO: Atualiza view v_enrollment_discounts_student para incluir tag_matricula
-- DATA: 2025-09-10
-- =====================================================

DROP VIEW IF EXISTS public.v_enrollment_discounts_student;

CREATE VIEW public.v_enrollment_discounts_student AS
SELECT
  d.id                             AS discount_row_id,
  d.enrollment_id,
  e.student_cpf,
  e.student_name,
  e.series_id,
  e.series_name,
  e.track_id,
  e.track_name,
  d.discount_id,
  d.discount_code,
  d.discount_name,
  d.discount_category,
  d.percentage_applied,
  d.value_applied,
  d.created_at                     AS discount_created_at,
  e.created_at                     AS enrollment_created_at,
  e.status,
  e.approval_level,
  e.approval_status,
  e.tag_matricula                  AS tag_matricula
FROM public.enrollment_discounts d
JOIN public.enrollments e
  ON e.id = d.enrollment_id;

COMMENT ON VIEW public.v_enrollment_discounts_student IS
'Relatório: descontos aplicados por matrícula com CPF, dados do aluno e tag_matricula. Herda RLS das tabelas base.';

