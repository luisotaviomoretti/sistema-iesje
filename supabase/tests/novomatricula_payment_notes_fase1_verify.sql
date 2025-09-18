-- =====================================================
-- TEST: novomatricula_payment_notes_fase1_verify.sql
-- Objetivo: Verificar que as colunas e a constraint de Observações de Pagamento
--           já existem em public.enrollments (reutilização da migração 042).
-- Execução: rodar no SQL Editor após aplicar a migração 042
-- =====================================================

-- 1) Verificar existência das colunas novas
SELECT 
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'enrollments' AND column_name = 'payment_notes'
  ) AS has_payment_notes,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'enrollments' AND column_name = 'payment_notes_by'
  ) AS has_payment_notes_by,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'enrollments' AND column_name = 'payment_notes_at'
  ) AS has_payment_notes_at;

-- 2) Verificar existência da constraint de comprimento (<= 1000)
SELECT EXISTS (
  SELECT 1
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE con.conname = 'chk_enrollments_payment_notes_len'
    AND rel.relname = 'enrollments'
    AND nsp.nspname = 'public'
    AND con.contype = 'c'
) AS has_length_check;

-- 3) (Opcional) Checar comentários nas colunas
SELECT 
  col.attname AS column_name,
  d.description AS comment
FROM pg_catalog.pg_attribute col
LEFT JOIN pg_catalog.pg_description d ON d.objoid = col.attrelid AND d.objsubid = col.attnum
WHERE col.attrelid = 'public.enrollments'::regclass
  AND col.attname IN ('payment_notes','payment_notes_by','payment_notes_at')
ORDER BY col.attname;
