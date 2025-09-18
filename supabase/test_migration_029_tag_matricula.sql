-- =====================================================
-- SCRIPT DE TESTE PARA MIGRAÇÃO 029 (tag_matricula)
-- Execute após aplicar a migração 029 para validações rápidas
-- =====================================================

-- 1) Verificar se o tipo ENUM existe
SELECT
  t.typname AS type_name,
  n.nspname AS schema_name
FROM pg_type t
JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE t.typname = 'tag_matricula_enum' AND n.nspname = 'public';

-- 2) Verificar se a coluna foi criada corretamente
SELECT
  column_name,
  data_type,
  udt_name,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'enrollments'
  AND column_name = 'tag_matricula';

-- 3) Verificar se o índice existe
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'enrollments'
  AND indexname = 'idx_enrollments_tag_matricula';

-- 4) Comentário da coluna (documentação)
SELECT
  pgd.description AS column_comment
FROM pg_catalog.pg_statio_all_tables AS st
INNER JOIN pg_catalog.pg_description pgd ON pgd.objoid = st.relid
INNER JOIN information_schema.columns c ON c.table_schema = st.schemaname
  AND c.table_name = st.relname
  AND c.ordinal_position = pgd.objsubid
WHERE c.table_schema = 'public'
  AND c.table_name = 'enrollments'
  AND c.column_name = 'tag_matricula';

-- 5) Resumo final
SELECT 'ENUM type exists' AS check_type,
       CASE WHEN EXISTS (
         SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
         WHERE t.typname = 'tag_matricula_enum' AND n.nspname = 'public'
       ) THEN 'OK' ELSE 'MISSING' END AS status
UNION ALL
SELECT 'Column exists',
       CASE WHEN EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'enrollments' AND column_name = 'tag_matricula'
       ) THEN 'OK' ELSE 'MISSING' END
UNION ALL
SELECT 'Index exists',
       CASE WHEN EXISTS (
         SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'enrollments' AND indexname = 'idx_enrollments_tag_matricula'
       ) THEN 'OK' ELSE 'MISSING' END;

-- 6) Exemplo de inserção (NÃO EXECUTAR EM PRODUÇÃO)
-- Mantido comentado para evitar efeitos colaterais.
/*
INSERT INTO public.enrollments (
  student_name,
  student_cpf,
  student_birth_date,
  series_id,
  series_name,
  track_id,
  track_name,
  guardian1_name,
  guardian1_cpf,
  guardian1_phone,
  guardian1_email,
  guardian1_relationship,
  address_cep,
  address_street,
  address_number,
  address_district,
  address_city,
  address_state,
  base_value,
  final_monthly_value,
  tag_matricula
) VALUES (
  'Teste Tag',
  '00000000000',
  '2010-01-01',
  'test-series',
  'Test Series',
  'test-track',
  'Test Track',
  'Guardian Test',
  '11111111111',
  '11999999999',
  'test@example.com',
  'Pai',
  '01310-100',
  'Av. Paulista',
  '1000',
  'Bela Vista',
  'São Paulo',
  'SP',
  1000.00,
  850.00,
  'novo_aluno'
)
RETURNING id, tag_matricula, created_at;
*/

