-- =====================================================
-- MIGRATION: 009_update_cep_system.sql
-- DESCRIÇÃO: Atualizar sistema de CEPs para nova classificação
-- DATA: 2025-09-01
-- AUTOR: Claude Code
-- MUDANÇAS:
--   - Adicionar campo cidade para validação automática
--   - Marcar percentual_desconto como deprecated
--   - Atualizar constraints e comentários
--   - Preparar para nova lógica de classificação
-- =====================================================

-- =====================================================
-- 1. ADICIONAR CAMPO CIDADE (OPCIONAL)
-- =====================================================
ALTER TABLE public.cep_ranges 
ADD COLUMN IF NOT EXISTS cidade TEXT;

-- Índice para performance na busca por cidade
CREATE INDEX IF NOT EXISTS idx_cep_ranges_cidade ON public.cep_ranges(cidade);

-- =====================================================
-- 2. MARCAR PERCENTUAL_DESCONTO COMO DEPRECATED
-- =====================================================
-- Adicionar comentário indicando que o campo está deprecated
COMMENT ON COLUMN public.cep_ranges.percentual_desconto IS 
'DEPRECATED: Campo mantido para compatibilidade. Descontos agora são aplicados via sistema de trilhos.';

-- =====================================================
-- 3. ATUALIZAR CONSTRAINTS E VALIDAÇÕES
-- =====================================================
-- Remover constraint antiga de categoria se existir
ALTER TABLE public.cep_ranges DROP CONSTRAINT IF EXISTS cep_ranges_categoria_valid;

-- Adicionar nova constraint com descrições mais claras
ALTER TABLE public.cep_ranges 
ADD CONSTRAINT cep_ranges_categoria_valid 
CHECK (categoria IN ('fora', 'baixa', 'alta'));

-- =====================================================
-- 4. ATUALIZAR COMENTÁRIOS PARA NOVA LÓGICA
-- =====================================================
COMMENT ON COLUMN public.cep_ranges.categoria IS 
'Classificação: fora = Fora de Poços de Caldas, baixa = Menor Renda (Poços), alta = Maior Renda (Poços)';

COMMENT ON TABLE public.cep_ranges IS 
'Faixas de CEP e classificações. Sistema migrado: classificação apenas, descontos via trilhos.';

-- =====================================================
-- 5. ATUALIZAR DADOS EXISTENTES (OPCIONAL)
-- =====================================================
-- Preencher campo cidade baseado na categoria para dados existentes
UPDATE public.cep_ranges 
SET cidade = CASE 
    WHEN categoria = 'fora' THEN 'Outras Cidades'
    WHEN categoria IN ('baixa', 'alta') THEN 'Poços de Caldas'
    ELSE NULL
END
WHERE cidade IS NULL;

-- =====================================================
-- 6. FUNÇÃO HELPER PARA CLASSIFICAÇÃO AUTOMÁTICA
-- =====================================================
CREATE OR REPLACE FUNCTION public.auto_classify_cep_by_city(
    p_cidade TEXT
) RETURNS TEXT AS $$
BEGIN
    -- Se cidade não for Poços de Caldas, sempre será 'fora'
    IF LOWER(TRIM(p_cidade)) != 'poços de caldas' THEN
        RETURN 'fora';
    END IF;
    
    -- Se for Poços de Caldas, retorna NULL para permitir seleção manual
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Comentário da função
COMMENT ON FUNCTION public.auto_classify_cep_by_city(TEXT) IS 
'Função helper para classificação automática de CEP baseada na cidade obtida via ViaCEP';

-- =====================================================
-- 7. TRIGGER PARA AUDITORIA ATUALIZADA
-- =====================================================
-- O trigger de auditoria existente já cobrirá as mudanças
-- Apenas adicionamos um comentário sobre a migração

-- =====================================================
-- 8. DADOS DE TESTE/MIGRAÇÃO (OPCIONAL)
-- =====================================================
-- Inserir alguns exemplos de CEPs de outras cidades para teste
INSERT INTO public.cep_ranges (
    cep_inicio, 
    cep_fim, 
    categoria, 
    percentual_desconto,
    cidade,
    ativo
) VALUES
-- Exemplo: São Paulo
('01000000', '05999999', 'fora', 0, 'São Paulo', true),
-- Exemplo: Rio de Janeiro  
('20000000', '23799999', 'fora', 0, 'Rio de Janeiro', true),
-- Exemplo: Belo Horizonte
('30000000', '32999999', 'fora', 0, 'Belo Horizonte', true)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 9. LOG DA MIGRAÇÃO
-- =====================================================
INSERT INTO public.audit_logs (
    tabela, 
    registro_id, 
    acao, 
    dados_novos,
    timestamp
) VALUES (
    'system_migration',
    '009_update_cep_system',
    'CREATE',
    jsonb_build_object(
        'message', 'Sistema de CEPs atualizado para nova classificação',
        'migration', '009_update_cep_system.sql',
        'changes', jsonb_build_array(
            'Adicionado campo cidade',
            'Marcado percentual_desconto como deprecated', 
            'Atualizados constraints e comentários',
            'Criada função helper auto_classify_cep_by_city',
            'Preparado para integração com ViaCEP'
        )
    ),
    NOW()
);

-- =====================================================
-- 10. VERIFICAÇÕES DE INTEGRIDADE
-- =====================================================
-- Verificar se todos os registros têm categoria válida
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.cep_ranges 
        WHERE categoria NOT IN ('fora', 'baixa', 'alta')
    ) THEN
        RAISE WARNING 'Existem registros com categoria inválida na tabela cep_ranges';
    END IF;
    
    RAISE NOTICE 'Migração 009_update_cep_system concluída com sucesso!';
END $$;

-- =====================================================
-- FIM DA MIGRAÇÃO
-- =====================================================