-- =============================================================
-- MIGRATION 004 — Rematrícula • Pagamento à Vista (PAV)
-- F1 — Modelo de Configuração (Supabase) [SQL e Seeds]
-- Objetivo: criar chaves em system_configs de forma idempotente, sem
-- alterar valores existentes em ambientes já configurados.
-- =============================================================

-- Tabela de destino: public.system_configs
-- Colunas (ref. 001_initial_schema.sql):
--   id uuid PK, chave text UNIQUE, valor text, descricao text, categoria text,
--   created_at timestamptz, updated_at timestamptz, updated_by text

-- Padrões em PRODUÇÃO: enabled=false, percent=0, code='PAV', name='Pagamento à Vista'
-- Estratégia: INSERT ON CONFLICT(chave) DO NOTHING (não sobrepõe valores já existentes)

-- 1) Flag habilitar/desabilitar (boolean-like em texto)
INSERT INTO public.system_configs (chave, valor, descricao, categoria, updated_by)
VALUES (
  'rematricula.pav.enabled',
  'false',
  'Habilita/desabilita o toggle Pagamento à Vista na Rematrícula.',
  'financeiro',
  'migration_004_f1_pav'
)
ON CONFLICT (chave) DO NOTHING;

-- 2) Percentual (0..100) — armazenado como texto; validação será aplicada no service
INSERT INTO public.system_configs (chave, valor, descricao, categoria, updated_by)
VALUES (
  'rematricula.pav.percent',
  '0',
  'Percentual aplicado quando Pagamento à Vista estiver habilitado.',
  'financeiro',
  'migration_004_f1_pav'
)
ON CONFLICT (chave) DO NOTHING;

-- 3) Código (identificador curto para o desconto)
INSERT INTO public.system_configs (chave, valor, descricao, categoria, updated_by)
VALUES (
  'rematricula.pav.code',
  'PAV',
  'Código do desconto de Pagamento à Vista exibido em relatórios/PDF.',
  'financeiro',
  'migration_004_f1_pav'
)
ON CONFLICT (chave) DO NOTHING;

-- 4) Nome (rótulo exibido na UI/PDF)
INSERT INTO public.system_configs (chave, valor, descricao, categoria, updated_by)
VALUES (
  'rematricula.pav.name',
  'Pagamento à Vista',
  'Nome do desconto de Pagamento à Vista exibido para o usuário.',
  'financeiro',
  'migration_004_f1_pav'
)
ON CONFLICT (chave) DO NOTHING;

-- Observações:
-- - Não altera dados existentes para evitar impactos em ambientes configurados.
-- - Próximas fases implementarão leitura via config.service e UI/Admin.
