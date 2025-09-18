-- =============================================================
-- REMATRÍCULA • PAV — F1 (VERIFICAÇÃO PÓS-MIGRAÇÃO)
-- Objetivo: confirmar que as chaves foram criadas com os valores padrão
--           e que a RPC get_system_config está retornando corretamente.
-- Somente leitura.
-- =============================================================

-- Verificar diretamente na tabela (usa coluna `chave` do schema 001)
SELECT 'F1-V1: pav.enabled' AS check, chave, valor, categoria, updated_at
FROM public.system_configs
WHERE chave = 'rematricula.pav.enabled'
LIMIT 10;

SELECT 'F1-V2: pav.percent' AS check, chave, valor, categoria, updated_at
FROM public.system_configs
WHERE chave = 'rematricula.pav.percent'
LIMIT 10;

SELECT 'F1-V3: pav.code' AS check, chave, valor, categoria, updated_at
FROM public.system_configs
WHERE chave = 'rematricula.pav.code'
LIMIT 10;

SELECT 'F1-V4: pav.name' AS check, chave, valor, categoria, updated_at
FROM public.system_configs
WHERE chave = 'rematricula.pav.name'
LIMIT 10;

-- Verificar via RPC (respeita RLS e contratos usados no frontend)
SELECT 'F1-RPC1: get_system_config(enabled)' AS check,
       public.get_system_config('rematricula.pav.enabled') AS value;

SELECT 'F1-RPC2: get_system_config(percent)' AS check,
       public.get_system_config('rematricula.pav.percent') AS value;

SELECT 'F1-RPC3: get_system_config(code)' AS check,
       public.get_system_config('rematricula.pav.code') AS value;

SELECT 'F1-RPC4: get_system_config(name)' AS check,
       public.get_system_config('rematricula.pav.name') AS value;

-- Esperado imediatamente após aplicar a migração (PROD/STG):
--  - enabled = 'false'
--  - percent = '0'
--  - code = 'PAV'
--  - name = 'Pagamento à Vista'

-- FIM — F1 Verify
