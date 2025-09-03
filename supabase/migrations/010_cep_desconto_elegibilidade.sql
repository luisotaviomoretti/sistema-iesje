-- =====================================================
-- MIGRATION: 010_cep_desconto_elegibilidade.sql
-- DESCRIÇÃO: Sistema de elegibilidade entre CEPs e tipos de desconto
-- DATA: 2025-09-01
-- AUTOR: Claude Code
-- FUNCIONALIDADE: Controlar quais descontos são válidos por categoria de CEP
-- =====================================================

-- =====================================================
-- 1. TABELA PRINCIPAL DE ELEGIBILIDADE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.cep_desconto_elegibilidade (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    categoria_cep TEXT NOT NULL,
    tipo_desconto_codigo TEXT NOT NULL,
    elegivel BOOLEAN DEFAULT TRUE,
    motivo_restricao TEXT,
    observacoes TEXT,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT cep_elegibilidade_categoria_valid CHECK (categoria_cep IN ('fora', 'baixa', 'alta')),
    CONSTRAINT cep_elegibilidade_unique UNIQUE(categoria_cep, tipo_desconto_codigo),
    
    -- Foreign Key para tipos_desconto
    CONSTRAINT fk_tipo_desconto FOREIGN KEY (tipo_desconto_codigo) 
        REFERENCES public.tipos_desconto(codigo) 
        ON DELETE CASCADE ON UPDATE CASCADE
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_cep_elegibilidade_categoria ON public.cep_desconto_elegibilidade(categoria_cep);
CREATE INDEX IF NOT EXISTS idx_cep_elegibilidade_codigo ON public.cep_desconto_elegibilidade(tipo_desconto_codigo);
CREATE INDEX IF NOT EXISTS idx_cep_elegibilidade_ativo ON public.cep_desconto_elegibilidade(ativo);
CREATE INDEX IF NOT EXISTS idx_cep_elegibilidade_lookup ON public.cep_desconto_elegibilidade(categoria_cep, tipo_desconto_codigo);

-- =====================================================
-- 2. TRIGGER PARA UPDATED_AT (COM VERIFICAÇÃO)
-- =====================================================
DROP TRIGGER IF EXISTS trigger_cep_elegibilidade_updated_at ON public.cep_desconto_elegibilidade;
CREATE TRIGGER trigger_cep_elegibilidade_updated_at
    BEFORE UPDATE ON public.cep_desconto_elegibilidade
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- =====================================================
-- 3. AUDIT TRIGGER (COM VERIFICAÇÃO)
-- =====================================================
DROP TRIGGER IF EXISTS trigger_cep_elegibilidade_audit ON public.cep_desconto_elegibilidade;
CREATE TRIGGER trigger_cep_elegibilidade_audit
    AFTER INSERT OR UPDATE OR DELETE ON public.cep_desconto_elegibilidade
    FOR EACH ROW
    EXECUTE FUNCTION public.audit_changes();

-- =====================================================
-- 4. SEED DATA - REGRAS INICIAIS DE ELEGIBILIDADE
-- =====================================================

-- Primeiro, vamos verificar quais códigos de desconto realmente existem
DO $$
DECLARE
    existing_codes TEXT[];
BEGIN
    -- Buscar todos os códigos existentes
    SELECT ARRAY_AGG(codigo) INTO existing_codes 
    FROM public.tipos_desconto WHERE ativo = TRUE;
    
    RAISE NOTICE 'Códigos de desconto encontrados: %', existing_codes;
END $$;

-- Inserir regras apenas para códigos que existem
-- Usar função para verificar existência antes de inserir
CREATE OR REPLACE FUNCTION public.insert_eligibility_if_exists(
    p_categoria TEXT,
    p_codigo TEXT, 
    p_elegivel BOOLEAN,
    p_motivo TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    -- Verificar se o código existe
    IF EXISTS (SELECT 1 FROM public.tipos_desconto WHERE codigo = p_codigo AND ativo = TRUE) THEN
        INSERT INTO public.cep_desconto_elegibilidade 
            (categoria_cep, tipo_desconto_codigo, elegivel, motivo_restricao)
        VALUES (p_categoria, p_codigo, p_elegivel, p_motivo)
        ON CONFLICT (categoria_cep, tipo_desconto_codigo) 
        DO UPDATE SET 
            elegivel = EXCLUDED.elegivel,
            motivo_restricao = EXCLUDED.motivo_restricao;
    ELSE
        RAISE NOTICE 'Código % não existe, pulando regra para categoria %', p_codigo, p_categoria;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 🏠 MAIOR RENDA (Poços de Caldas - Bairros nobres)
-- Elegíveis para Maior Renda
SELECT public.insert_eligibility_if_exists('alta', 'IIR', TRUE);           -- Irmãos
SELECT public.insert_eligibility_if_exists('alta', 'PASS', TRUE);          -- Prof. IESJE
SELECT public.insert_eligibility_if_exists('alta', 'PBS', TRUE);           -- Prof. Outras Inst.
SELECT public.insert_eligibility_if_exists('alta', 'COL', TRUE);           -- Func. IESJE SAAE
SELECT public.insert_eligibility_if_exists('alta', 'SAE', TRUE);           -- Func. Outros SAAE
SELECT public.insert_eligibility_if_exists('alta', 'PAV', TRUE);           -- Pagamento à Vista
SELECT public.insert_eligibility_if_exists('alta', 'ADIM2', TRUE);         -- Adimplente
SELECT public.insert_eligibility_if_exists('alta', 'COM_EXTRA', TRUE);     -- Negociação

-- Inelegíveis para Maior Renda
SELECT public.insert_eligibility_if_exists('alta', 'RES', FALSE, 'Desconto específico para residentes fora de Poços de Caldas');
SELECT public.insert_eligibility_if_exists('alta', 'CEP10', FALSE, 'Desconto específico para CEPs fora de Poços de Caldas');
SELECT public.insert_eligibility_if_exists('alta', 'CEP5', FALSE, 'Desconto específico para bairros de menor renda em Poços de Caldas');
SELECT public.insert_eligibility_if_exists('alta', 'ABI', FALSE, 'Bolsa integral reservada para famílias de menor renda');
SELECT public.insert_eligibility_if_exists('alta', 'ABP', FALSE, 'Bolsa parcial reservada para famílias de menor renda');

-- 🏘️ MENOR RENDA (Poços de Caldas - Bairros populares)  
-- Elegíveis para Menor Renda
SELECT public.insert_eligibility_if_exists('baixa', 'IIR', TRUE);          -- Irmãos
SELECT public.insert_eligibility_if_exists('baixa', 'PASS', TRUE);         -- Prof. IESJE
SELECT public.insert_eligibility_if_exists('baixa', 'PBS', TRUE);          -- Prof. Outras Inst.
SELECT public.insert_eligibility_if_exists('baixa', 'COL', TRUE);          -- Func. IESJE SAAE
SELECT public.insert_eligibility_if_exists('baixa', 'SAE', TRUE);          -- Func. Outros SAAE
SELECT public.insert_eligibility_if_exists('baixa', 'CEP5', TRUE);         -- CEP Menor Renda (automático)
SELECT public.insert_eligibility_if_exists('baixa', 'PAV', TRUE);          -- Pagamento à Vista
SELECT public.insert_eligibility_if_exists('baixa', 'ADIM2', TRUE);        -- Adimplente
SELECT public.insert_eligibility_if_exists('baixa', 'ABI', TRUE);          -- Bolsa Integral
SELECT public.insert_eligibility_if_exists('baixa', 'ABP', TRUE);          -- Bolsa Parcial
SELECT public.insert_eligibility_if_exists('baixa', 'COM_EXTRA', TRUE);    -- Negociação

-- Inelegíveis para Menor Renda
SELECT public.insert_eligibility_if_exists('baixa', 'RES', FALSE, 'Desconto específico para residentes fora de Poços de Caldas');
SELECT public.insert_eligibility_if_exists('baixa', 'CEP10', FALSE, 'Desconto específico para CEPs fora de Poços de Caldas');

-- 🌍 FORA DE POÇOS DE CALDAS
-- Elegíveis para Fora de Poços
SELECT public.insert_eligibility_if_exists('fora', 'IIR', TRUE);           -- Irmãos (se irmão também estuda)
SELECT public.insert_eligibility_if_exists('fora', 'RES', TRUE);           -- Outras Cidades (específico)
SELECT public.insert_eligibility_if_exists('fora', 'CEP10', TRUE);         -- CEP Fora (automático)
SELECT public.insert_eligibility_if_exists('fora', 'PASS', TRUE);          -- Prof. IESJE (se trabalha no IESJE)
SELECT public.insert_eligibility_if_exists('fora', 'PBS', TRUE);           -- Prof. Outras Inst.
SELECT public.insert_eligibility_if_exists('fora', 'COL', TRUE);           -- Func. IESJE SAAE (se trabalha no IESJE)
SELECT public.insert_eligibility_if_exists('fora', 'SAE', TRUE);           -- Func. Outros SAAE
SELECT public.insert_eligibility_if_exists('fora', 'PAV', TRUE);           -- Pagamento à Vista
SELECT public.insert_eligibility_if_exists('fora', 'ADIM2', TRUE);         -- Adimplente
SELECT public.insert_eligibility_if_exists('fora', 'COM_EXTRA', TRUE);     -- Negociação

-- Inelegíveis para Fora de Poços  
SELECT public.insert_eligibility_if_exists('fora', 'CEP5', FALSE, 'Desconto específico para bairros de menor renda em Poços de Caldas');
SELECT public.insert_eligibility_if_exists('fora', 'ABI', FALSE, 'Bolsas filantrópicas restritas a residentes de Poços de Caldas');
SELECT public.insert_eligibility_if_exists('fora', 'ABP', FALSE, 'Bolsas filantrópicas restritas a residentes de Poços de Caldas');

-- =====================================================
-- 5. FUNÇÕES RPC PARA CONSULTAS
-- =====================================================

-- Função para obter descontos elegíveis por categoria de CEP
CREATE OR REPLACE FUNCTION public.get_eligible_discounts(
    p_categoria_cep TEXT
) RETURNS TABLE (
    codigo TEXT,
    descricao TEXT,
    percentual_fixo INTEGER,
    eh_variavel BOOLEAN,
    nivel_aprovacao_requerido TEXT,
    categoria TEXT,
    elegivel BOOLEAN,
    motivo_restricao TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        td.codigo,
        td.descricao,
        td.percentual_fixo,
        td.eh_variavel,
        td.nivel_aprovacao_requerido,
        td.categoria,
        COALESCE(cde.elegivel, TRUE) as elegivel,
        cde.motivo_restricao
    FROM public.tipos_desconto td
    LEFT JOIN public.cep_desconto_elegibilidade cde 
        ON td.codigo = cde.tipo_desconto_codigo 
        AND cde.categoria_cep = p_categoria_cep
        AND cde.ativo = TRUE
    WHERE td.ativo = TRUE
    ORDER BY 
        COALESCE(cde.elegivel, TRUE) DESC, -- Elegíveis primeiro
        td.categoria,
        td.codigo;
END;
$$ LANGUAGE plpgsql;

-- Função para verificar elegibilidade específica
CREATE OR REPLACE FUNCTION public.check_discount_eligibility(
    p_categoria_cep TEXT,
    p_tipo_desconto_codigo TEXT
) RETURNS TABLE (
    elegivel BOOLEAN,
    motivo_restricao TEXT,
    sugestoes TEXT[]
) AS $$
DECLARE
    v_elegivel BOOLEAN := TRUE;
    v_motivo TEXT := NULL;
    v_sugestoes TEXT[] := '{}';
BEGIN
    -- Verificar elegibilidade
    SELECT cde.elegivel, cde.motivo_restricao
    INTO v_elegivel, v_motivo
    FROM public.cep_desconto_elegibilidade cde
    WHERE cde.categoria_cep = p_categoria_cep
    AND cde.tipo_desconto_codigo = p_tipo_desconto_codigo
    AND cde.ativo = TRUE;
    
    -- Se não encontrou regra específica, assumir elegível
    IF v_elegivel IS NULL THEN
        v_elegivel := TRUE;
    END IF;
    
    -- Se não elegível, buscar sugestões (descontos similares elegíveis)
    IF v_elegivel = FALSE THEN
        SELECT ARRAY_AGG(td.codigo)
        INTO v_sugestoes
        FROM public.tipos_desconto td
        JOIN public.cep_desconto_elegibilidade cde 
            ON td.codigo = cde.tipo_desconto_codigo
        WHERE cde.categoria_cep = p_categoria_cep
        AND cde.elegivel = TRUE
        AND cde.ativo = TRUE
        AND td.ativo = TRUE
        AND td.categoria = (
            SELECT categoria FROM public.tipos_desconto 
            WHERE codigo = p_tipo_desconto_codigo
        )
        LIMIT 3;
    END IF;
    
    RETURN QUERY SELECT v_elegivel, v_motivo, v_sugestoes;
END;
$$ LANGUAGE plpgsql;

-- Função para estatísticas de elegibilidade
CREATE OR REPLACE FUNCTION public.get_eligibility_stats()
RETURNS TABLE (
    categoria_cep TEXT,
    total_descontos INTEGER,
    elegiveis INTEGER,
    inelegiveis INTEGER,
    percentual_elegibilidade DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cde.categoria_cep,
        COUNT(*)::INTEGER as total_descontos,
        COUNT(CASE WHEN cde.elegivel THEN 1 END)::INTEGER as elegiveis,
        COUNT(CASE WHEN NOT cde.elegivel THEN 1 END)::INTEGER as inelegiveis,
        ROUND(
            (COUNT(CASE WHEN cde.elegivel THEN 1 END)::DECIMAL / COUNT(*)) * 100, 
            2
        ) as percentual_elegibilidade
    FROM public.cep_desconto_elegibilidade cde
    WHERE cde.ativo = TRUE
    GROUP BY cde.categoria_cep
    ORDER BY cde.categoria_cep;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. VIEWS PARA FACILITAR CONSULTAS
-- =====================================================

-- View consolidada de elegibilidade
CREATE OR REPLACE VIEW public.view_cep_desconto_matrix AS
SELECT 
    td.codigo,
    td.descricao,
    td.percentual_fixo,
    td.categoria as tipo_categoria,
    COALESCE(
        BOOL_AND(CASE WHEN cde.categoria_cep = 'alta' THEN cde.elegivel END), 
        TRUE
    ) as elegivel_alta_renda,
    COALESCE(
        BOOL_AND(CASE WHEN cde.categoria_cep = 'baixa' THEN cde.elegivel END), 
        TRUE
    ) as elegivel_baixa_renda,
    COALESCE(
        BOOL_AND(CASE WHEN cde.categoria_cep = 'fora' THEN cde.elegivel END), 
        TRUE
    ) as elegivel_fora_pocos,
    STRING_AGG(
        CASE WHEN NOT cde.elegivel THEN cde.categoria_cep END, 
        ', '
    ) as categorias_restritas
FROM public.tipos_desconto td
LEFT JOIN public.cep_desconto_elegibilidade cde 
    ON td.codigo = cde.tipo_desconto_codigo 
    AND cde.ativo = TRUE
WHERE td.ativo = TRUE
GROUP BY td.codigo, td.descricao, td.percentual_fixo, td.categoria
ORDER BY td.categoria, td.codigo;

-- =====================================================
-- 7. COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================
COMMENT ON TABLE public.cep_desconto_elegibilidade IS 
'Tabela que controla quais tipos de desconto são elegíveis para cada categoria de CEP';

COMMENT ON COLUMN public.cep_desconto_elegibilidade.categoria_cep IS 
'Categoria do CEP: alta (maior renda), baixa (menor renda), fora (fora de Poços)';

COMMENT ON COLUMN public.cep_desconto_elegibilidade.elegivel IS 
'TRUE = desconto disponível para esta categoria, FALSE = restrito';

COMMENT ON COLUMN public.cep_desconto_elegibilidade.motivo_restricao IS 
'Explicação do motivo da restrição quando elegivel = FALSE';

COMMENT ON FUNCTION public.get_eligible_discounts(TEXT) IS 
'Retorna todos os descontos e sua elegibilidade para uma categoria de CEP';

COMMENT ON FUNCTION public.check_discount_eligibility(TEXT, TEXT) IS 
'Verifica se um desconto específico é elegível para uma categoria de CEP';

COMMENT ON VIEW public.view_cep_desconto_matrix IS 
'Visão consolidada da matriz de elegibilidade CEP x Descontos';

-- =====================================================
-- 8. DADOS DE AUDITORIA
-- =====================================================
INSERT INTO public.audit_logs (
    tabela, 
    registro_id, 
    acao, 
    dados_novos,
    timestamp
) VALUES (
    'system_migration',
    '010_cep_desconto_elegibilidade',
    'CREATE',
    jsonb_build_object(
        'message', 'Sistema de elegibilidade CEP x Descontos implementado',
        'migration', '010_cep_desconto_elegibilidade.sql',
        'features', jsonb_build_array(
            'Tabela cep_desconto_elegibilidade criada',
            'Regras iniciais de elegibilidade inseridas',
            'Funções RPC para consultas implementadas',
            'Views de consulta criadas',
            'Sistema de auditoria configurado'
        ),
        'stats', jsonb_build_object(
            'total_rules_created', (
                SELECT COUNT(*) FROM public.cep_desconto_elegibilidade
            ),
            'categories_configured', 3,
            'discount_types_mapped', (
                SELECT COUNT(DISTINCT tipo_desconto_codigo) 
                FROM public.cep_desconto_elegibilidade
            )
        )
    ),
    NOW()
);

-- =====================================================
-- 9. LIMPEZA E VERIFICAÇÕES FINAIS
-- =====================================================

-- Remover função helper após uso
DROP FUNCTION IF EXISTS public.insert_eligibility_if_exists(TEXT, TEXT, BOOLEAN, TEXT);

-- Verificações finais
DO $$
DECLARE
    total_rules INTEGER;
    existing_codes TEXT[];
BEGIN
    -- Contar regras criadas
    SELECT COUNT(*) INTO total_rules FROM public.cep_desconto_elegibilidade;
    
    -- Mostrar códigos que foram processados
    SELECT ARRAY_AGG(DISTINCT tipo_desconto_codigo) INTO existing_codes 
    FROM public.cep_desconto_elegibilidade;
    
    -- Verificar se funções foram criadas
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_eligible_discounts') THEN
        RAISE EXCEPTION 'Função get_eligible_discounts não foi criada';
    END IF;
    
    RAISE NOTICE 'Sistema de elegibilidade CEP x Descontos implementado com sucesso!';
    RAISE NOTICE 'Total de regras criadas: %', total_rules;
    RAISE NOTICE 'Códigos de desconto processados: %', existing_codes;
    
    -- Aviso se poucos códigos foram encontrados
    IF total_rules < 10 THEN
        RAISE WARNING 'Apenas % regras foram criadas. Verifique se a migration 002_seed_data foi aplicada.', total_rules;
    END IF;
END $$;

-- =====================================================
-- FIM DA MIGRATION
-- =====================================================