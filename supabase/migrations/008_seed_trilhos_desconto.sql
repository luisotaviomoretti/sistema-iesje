-- Seeds para Sistema de Trilhos de Desconto  
-- Implementação da Fase 1 - Dados Iniciais
-- Autor: Sistema IESJE
-- Data: 2025-01-01

-- ============================================================================
-- 1. INSERIR TRILHOS DE DESCONTO PADRÃO
-- ============================================================================

INSERT INTO trilhos_desconto (nome, titulo, descricao, icone, cor_primaria, cap_maximo, ordem_exibicao) VALUES
(
  'especial',
  'Desconto Especial',
  'Bolsas de filantropia e descontos para filhos de funcionários. Descontos exclusivos com percentuais altos, mas bloqueia outros tipos de desconto.',
  '🌟',
  '#8B5CF6', -- purple-600
  NULL, -- sem limite de cap
  1
),
(
  'combinado',
  'Regular + Negociação',
  'Combine descontos regulares (irmãos, pagamento à vista, outras cidades) com descontos comerciais até o limite permitido.',
  '📋',
  '#3B82F6', -- blue-600
  25.00,
  2
),
(
  'comercial',
  'Apenas Negociação',
  'Descontos comerciais baseados em CEP, adimplência e negociações especiais com flexibilidade comercial.',
  '🤝',
  '#F59E0B', -- amber-500
  12.00,
  3
);

-- ============================================================================
-- 2. INSERIR REGRAS DE COMPATIBILIDADE
-- ============================================================================

-- TRILHO ESPECIAL: Apenas categorias especiais, sem combinação
INSERT INTO regras_trilhos (trilho_id, categoria_permitida, pode_combinar_com, prioridade, restricao_especial) VALUES
(
  (SELECT id FROM trilhos_desconto WHERE nome = 'especial'),
  'especial'::categoria_desconto,
  ARRAY[]::categoria_desconto[], -- não combina com nenhuma outra categoria
  1,
  'Descontos especiais são exclusivos - ao selecionar um, bloqueia todas as outras categorias'
);

-- TRILHO COMBINADO: Regulares + Negociação
INSERT INTO regras_trilhos (trilho_id, categoria_permitida, pode_combinar_com, prioridade, restricao_especial) VALUES
(
  (SELECT id FROM trilhos_desconto WHERE nome = 'combinado'),
  'regular'::categoria_desconto,
  ARRAY['negociacao'::categoria_desconto], -- pode combinar com negociação
  1,
  'Descontos regulares podem ser combinados com até 2 descontos de negociação'
),
(
  (SELECT id FROM trilhos_desconto WHERE nome = 'combinado'),
  'negociacao'::categoria_desconto,
  ARRAY['regular'::categoria_desconto], -- pode combinar com regular
  2,
  'Descontos de negociação complementam os regulares até o cap do trilho'
);

-- TRILHO COMERCIAL: Apenas negociação
INSERT INTO regras_trilhos (trilho_id, categoria_permitida, pode_combinar_com, prioridade, restricao_especial) VALUES
(
  (SELECT id FROM trilhos_desconto WHERE nome = 'comercial'),
  'negociacao'::categoria_desconto,
  ARRAY[]::categoria_desconto[], -- não combina com outras categorias
  1,
  'Foco em flexibilidade comercial com cap reduzido para negociações ágeis'
);

-- ============================================================================
-- 3. INSERIR CONFIGURAÇÃO INICIAL DE CAPS
-- ============================================================================

INSERT INTO config_caps (
  cap_with_secondary,
  cap_without_secondary,
  cap_especial_maximo,
  vigencia_inicio,
  observacoes
) VALUES (
  25.00, -- Trilho Combinado: até 25%
  12.00, -- Trilho Comercial: até 12%
  100.00, -- Trilho Especial: até 100% (teórico)
  CURRENT_DATE,
  'Configuração inicial do sistema de trilhos - pode ser ajustada pelo administrador'
);

-- ============================================================================
-- 4. ATUALIZAR TIPOS DE DESCONTO EXISTENTES
-- ============================================================================

-- Garantir que todos os tipos de desconto tenham categoria definida
-- (caso alguns estejam NULL após migração anterior)

-- Atualizar descontos especiais
UPDATE tipos_desconto SET categoria = 'especial' 
WHERE codigo IN ('PASS', 'PBS', 'COL', 'SAE', 'ABI', 'ABP') 
  AND (categoria IS NULL OR categoria != 'especial');

-- Atualizar descontos regulares  
UPDATE tipos_desconto SET categoria = 'regular'
WHERE codigo IN ('IIR', 'RES', 'PAV')
  AND (categoria IS NULL OR categoria != 'regular');

-- Atualizar descontos de negociação
UPDATE tipos_desconto SET categoria = 'negociacao'
WHERE codigo IN ('CEP10', 'CEP5', 'ADIM2', 'COM_EXTRA')
  AND (categoria IS NULL OR categoria != 'negociacao');

-- ============================================================================
-- 5. CRIAR DADOS DE EXEMPLO PARA DESENVOLVIMENTO
-- ============================================================================

