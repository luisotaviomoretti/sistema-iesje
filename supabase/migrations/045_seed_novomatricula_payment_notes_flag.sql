-- =====================================================
-- MIGRATION: 045_seed_novomatricula_payment_notes_flag.sql
-- DESCRIÇÃO: Garante a chave de feature flag para Aluno Novo — Observações da Forma de Pagamento
--            em system_configs com default 'false' (apenas INSERT quando ausente).
--            Idempotente e não-disruptiva.
-- DATA: 2025-09-18
-- AUTOR: Cascade
-- =====================================================

-- Cria a chave apenas se não existir (não força override em ambientes que já ativaram manualmente)
INSERT INTO public.system_configs (chave, valor, descricao, categoria, updated_by)
SELECT 'novomatricula.payment_notes.enabled', 'false', 'Habilita o campo de Observações sobre a Forma de Pagamento na Nova Matrícula (UI + PDF).', 'geral', 'migration-045'
WHERE NOT EXISTS (
  SELECT 1 FROM public.system_configs WHERE chave = 'novomatricula.payment_notes.enabled'
);

-- Aviso informativo pós-seed
DO $$
DECLARE v_now text; v_val text; BEGIN
  SELECT valor INTO v_val FROM public.system_configs WHERE chave = 'novomatricula.payment_notes.enabled';
  v_now := to_char(now(), 'YYYY-MM-DD HH24:MI:SS');
  RAISE NOTICE '045_seed_novomatricula_payment_notes_flag: chave=novomatricula.payment_notes.enabled valor=% em %', v_val, v_now;
END $$;
