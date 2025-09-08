-- =====================================================
-- SCRIPT DE VERIFICAÇÃO: Rastreamento de Usuário em Matrículas
-- Execute este script para verificar se o sistema está funcionando
-- =====================================================

-- 1. Verificar últimas matrículas com informações de usuário
SELECT 
  id,
  student_name,
  created_at,
  created_by_user_type,
  created_by_user_name,
  created_by_user_email,
  CASE 
    WHEN created_by_user_id IS NOT NULL THEN 'Identificado'
    ELSE 'Anônimo'
  END as status_usuario
FROM public.enrollments
ORDER BY created_at DESC
LIMIT 20;

-- 2. Estatísticas de matrículas por tipo de usuário
SELECT 
  created_by_user_type,
  COUNT(*) as total_matriculas,
  COUNT(DISTINCT created_by_user_id) as usuarios_unicos,
  COUNT(CASE WHEN created_by_user_id IS NOT NULL THEN 1 END) as com_id,
  COUNT(CASE WHEN created_by_user_email IS NOT NULL THEN 1 END) as com_email,
  COUNT(CASE WHEN created_by_user_name IS NOT NULL THEN 1 END) as com_nome
FROM public.enrollments
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY created_by_user_type
ORDER BY total_matriculas DESC;

-- 3. Top 10 usuários que mais criaram matrículas (últimos 30 dias)
SELECT 
  COALESCE(created_by_user_name, 'Anônimo') as usuario,
  created_by_user_email as email,
  created_by_user_type as tipo,
  COUNT(*) as total_matriculas,
  MAX(created_at) as ultima_matricula
FROM public.enrollments
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY created_by_user_name, created_by_user_email, created_by_user_type
ORDER BY total_matriculas DESC
LIMIT 10;

-- 4. Matrículas anônimas vs identificadas (últimos 7 dias)
SELECT 
  DATE(created_at) as data,
  COUNT(CASE WHEN created_by_user_type = 'anonymous' THEN 1 END) as anonimas,
  COUNT(CASE WHEN created_by_user_type = 'admin' THEN 1 END) as por_admin,
  COUNT(CASE WHEN created_by_user_type = 'matricula' THEN 1 END) as por_usuario_matricula,
  COUNT(*) as total_dia
FROM public.enrollments
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY data DESC;

-- 5. Verificar se há matrículas com dados inconsistentes
SELECT 
  id,
  student_name,
  created_at,
  created_by_user_type,
  CASE
    WHEN created_by_user_type != 'anonymous' AND created_by_user_id IS NULL THEN 'AVISO: Tipo não-anônimo sem ID'
    WHEN created_by_user_type = 'anonymous' AND created_by_user_id IS NOT NULL THEN 'AVISO: Tipo anônimo com ID'
    WHEN created_by_user_type IN ('admin', 'matricula') AND created_by_user_email IS NULL THEN 'AVISO: Admin/Matrícula sem email'
    ELSE 'OK'
  END as validacao
FROM public.enrollments
WHERE created_at >= NOW() - INTERVAL '7 days'
  AND (
    (created_by_user_type != 'anonymous' AND created_by_user_id IS NULL) OR
    (created_by_user_type = 'anonymous' AND created_by_user_id IS NOT NULL) OR
    (created_by_user_type IN ('admin', 'matricula') AND created_by_user_email IS NULL)
  )
LIMIT 20;

-- 6. Resumo geral do sistema de rastreamento
WITH stats AS (
  SELECT 
    COUNT(*) as total_matriculas,
    COUNT(CASE WHEN created_by_user_id IS NOT NULL THEN 1 END) as matriculas_identificadas,
    COUNT(CASE WHEN created_by_user_type = 'anonymous' THEN 1 END) as matriculas_anonimas,
    COUNT(CASE WHEN created_by_user_type = 'admin' THEN 1 END) as matriculas_por_admin,
    COUNT(CASE WHEN created_by_user_type = 'matricula' THEN 1 END) as matriculas_por_usuario,
    MIN(created_at) as primeira_matricula,
    MAX(created_at) as ultima_matricula
  FROM public.enrollments
  WHERE created_at >= NOW() - INTERVAL '30 days'
)
SELECT 
  'Estatísticas dos Últimos 30 Dias' as periodo,
  total_matriculas,
  ROUND((matriculas_identificadas::numeric / NULLIF(total_matriculas, 0)) * 100, 2) || '%' as taxa_identificacao,
  matriculas_anonimas,
  matriculas_por_admin,
  matriculas_por_usuario,
  AGE(ultima_matricula, primeira_matricula) as periodo_ativo
FROM stats;

-- 7. Teste da função get_current_user_info (se você estiver logado)
SELECT * FROM public.get_current_user_info();

-- =====================================================
-- RESULTADOS ESPERADOS:
-- - Matrículas recentes devem ter campos created_by_* preenchidos
-- - Tipo 'anonymous' para matrículas sem usuário logado
-- - Tipo 'admin' ou 'matricula' com ID, email e nome preenchidos
-- - Sem inconsistências nos dados
-- =====================================================