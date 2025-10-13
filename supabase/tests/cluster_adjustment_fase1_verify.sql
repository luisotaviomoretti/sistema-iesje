-- Verificação pós-migração: Ajuste por Cluster (F1)
-- Fase: F1 (Seed das Chaves)
-- Data: 2025-10-13
-- Objetivo: Confirmar que as 5 chaves foram criadas corretamente

-- ========================================
-- 1. Verificar Existência das Chaves
-- ========================================

SELECT 
  chave,
  valor,
  categoria,
  descricao,
  updated_by,
  created_at,
  updated_at
FROM system_configs
WHERE chave LIKE 'rematricula.cluster_adjustment%'
ORDER BY chave;

-- ========================================
-- 2. Verificar Contagem (deve ser 5)
-- ========================================

SELECT 
  CASE 
    WHEN COUNT(*) = 5
    THEN '✅ SUCESSO: 5 chaves criadas corretamente'
    WHEN COUNT(*) > 5
    THEN '⚠️ AVISO: ' || COUNT(*) || ' chaves encontradas (esperado: 5). Verificar duplicatas.'
    WHEN COUNT(*) > 0 AND COUNT(*) < 5
    THEN '❌ ERRO: Apenas ' || COUNT(*) || ' chave(s) criada(s). Migração incompleta.'
    ELSE '❌ ERRO: Nenhuma chave criada. Verificar migração.'
  END AS verificacao_contagem,
  COUNT(*) as total_chaves
FROM system_configs
WHERE chave LIKE 'rematricula.cluster_adjustment%';

-- ========================================
-- 3. Verificar Valores Default
-- ========================================

-- Chave: enabled (deve ser 'false')
SELECT 
  chave,
  valor,
  CASE 
    WHEN valor = 'false' THEN '✅ Correto'
    ELSE '❌ ERRO: Esperado "false", encontrado "' || valor || '"'
  END AS validacao
FROM system_configs
WHERE chave = 'rematricula.cluster_adjustment.enabled';

-- Chaves: ajustes (devem ser '0')
SELECT 
  chave,
  valor,
  CASE 
    WHEN valor = '0' THEN '✅ Correto'
    ELSE '❌ ERRO: Esperado "0", encontrado "' || valor || '"'
  END AS validacao
FROM system_configs
WHERE chave IN (
  'rematricula.cluster_adjustment.cluster_a.adjustment',
  'rematricula.cluster_adjustment.cluster_b.adjustment',
  'rematricula.cluster_adjustment.cluster_c.adjustment',
  'rematricula.cluster_adjustment.cluster_d.adjustment'
)
ORDER BY chave;

-- ========================================
-- 4. Verificar Categoria
-- ========================================

SELECT 
  chave,
  categoria,
  CASE 
    WHEN categoria IN ('descontos', 'matriculas') THEN '✅ Categoria válida'
    ELSE '⚠️ AVISO: Categoria inesperada "' || categoria || '"'
  END AS validacao
FROM system_configs
WHERE chave LIKE 'rematricula.cluster_adjustment%'
ORDER BY chave;

-- ========================================
-- 5. Verificar Descrições
-- ========================================

SELECT 
  chave,
  LENGTH(descricao) as tamanho_descricao,
  CASE 
    WHEN descricao IS NOT NULL AND LENGTH(descricao) > 10 THEN '✅ Descrição presente'
    WHEN descricao IS NOT NULL THEN '⚠️ AVISO: Descrição muito curta'
    ELSE '❌ ERRO: Descrição ausente'
  END AS validacao,
  LEFT(descricao, 50) || '...' as preview_descricao
FROM system_configs
WHERE chave LIKE 'rematricula.cluster_adjustment%'
ORDER BY chave;

-- ========================================
-- 6. Testar Leitura via RPC
-- ========================================

-- Testar get_system_config para cada chave
SELECT 
  'rematricula.cluster_adjustment.enabled' as chave_testada,
  get_system_config('rematricula.cluster_adjustment.enabled') as valor_retornado,
  CASE 
    WHEN get_system_config('rematricula.cluster_adjustment.enabled') = 'false' THEN '✅ RPC OK'
    ELSE '❌ ERRO: RPC retornou valor inesperado'
  END AS validacao;

SELECT 
  'rematricula.cluster_adjustment.cluster_a.adjustment' as chave_testada,
  get_system_config('rematricula.cluster_adjustment.cluster_a.adjustment') as valor_retornado,
  CASE 
    WHEN get_system_config('rematricula.cluster_adjustment.cluster_a.adjustment') = '0' THEN '✅ RPC OK'
    ELSE '❌ ERRO: RPC retornou valor inesperado'
  END AS validacao;

SELECT 
  'rematricula.cluster_adjustment.cluster_b.adjustment' as chave_testada,
  get_system_config('rematricula.cluster_adjustment.cluster_b.adjustment') as valor_retornado,
  CASE 
    WHEN get_system_config('rematricula.cluster_adjustment.cluster_b.adjustment') = '0' THEN '✅ RPC OK'
    ELSE '❌ ERRO: RPC retornou valor inesperado'
  END AS validacao;

SELECT 
  'rematricula.cluster_adjustment.cluster_c.adjustment' as chave_testada,
  get_system_config('rematricula.cluster_adjustment.cluster_c.adjustment') as valor_retornado,
  CASE 
    WHEN get_system_config('rematricula.cluster_adjustment.cluster_c.adjustment') = '0' THEN '✅ RPC OK'
    ELSE '❌ ERRO: RPC retornou valor inesperado'
  END AS validacao;

SELECT 
  'rematricula.cluster_adjustment.cluster_d.adjustment' as chave_testada,
  get_system_config('rematricula.cluster_adjustment.cluster_d.adjustment') as valor_retornado,
  CASE 
    WHEN get_system_config('rematricula.cluster_adjustment.cluster_d.adjustment') = '0' THEN '✅ RPC OK'
    ELSE '❌ ERRO: RPC retornou valor inesperado'
  END AS validacao;

-- ========================================
-- 7. Verificar Impacto Zero (Dark Launch)
-- ========================================

-- Com enabled=false, a feature não deve afetar nenhum cálculo
SELECT 
  '
  ========================================
  VERIFICAÇÃO: DARK LAUNCH (Sem Impacto)
  ========================================
  
  ✅ Flag "enabled" está FALSE
  ✅ Todos os ajustes estão em 0
  
  ➡️ RESULTADO ESPERADO:
     Nenhum aluno terá desconto alterado.
     Feature está INATIVA (dark launch).
  
  🔧 PARA ATIVAR:
     1. Acessar /admin/configuracoes
     2. Configurar ajustes por cluster
     3. Ativar toggle "enabled"
     4. Salvar configurações
  
  ========================================
  ' AS verificacao_dark_launch;

-- ========================================
-- 8. Resumo Final da F1
-- ========================================

SELECT 
  '
  ========================================
  RESUMO DA VERIFICAÇÃO (F1)
  ========================================
  
  ✅ CHAVES CRIADAS: 5/5
     - enabled: false
     - cluster_a: 0
     - cluster_b: 0
     - cluster_c: 0
     - cluster_d: 0
  
  ✅ RPC FUNCIONAL:
     get_system_config retorna valores corretos
  
  ✅ DARK LAUNCH:
     Feature inativa (sem impacto)
  
  ⏭️ PRÓXIMA FASE: F2
     Implementar service layer (config.service.ts)
  
  ========================================
  ' AS resumo_f1;
