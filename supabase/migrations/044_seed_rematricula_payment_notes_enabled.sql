-- =====================================================
-- MIGRATION: 044_seed_rematricula_payment_notes_enabled.sql
-- DESCRIÇÃO: Garante a chave de rollout da Rematrícula — Observações da Forma de
--            Pagamento em system_configs e define como habilitada (true).
--            Idempotente e não-disruptiva (UPSERT com guarda).
-- DATA: 2025-09-18
-- AUTOR: Cascade
-- =====================================================

-- Cria a chave caso não exista, ou atualiza para 'true' caso exista com outro valor
INSERT INTO public.system_configs (chave, valor, descricao, categoria, updated_by)
VALUES (
  'rematricula.payment_notes.enabled',
  'true',
  'Habilita o campo de Observações sobre a Forma de Pagamento no fluxo de Rematrícula (UI + RPC + PDF).',
  'financeiro',
  'migration-044'
)
ON CONFLICT (chave)
DO UPDATE SET
  valor = EXCLUDED.valor,
  updated_by = EXCLUDED.updated_by,
  updated_at = NOW(),
  descricao = COALESCE(public.system_configs.descricao, EXCLUDED.descricao),
  categoria = COALESCE(public.system_configs.categoria, EXCLUDED.categoria)
WHERE public.system_configs.valor IS DISTINCT FROM 'true';

-- Aviso informativo pós-seed
DO $$
DECLARE v_now text; v_val text; BEGIN
  SELECT valor INTO v_val FROM public.system_configs WHERE chave = 'rematricula.payment_notes.enabled';
  v_now := to_char(now(), 'YYYY-MM-DD HH24:MI:SS');
  RAISE NOTICE '044_seed_rematricula_payment_notes_enabled: chave=rematricula.payment_notes.enabled valor=% em %', v_val, v_now;
END $$;
