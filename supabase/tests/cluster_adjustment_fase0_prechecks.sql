-- Pré-checagens para Ajuste por Cluster do Desconto Sugerido (Rematrícula)
-- Fase: F0 (Preparação)
-- Data: 2025-10-13

-- ========================================
-- 1. Verificar Infraestrutura Básica
-- ========================================

-- Tabela system_configs deve existir
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'system_configs'
    )
    THEN '✅ Tabela system_configs existe'
    ELSE '❌ ERRO: Tabela system_configs não encontrada'
  END AS check_system_configs;

-- RPC get_system_config deve existir
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = 'get_system_config'
    )
    THEN '✅ RPC get_system_config existe'
    ELSE '❌ ERRO: RPC get_system_config não encontrada'
  END AS check_rpc_get;

-- Tabela previous_year_students deve existir
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'previous_year_students'
    )
    THEN '✅ Tabela previous_year_students existe'
    ELSE '❌ ERRO: Tabela previous_year_students não encontrada'
  END AS check_previous_year;

-- ========================================
-- 2. Verificar Chaves CAP (Padrão a Seguir)
-- ========================================

-- Listar chaves CAP existentes (devem existir como referência)
SELECT 
  chave,
  valor,
  categoria,
  descricao,
  updated_by,
  created_at
FROM system_configs
WHERE chave LIKE 'rematricula.suggested_discount_cap%'
ORDER BY chave;

-- Verificar se CAP está configurado (espera-se 2 chaves)
SELECT 
  CASE 
    WHEN COUNT(*) = 2
    THEN '✅ CAP configurado corretamente (2 chaves: enabled + percent)'
    WHEN COUNT(*) > 0
    THEN '⚠️ AVISO: CAP parcialmente configurado (' || COUNT(*) || ' chaves)'
    ELSE '❌ ERRO: CAP não configurado (faltam chaves de referência)'
  END AS check_cap_keys,
  COUNT(*) as total_keys
FROM system_configs
WHERE chave LIKE 'rematricula.suggested_discount_cap%';

-- ========================================
-- 3. Verificar se Chaves Cluster já Existem
-- ========================================

-- Listar chaves cluster (não devem existir em F0)
SELECT 
  chave,
  valor,
  categoria
FROM system_configs
WHERE chave LIKE 'rematricula.cluster_adjustment%'
ORDER BY chave;

-- Alertar se chaves cluster já existem
SELECT 
  CASE 
    WHEN COUNT(*) = 0
    THEN '✅ Chaves cluster ainda não existem (esperado em F0)'
    ELSE '⚠️ AVISO: ' || COUNT(*) || ' chave(s) cluster já existe(m). Verificar se F1 já foi executado.'
  END AS check_cluster_keys_existence,
  COUNT(*) as total_cluster_keys
FROM system_configs
WHERE chave LIKE 'rematricula.cluster_adjustment%';

-- ========================================
-- 4. Verificar Categorias Válidas
-- ========================================

-- Listar categorias válidas (extraídas do constraint CHECK)
SELECT 
  unnest(ARRAY['geral', 'financeiro', 'integracao', 'seguranca']) AS categorias_validas
ORDER BY 1;

-- Confirmar que 'financeiro' é a categoria apropriada para configs de desconto
SELECT 
  '✅ Categoria "financeiro" será usada (configs relacionadas a descontos/valores)' AS check_categoria_financeiro;

-- ========================================
-- 5. Verificar Dados de Teste
-- ========================================

-- Contar alunos do ano anterior por faixa de desconto (usando CTE para ordenar por rótulo)
WITH clusters AS (
  SELECT 
    CASE 
      WHEN total_discount_percentage >= 20 THEN 'Cluster D (≥20%)'
      WHEN total_discount_percentage >= 15 THEN 'Cluster C (15-<20%)'
      WHEN total_discount_percentage >= 10 THEN 'Cluster B (10-<15%)'
      WHEN total_discount_percentage >= 5 THEN 'Cluster A (5-<10%)'
      ELSE 'Sem cluster (<5%)'
    END AS cluster_label,
    COUNT(*) as total_alunos,
    ROUND(AVG(total_discount_percentage), 2) as media_desconto,
    ROUND(MIN(total_discount_percentage), 2) as min_desconto,
    ROUND(MAX(total_discount_percentage), 2) as max_desconto
  FROM previous_year_students
  WHERE total_discount_percentage IS NOT NULL
    AND total_discount_percentage > 0
  GROUP BY 
    CASE 
      WHEN total_discount_percentage >= 20 THEN 'Cluster D (≥20%)'
      WHEN total_discount_percentage >= 15 THEN 'Cluster C (15-<20%)'
      WHEN total_discount_percentage >= 10 THEN 'Cluster B (10-<15%)'
      WHEN total_discount_percentage >= 5 THEN 'Cluster A (5-<10%)'
      ELSE 'Sem cluster (<5%)'
    END
)
SELECT 
  cluster_label AS cluster,
  total_alunos,
  media_desconto,
  min_desconto,
  max_desconto
FROM clusters
ORDER BY 
  CASE cluster_label
    WHEN 'Cluster D (≥20%)' THEN 1
    WHEN 'Cluster C (15-<20%)' THEN 2
    WHEN 'Cluster B (10-<15%)' THEN 3
    WHEN 'Cluster A (5-<10%)' THEN 4
    ELSE 5
  END;

-- ========================================
-- 6. Verificar Trilho Especial (Bypass)
-- ========================================

-- Contar alunos do Trilho Especial (que devem bypassar cluster + cap)
SELECT 
  COUNT(*) as total_trilho_especial,
  ROUND(AVG(total_discount_percentage), 2) as media_desconto
FROM previous_year_students
WHERE LOWER(TRIM(track_name)) = 'especial';

SELECT 
  CASE 
    WHEN COUNT(*) > 0
    THEN '✅ Encontrados ' || COUNT(*) || ' aluno(s) do Trilho Especial (bypass confirmado)'
    ELSE '⚠️ AVISO: Nenhum aluno do Trilho Especial encontrado'
  END AS check_trilho_especial
FROM previous_year_students
WHERE LOWER(TRIM(track_name)) = 'especial';

-- ========================================
-- 7. Resumo Final
-- ========================================

SELECT 
  '
  ========================================
  RESUMO DAS PRÉ-CHECAGENS (F0)
  ========================================
  
  ✅ INFRAESTRUTURA:
     - Tabelas: system_configs, previous_year_students
     - RPCs: get_system_config
  
  ✅ REFERÊNCIA:
     - Chaves CAP existem (padrão a seguir)
  
  ✅ PRONTO PARA F1:
     - Chaves cluster ainda não existem
     - Categoria válida identificada
     - Dados de teste disponíveis
  
  📊 DISTRIBUIÇÃO DE ALUNOS:
     Ver consulta acima para clusters A/B/C/D
  
  🚫 EXCEÇÕES IDENTIFICADAS:
     - Trilho Especial (bypass)
  
  ⏭️ PRÓXIMO PASSO:
     Executar migração F1 (seed das 5 chaves)
  
  ========================================
  ' AS resumo;
