-- =====================================================
-- MIGRATION: 046_enable_novomatricula_payment_notes_flag.sql
-- DESCRIÇÃO: Habilita a flag novomatricula.payment_notes.enabled em todos os ambientes
--            de forma idempotente e segura. Caso a chave não exista, cria com valor 'true'.
-- DATA: 2025-09-18
-- =====================================================

DO $$
DECLARE v_exists boolean; v_table boolean; v_val text; BEGIN
  -- Garantir existência da tabela
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'system_configs'
  ) INTO v_table;

  IF NOT v_table THEN
    RAISE NOTICE '046_enable_flag: tabela public.system_configs inexistente; nada a fazer';
    RETURN;
  END IF;

  -- Se existir, atualizar para 'true' (somente se diferente)
  SELECT EXISTS (
    SELECT 1 FROM public.system_configs WHERE chave = 'novomatricula.payment_notes.enabled'
  ) INTO v_exists;

  IF v_exists THEN
    UPDATE public.system_configs
       SET valor = 'true',
           updated_by = 'migration-046'
     WHERE chave = 'novomatricula.payment_notes.enabled'
       AND COALESCE(valor, '') <> 'true';
  ELSE
    -- Criar com categoria segura 'geral'
    INSERT INTO public.system_configs (chave, valor, descricao, categoria, updated_by)
    VALUES ('novomatricula.payment_notes.enabled', 'true', 'Habilita o campo de Observações sobre a Forma de Pagamento na Nova Matrícula (UI + PDF).', 'geral', 'migration-046');
  END IF;

  SELECT valor INTO v_val FROM public.system_configs WHERE chave = 'novomatricula.payment_notes.enabled';
  RAISE NOTICE '046_enable_flag: novomatricula.payment_notes.enabled = %', v_val;
END $$;
