-- =====================================================
-- MIGRATION: 042_add_payment_notes_to_enrollments.sql
-- DESCRIÇÃO: Adiciona campos de observações de pagamento (texto livre)
--            e auditoria leve na tabela public.enrollments.
--            Implementação não-disruptiva, totalmente opcional.
-- DATA: 2025-09-18
-- =====================================================

-- Colunas opcionais (backward-compatible)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'enrollments'
  ) THEN
    ALTER TABLE public.enrollments
      ADD COLUMN IF NOT EXISTS payment_notes TEXT,
      ADD COLUMN IF NOT EXISTS payment_notes_by UUID,
      ADD COLUMN IF NOT EXISTS payment_notes_at TIMESTAMP WITH TIME ZONE;
  ELSE
    RAISE NOTICE '042_add_payment_notes_to_enrollments: tabela public.enrollments não encontrada; aplique 014_create_enrollments.sql antes. Operação ignorada (no-op).';
  END IF;
END $$;

-- Constraint de tamanho máximo (1000 chars), criada apenas se não existir
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'enrollments'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
      WHERE con.conname = 'chk_enrollments_payment_notes_len'
        AND rel.relname = 'enrollments'
        AND nsp.nspname = 'public'
        AND con.contype = 'c'
    ) THEN
      ALTER TABLE public.enrollments
        ADD CONSTRAINT chk_enrollments_payment_notes_len
        CHECK (payment_notes IS NULL OR char_length(payment_notes) <= 1000);
    END IF;
  ELSE
    RAISE NOTICE '042_add_payment_notes_to_enrollments: tabela public.enrollments não encontrada (constraint não criada).';
  END IF;
END $$;

-- Comentários explicativos
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'enrollments'
  ) THEN
    COMMENT ON COLUMN public.enrollments.payment_notes IS 'Observações sobre a forma de pagamento (exibidas no PDF quando presente). Máximo de 1000 caracteres.';
    COMMENT ON COLUMN public.enrollments.payment_notes_by IS 'UUID do usuário (auth.uid()) que preencheu as observações, quando aplicável.';
    COMMENT ON COLUMN public.enrollments.payment_notes_at IS 'Data/hora em que as observações foram registradas.';
  ELSE
    RAISE NOTICE '042_add_payment_notes_to_enrollments: tabela public.enrollments não encontrada (comentários não aplicados).';
  END IF;
END $$;

-- Estatística informativa pós-migração
DO $$
DECLARE
  v_cols INTEGER := NULL;
  v_has_check BOOLEAN := NULL;
  v_table_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'enrollments'
  ) INTO v_table_exists;

  IF v_table_exists THEN
    SELECT COUNT(*) INTO v_cols
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'enrollments'
      AND column_name IN ('payment_notes','payment_notes_by','payment_notes_at');

    SELECT EXISTS (
      SELECT 1
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
      WHERE con.conname = 'chk_enrollments_payment_notes_len'
        AND rel.relname = 'enrollments'
        AND nsp.nspname = 'public'
        AND con.contype = 'c'
    ) INTO v_has_check;

    RAISE NOTICE '042_add_payment_notes_to_enrollments: colunas criadas/verificadas = % (esperado 3).', v_cols;
    RAISE NOTICE '042_add_payment_notes_to_enrollments: constraint de tamanho presente = %.', v_has_check;
  ELSE
    RAISE NOTICE '042_add_payment_notes_to_enrollments: tabela public.enrollments não encontrada; nada para verificar.';
  END IF;
END $$;

-- =====================================================
-- ROLLBACK (apenas DEV)
-- Observação: execute somente em ambientes de desenvolvimento
-- =====================================================
-- ALTER TABLE public.enrollments DROP CONSTRAINT IF EXISTS chk_enrollments_payment_notes_len;
-- ALTER TABLE public.enrollments DROP COLUMN IF EXISTS payment_notes_at;
-- ALTER TABLE public.enrollments DROP COLUMN IF EXISTS payment_notes_by;
-- ALTER TABLE public.enrollments DROP COLUMN IF EXISTS payment_notes;