-- Apenas em ambiente de desenvolvimento - comentar em produção
/*
-- Inserir algumas matrículas de exemplo com trilhos
UPDATE matriculas SET 
  trilho_escolhido = 'regular',
  cap_aplicado = 15.00,
  trilho_metadata = '{"trilho_selecionado_em": "2025-01-01", "descontos_aplicados": ["IIR", "PAV"], "validado_automaticamente": true}'
WHERE id IN (
  SELECT id FROM matriculas 
  WHERE trilho_escolhido IS NULL 
  LIMIT 3
);

UPDATE matriculas SET 
  trilho_escolhido = 'comercial', 
  cap_aplicado = 8.00,
  trilho_metadata = '{"trilho_selecionado_em": "2025-01-01", "descontos_aplicados": ["CEP10"], "validado_automaticamente": true}'
WHERE id IN (
  SELECT id FROM matriculas 
  WHERE trilho_escolhido IS NULL 
  LIMIT 2
);
*/

-- ============================================================================
-- 6. FUNÇÕES UTILITÁRIAS PARA SEEDS
-- ============================================================================

-- Função para obter estatísticas dos trilhos
CREATE OR REPLACE FUNCTION get_trilhos_stats()
RETURNS TABLE (
  trilho_nome VARCHAR(50),
  trilho_titulo VARCHAR(100),
  total_regras INTEGER,
  categorias_permitidas TEXT[],
  cap_maximo DECIMAL(5,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.nome,
    t.titulo,
    COUNT(r.id)::INTEGER as total_regras,
    ARRAY_AGG(DISTINCT r.categoria_permitida::TEXT) as categorias_permitidas,
    t.cap_maximo
  FROM trilhos_desconto t
  LEFT JOIN regras_trilhos r ON t.id = r.trilho_id
  WHERE t.ativo = true
  GROUP BY t.id, t.nome, t.titulo, t.cap_maximo, t.ordem_exibicao
  ORDER BY t.ordem_exibicao;
END;
$$ LANGUAGE plpgsql;

-- Função para validar integridade dos seeds
CREATE OR REPLACE FUNCTION validate_trilhos_seeds()
RETURNS BOOLEAN AS $$
DECLARE
  trilhos_count INTEGER;
  regras_count INTEGER;
  config_count INTEGER;
  is_valid BOOLEAN := true;
BEGIN
  -- Verificar se todos os trilhos foram criados
  SELECT COUNT(*) INTO trilhos_count FROM trilhos_desconto WHERE ativo = true;
  IF trilhos_count != 3 THEN
    RAISE WARNING 'Esperado 3 trilhos ativos, encontrado %', trilhos_count;
    is_valid := false;
  END IF;
  
  -- Verificar se todas as regras foram criadas
  SELECT COUNT(*) INTO regras_count FROM regras_trilhos;
  IF regras_count < 4 THEN -- mínimo 4 regras
    RAISE WARNING 'Esperado pelo menos 4 regras, encontrado %', regras_count;
    is_valid := false;
  END IF;
  
  -- Verificar se configuração foi criada
  SELECT COUNT(*) INTO config_count FROM config_caps;
  IF config_count = 0 THEN
    RAISE WARNING 'Nenhuma configuração de cap encontrada';
    is_valid := false;
  END IF;
  
  -- Verificar integridade referencial
  IF EXISTS (
    SELECT 1 FROM regras_trilhos r
    LEFT JOIN trilhos_desconto t ON r.trilho_id = t.id
    WHERE t.id IS NULL
  ) THEN
    RAISE WARNING 'Encontradas regras órfãs (sem trilho correspondente)';
    is_valid := false;
  END IF;
  
  RETURN is_valid;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. EXECUTAR VALIDAÇÕES
-- ============================================================================

-- Executar validação dos seeds
DO $$
DECLARE
  is_valid BOOLEAN;
  stats_record RECORD;
BEGIN
  -- Validar integridade
  SELECT validate_trilhos_seeds() INTO is_valid;
  
  IF is_valid THEN
    RAISE NOTICE '✅ Seeds dos trilhos inseridos com sucesso!';
    
    -- Exibir estatísticas
    RAISE NOTICE '';
    RAISE NOTICE '📊 ESTATÍSTICAS DOS TRILHOS:';
    RAISE NOTICE '═══════════════════════════════';
    
    FOR stats_record IN SELECT * FROM get_trilhos_stats()
    LOOP
      RAISE NOTICE '🎯 %: % (Cap: %)', 
        stats_record.trilho_nome,
        stats_record.trilho_titulo,
        COALESCE(stats_record.cap_maximo::TEXT || '%', 'Sem limite');
      RAISE NOTICE '   Categorias: %', array_to_string(stats_record.categorias_permitidas, ', ');
    END LOOP;
    
  ELSE
    RAISE EXCEPTION '❌ Erro na validação dos seeds dos trilhos';
  END IF;
END $$;

-- ============================================================================
-- 8. LIMPEZA DE FUNÇÕES TEMPORÁRIAS (OPCIONAL)
-- ============================================================================

-- Remover funções utilitárias se não forem mais necessárias
-- DROP FUNCTION IF EXISTS get_trilhos_stats();
-- DROP FUNCTION IF EXISTS validate_trilhos_seeds();

-- ============================================================================
-- VERIFICAÇÃO FINAL DOS DADOS
-- ============================================================================

-- Exibir resumo final dos dados inseridos
SELECT 
  'trilhos_desconto' as tabela,
  COUNT(*) as registros,
  COUNT(*) FILTER (WHERE ativo = true) as ativos
FROM trilhos_desconto

UNION ALL

SELECT 
  'regras_trilhos' as tabela,
  COUNT(*) as registros,
  COUNT(*) as ativos
FROM regras_trilhos

UNION ALL

SELECT 
  'config_caps' as tabela,
  COUNT(*) as registros,
  COUNT(*) FILTER (WHERE vigencia_fim IS NULL OR vigencia_fim >= CURRENT_DATE) as ativos
FROM config_caps

ORDER BY tabela;