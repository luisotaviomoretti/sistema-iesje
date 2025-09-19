-- =====================================================
-- MIGRATION: 047_add_annual_fields_to_series.sql
-- DESCRIÇÃO: Adiciona campos de valores ANUAIS à tabela series
--            com backfill seguro a partir dos campos mensais e
--            constraints condicionais (não disruptivas).
--            Mantém arquitetura e RLS inalteradas.
-- AUTOR: Cascade
-- DATA: 2025-09-18
-- =====================================================

-- 1) Adicionar colunas ANUAIS (permitir NULL inicialmente para rollout seguro)
ALTER TABLE series ADD COLUMN IF NOT EXISTS valor_anual_sem_material NUMERIC(12,2);
ALTER TABLE series ADD COLUMN IF NOT EXISTS valor_anual_material NUMERIC(12,2);
ALTER TABLE series ADD COLUMN IF NOT EXISTS valor_anual_com_material NUMERIC(12,2);

-- 2) Comentários das colunas
COMMENT ON COLUMN series.valor_anual_sem_material IS 'Valor anual da mensalidade SEM material';
COMMENT ON COLUMN series.valor_anual_material IS 'Valor anual do material escolar';
COMMENT ON COLUMN series.valor_anual_com_material IS 'Valor anual da mensalidade COM material';

-- 3) Backfill: popular valores anuais a partir dos campos mensais (x12) somente quando NULL
UPDATE series
SET
  valor_anual_sem_material = COALESCE(valor_anual_sem_material, ROUND(valor_mensal_sem_material * 12, 2)),
  valor_anual_material     = COALESCE(valor_anual_material, ROUND(valor_material * 12, 2)),
  valor_anual_com_material = COALESCE(valor_anual_com_material, ROUND(valor_mensal_com_material * 12, 2))
WHERE
  (valor_anual_sem_material IS NULL OR valor_anual_material IS NULL OR valor_anual_com_material IS NULL);

-- 4) Constraints condicionais (não impedem inserts que ainda não preencham os campos anuais)
--    a) Anual COM material >= Anual SEM material (quando todos estiverem preenchidos)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'check_series_valor_anual_com_maior_sem'
      AND table_name = 'series'
      AND constraint_type = 'CHECK'
  ) THEN
    ALTER TABLE series
      ADD CONSTRAINT check_series_valor_anual_com_maior_sem
      CHECK (
        (valor_anual_com_material IS NULL AND valor_anual_sem_material IS NULL AND valor_anual_material IS NULL)
        OR (valor_anual_com_material >= valor_anual_sem_material)
      );
  END IF;
END $$;

--    b) Lógica do material: (com - sem) ~= material (tolerância 10%), quando todos estiverem preenchidos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'check_series_valor_anual_material_logica'
      AND table_name = 'series'
      AND constraint_type = 'CHECK'
  ) THEN
    ALTER TABLE series
      ADD CONSTRAINT check_series_valor_anual_material_logica
      CHECK (
        (valor_anual_com_material IS NULL AND valor_anual_sem_material IS NULL AND valor_anual_material IS NULL)
        OR (ABS((valor_anual_com_material - valor_anual_sem_material) - valor_anual_material) <= (valor_anual_material * 0.1))
      );
  END IF;
END $$;

-- 5) Observações de rollout
-- - Colunas permanecem NULLABLE nesta fase (F1) para não quebrar fluxos existentes que
--   só preenchem mensais.
-- - UI e serviços continuarão exibindo anuais com fallback (mensal x12) até F2.
-- - Após estabilização, uma migração posterior poderá tornar os campos NOT NULL e/ou
--   apertar as constraints, se a estratégia desejar input anual como fonte da verdade.

-- Fim da migração 047
