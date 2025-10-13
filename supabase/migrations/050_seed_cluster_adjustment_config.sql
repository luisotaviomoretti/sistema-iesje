-- =====================================================
-- MIGRAÇÃO 050: Seed - Ajuste por Cluster (Rematrícula)
-- =====================================================
-- Fase: F1
-- Data: 2025-10-13
-- Objetivo: Criar chaves de configuração para ajuste por cluster do desconto sugerido
-- Categoria: financeiro
-- Dark Launch: Valores default (enabled=false, ajustes=0) não causam impacto

-- =====================================================
-- Inserir 5 chaves (idempotente)
-- =====================================================

INSERT INTO system_configs (chave, valor, categoria, descricao, updated_by)
VALUES
  -- 1. Flag global de habilitação
  (
    'rematricula.cluster_adjustment.enabled',
    'false',
    'financeiro',
    'Habilita o ajuste por cluster do desconto sugerido na Rematrícula. Quando false, nenhum ajuste é aplicado (dark launch).',
    'system'
  ),
  
  -- 2. Cluster A: 5% a <10%
  (
    'rematricula.cluster_adjustment.cluster_a.adjustment',
    '0',
    'financeiro',
    'Ajuste em pontos percentuais para o Cluster A (descontos de 5% a <10% do ano anterior). Valores negativos reduzem, positivos aumentam. Exemplo: -2 reduz 8% para 6%.',
    'system'
  ),
  
  -- 3. Cluster B: 10% a <15%
  (
    'rematricula.cluster_adjustment.cluster_b.adjustment',
    '0',
    'financeiro',
    'Ajuste em pontos percentuais para o Cluster B (descontos de 10% a <15% do ano anterior). Valores negativos reduzem, positivos aumentam. Exemplo: +2 aumenta 12% para 14%.',
    'system'
  ),
  
  -- 4. Cluster C: 15% a <20%
  (
    'rematricula.cluster_adjustment.cluster_c.adjustment',
    '0',
    'financeiro',
    'Ajuste em pontos percentuais para o Cluster C (descontos de 15% a <20% do ano anterior). Valores negativos reduzem, positivos aumentam. Exemplo: -1 reduz 18% para 17%.',
    'system'
  ),
  
  -- 5. Cluster D: ≥20%
  (
    'rematricula.cluster_adjustment.cluster_d.adjustment',
    '0',
    'financeiro',
    'Ajuste em pontos percentuais para o Cluster D (descontos ≥20% do ano anterior). Valores negativos reduzem, positivos aumentam. Exemplo: -5 reduz 22% para 17%.',
    'system'
  )
ON CONFLICT (chave) DO NOTHING;

-- =====================================================
-- Comentários para Auditoria
-- =====================================================

COMMENT ON TABLE system_configs IS 'Configurações globais do sistema. Usa cache no frontend (memória + localStorage, TTL 5min).';

-- =====================================================
-- Verificação Rápida
-- =====================================================

DO $$
DECLARE
  total_chaves int;
BEGIN
  SELECT COUNT(*) INTO total_chaves
  FROM system_configs
  WHERE chave LIKE 'rematricula.cluster_adjustment%';
  
  IF total_chaves = 5 THEN
    RAISE NOTICE '✅ Sucesso: 5 chaves de ajuste por cluster criadas.';
  ELSIF total_chaves > 0 THEN
    RAISE WARNING '⚠️ Apenas % chave(s) criada(s). Esperado: 5.', total_chaves;
  ELSE
    RAISE EXCEPTION '❌ ERRO: Nenhuma chave criada.';
  END IF;
END $$;

-- =====================================================
-- Notas de Implementação
-- =====================================================

-- ORDEM DE APLICAÇÃO (importante):
--   1. Desconto do ano anterior (previous_year_students.total_discount_percentage)
--   2. Ajuste por Cluster (esta feature)
--   3. CAP do Desconto Sugerido (se habilitado)
--
-- EXCEÇÕES (bypassam tudo):
--   - Trilho Especial: preserva desconto integral
--   - MACOM: usa seleção manual
--
-- VALIDAÇÕES:
--   - Ajuste: -100 a +100 pontos percentuais
--   - Resultado final: clamped entre 0% e 100%
--
-- ROLLBACK:
--   Desabilitar via painel admin (/admin/configuracoes) ou:
--   UPDATE system_configs SET valor = 'false' WHERE chave = 'rematricula.cluster_adjustment.enabled';
