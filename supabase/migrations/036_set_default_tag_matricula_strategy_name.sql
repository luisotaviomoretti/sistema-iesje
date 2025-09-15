-- =====================================================
-- MIGRATION: 036_set_default_tag_matricula_strategy_name.sql
-- DESCRIÇÃO: Define como padrão a estratégia por NOME para
--            classificação de tag_matricula, exigindo data
--            de nascimento por padrão. Idempotente.
-- DATA: 2025-09-15
-- =====================================================

-- As chaves abaixo são lidas por public.get_system_config(TEXT)
-- e usadas pelo trigger set_enrollment_tag_from_previous_year()

-- 1) Estratégia padrão: 'name'
INSERT INTO public.system_configs (chave, valor, descricao, categoria, updated_by)
VALUES (
  'rematricula.tag_matricula.strategy',
  'name',
  'Estratégia de classificação de origem da matrícula (name|cpf). Padrão: name.',
  'geral',
  'migration-036'
)
ON CONFLICT (chave) DO UPDATE
SET valor = EXCLUDED.valor,
    descricao = EXCLUDED.descricao,
    categoria = EXCLUDED.categoria,
    updated_by = EXCLUDED.updated_by,
    updated_at = NOW();

-- 2) Exigir birth_date no match por nome (padrão: true)
INSERT INTO public.system_configs (chave, valor, descricao, categoria, updated_by)
VALUES (
  'rematricula.tag_matricula.name_match.require_birth_date',
  'true',
  'Se true, exige nome + data de nascimento para match de rematrícula por nome.',
  'geral',
  'migration-036'
)
ON CONFLICT (chave) DO UPDATE
SET valor = EXCLUDED.valor,
    descricao = EXCLUDED.descricao,
    categoria = EXCLUDED.categoria,
    updated_by = EXCLUDED.updated_by,
    updated_at = NOW();

-- Observações:
-- - Não use categoria "seguranca" aqui: get_system_config ignora essa categoria.
-- - Rollback: alterar valor das chaves para 'cpf' e/ou 'false'.
