-- =====================================================
-- MIGRATION: 048_enable_series_annual_values_flags.sql
-- DESCRIÇÃO: Cria/atualiza chaves de feature flag para Valores Anuais das Séries
--            em system_configs de forma idempotente e segura.
--            Defaults conservadores: enabled = false, input_mode = 'monthly'.
-- DATA: 2025-09-18
-- =====================================================

DO $$
DECLARE
  v_table boolean;
  v_exists_enabled boolean;
  v_exists_mode boolean;
  v_val_enabled text;
  v_val_mode text;
BEGIN
  -- 1) Garantir existência da tabela system_configs
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'system_configs'
  ) INTO v_table;

  IF NOT v_table THEN
    RAISE NOTICE '048_series_flags: tabela public.system_configs inexistente; nada a fazer';
    RETURN;
  END IF;

  -- 2) series.annual_values.enabled (default: false)
  SELECT EXISTS (
    SELECT 1 FROM public.system_configs WHERE chave = 'series.annual_values.enabled'
  ) INTO v_exists_enabled;

  IF v_exists_enabled THEN
    UPDATE public.system_configs
       SET valor = 'false',
           updated_by = 'migration-048'
     WHERE chave = 'series.annual_values.enabled'
       AND COALESCE(valor, '') <> 'false';
  ELSE
    INSERT INTO public.system_configs (chave, valor, descricao, categoria, updated_by)
    VALUES ('series.annual_values.enabled', 'false', 'Ativa leitura/exibição de valores ANUAIS das séries no FE. Dark Launch seguro: false = nada muda.', 'geral', 'migration-048');
  END IF;

  -- 3) series.annual_values.input_mode (default: 'monthly')
  SELECT EXISTS (
    SELECT 1 FROM public.system_configs WHERE chave = 'series.annual_values.input_mode'
  ) INTO v_exists_mode;

  IF v_exists_mode THEN
    -- Se valor inválido/diferente de {annual,monthly}, normalizar para 'monthly'
    UPDATE public.system_configs
       SET valor = CASE WHEN valor IN ('annual','monthly') THEN valor ELSE 'monthly' END,
           updated_by = 'migration-048'
     WHERE chave = 'series.annual_values.input_mode'
       AND (COALESCE(valor, '') NOT IN ('annual','monthly'));
  ELSE
    INSERT INTO public.system_configs (chave, valor, descricao, categoria, updated_by)
    VALUES ('series.annual_values.input_mode', 'monthly', 'Modo de entrada preferido para /admin/series: annual|monthly. Default conservador: monthly.', 'geral', 'migration-048');
  END IF;

  -- 4) Notas
  SELECT valor INTO v_val_enabled FROM public.system_configs WHERE chave = 'series.annual_values.enabled';
  SELECT valor INTO v_val_mode FROM public.system_configs WHERE chave = 'series.annual_values.input_mode';
  RAISE NOTICE '048_series_flags: enabled = %, input_mode = %', v_val_enabled, v_val_mode;
END $$;
