-- =====================================================
-- MIGRATION: 041_seed_inadimplencia_system_config.sql
-- DESCRIÇÃO: Cria chaves padrão em system_configs para a feature
--            de Inadimplência na Rematrícula, de forma idempotente.
-- DATA: 2025-09-15
-- AUTOR: Cascade
-- =====================================================

-- Observação: as chaves já são lidas via RPC get_system_config e
-- tratadas como false quando ausentes. Este seed garante que
-- apareçam na UI de configurações e possam ser ajustadas.

-- Ativar/desativar a feature (default: false)
INSERT INTO public.system_configs (chave, valor, descricao, categoria, updated_by)
SELECT 'rematricula.inadimplencia.enabled', 'false', 'Ativa bloqueio de Rematrícula por inadimplência (FE e reforço no servidor).', 'financeiro', 'migration-041'
WHERE NOT EXISTS (
  SELECT 1 FROM public.system_configs WHERE chave = 'rematricula.inadimplencia.enabled'
);

-- Exigir correspondência pelo responsável (default: false)
INSERT INTO public.system_configs (chave, valor, descricao, categoria, updated_by)
SELECT 'rematricula.inadimplencia.match.require_guardian', 'false', 'Exige correspondência também pelo nome do responsável (além do aluno).', 'financeiro', 'migration-041'
WHERE NOT EXISTS (
  SELECT 1 FROM public.system_configs WHERE chave = 'rematricula.inadimplencia.match.require_guardian'
);

-- Exigir mesma escola (default: false)
INSERT INTO public.system_configs (chave, valor, descricao, categoria, updated_by)
SELECT 'rematricula.inadimplencia.match.require_same_school', 'false', 'Exige que a escola informada corresponda à do registro de inadimplência.', 'financeiro', 'migration-041'
WHERE NOT EXISTS (
  SELECT 1 FROM public.system_configs WHERE chave = 'rematricula.inadimplencia.match.require_same_school'
);

-- =====================================================
-- Fim da migração 041
