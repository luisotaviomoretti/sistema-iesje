-- =====================================================
-- SCRIPT PARA PREPARAR TABELA PARA IMPORTAÇÃO CSV
-- Remove restrições temporariamente para permitir upload
-- =====================================================

-- 1. REMOVER A COLUNA GERADA student_cpf_digits (que está causando o erro)
ALTER TABLE public.previous_year_students
DROP COLUMN IF EXISTS student_cpf_digits CASCADE;

-- 2. DESABILITAR TRIGGERS TEMPORARIAMENTE
ALTER TABLE public.previous_year_students DISABLE TRIGGER ALL;

-- 3. REMOVER CONSTRAINTS DE NOT NULL TEMPORARIAMENTE (se necessário)
ALTER TABLE public.previous_year_students
  ALTER COLUMN student_name DROP NOT NULL,
  ALTER COLUMN student_cpf DROP NOT NULL,
  ALTER COLUMN created_at DROP NOT NULL,
  ALTER COLUMN updated_at DROP NOT NULL;

-- 4. ADICIONAR VALORES PADRÃO PARA COLUNAS QUE PODEM VIR VAZIAS
ALTER TABLE public.previous_year_students
  ALTER COLUMN status SET DEFAULT 'approved',
  ALTER COLUMN academic_year SET DEFAULT '2024',
  ALTER COLUMN created_at SET DEFAULT NOW(),
  ALTER COLUMN updated_at SET DEFAULT NOW(),
  ALTER COLUMN base_value SET DEFAULT 0,
  ALTER COLUMN total_discount_percentage SET DEFAULT 0,
  ALTER COLUMN total_discount_value SET DEFAULT 0,
  ALTER COLUMN final_monthly_value SET DEFAULT 0,
  ALTER COLUMN material_cost SET DEFAULT 0;

-- =====================================================
-- AGORA VOCÊ PODE FAZER O UPLOAD DO CSV
-- =====================================================

-- Após o upload bem-sucedido, execute o script abaixo para:
-- 1. Limpar os dados
-- 2. Restaurar as constraints
-- 3. Recriar a coluna gerada

-- =====================================================
-- SCRIPT DE LIMPEZA E RESTAURAÇÃO (execute APÓS o upload)
-- =====================================================
/*

-- 1. LIMPAR DADOS DO CSV
UPDATE public.previous_year_students SET
  -- Limpar CPFs (remover formatação)
  student_cpf = regexp_replace(COALESCE(student_cpf, ''), '\D', '', 'g'),
  guardian1_cpf = regexp_replace(COALESCE(guardian1_cpf, ''), '\D', '', 'g'),
  guardian2_cpf = regexp_replace(COALESCE(guardian2_cpf, ''), '\D', '', 'g'),
  address_cep = regexp_replace(COALESCE(address_cep, ''), '\D', '', 'g'),

  -- Converter datas do formato DD/MM/YYYY para YYYY-MM-DD
  student_birth_date = CASE
    WHEN student_birth_date IS NOT NULL AND student_birth_date::text ~ '^\d{2}/\d{2}/\d{4}$'
    THEN TO_DATE(student_birth_date::text, 'DD/MM/YYYY')
    ELSE student_birth_date
  END,

  -- Normalizar escola
  student_escola = LOWER(REPLACE(COALESCE(student_escola, ''), ' ', '_')),

  -- Normalizar gênero
  student_gender = CASE
    WHEN UPPER(student_gender) IN ('M', 'MASCULINO') THEN 'M'
    WHEN UPPER(student_gender) IN ('F', 'FEMININO') THEN 'F'
    ELSE student_gender
  END,

  -- Normalizar turno
  shift = LOWER(COALESCE(shift, '')),

  -- Limpar valores n.a
  address_complement = CASE
    WHEN address_complement = 'n.a' THEN NULL
    ELSE address_complement
  END,

  -- Garantir valores numéricos
  base_value = COALESCE(base_value, 0),
  total_discount_percentage = COALESCE(total_discount_percentage, 0),
  total_discount_value = COALESCE(total_discount_value, 0),
  final_monthly_value = COALESCE(final_monthly_value, 0),
  material_cost = COALESCE(material_cost, 0),

  -- Criar JSON de descontos se não existir
  applied_discounts = CASE
    WHEN applied_discounts IS NULL OR applied_discounts = '[]'::jsonb
    THEN
      CASE
        WHEN COALESCE(total_discount_percentage, 0) > 0 AND discount_code IS NOT NULL
        THEN jsonb_build_array(
          jsonb_build_object(
            'discount_code', discount_code,
            'discount_name', COALESCE(discount_description, 'Desconto ' || discount_code),
            'percentage', total_discount_percentage,
            'requires_documents', true
          )
        )
        ELSE '[]'::jsonb
      END
    ELSE applied_discounts
  END,

  -- Atualizar timestamps
  updated_at = NOW()
WHERE
  -- Aplicar apenas nos registros recém-importados (sem student_cpf_digits)
  created_at >= NOW() - INTERVAL '1 hour';

-- 2. REMOVER REGISTROS INVÁLIDOS
DELETE FROM public.previous_year_students
WHERE student_name IS NULL
   OR student_name = ''
   OR student_name = 'student_name'; -- Remove cabeçalho se importado

-- 3. RESTAURAR CONSTRAINTS NOT NULL
ALTER TABLE public.previous_year_students
  ALTER COLUMN student_name SET NOT NULL,
  ALTER COLUMN student_cpf SET NOT NULL,
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN updated_at SET NOT NULL;

-- 4. RECRIAR A COLUNA GERADA student_cpf_digits
ALTER TABLE public.previous_year_students
  ADD COLUMN IF NOT EXISTS student_cpf_digits TEXT GENERATED ALWAYS AS (
    regexp_replace(student_cpf, '\\D', '', 'g')
  ) STORED;

-- 5. RECRIAR O ÍNDICE
CREATE INDEX IF NOT EXISTS idx_pys_cpf_digits
  ON public.previous_year_students (student_cpf_digits);

-- 6. REABILITAR TRIGGERS
ALTER TABLE public.previous_year_students ENABLE TRIGGER ALL;

-- 7. VERIFICAR IMPORTAÇÃO
SELECT
  COUNT(*) as total_importado,
  COUNT(DISTINCT student_cpf) as cpfs_unicos,
  COUNT(DISTINCT student_escola) as escolas,
  AVG(final_monthly_value)::DECIMAL(10,2) as valor_medio,
  MIN(student_birth_date) as data_nasc_mais_antiga,
  MAX(student_birth_date) as data_nasc_mais_recente
FROM public.previous_year_students
WHERE created_at >= NOW() - INTERVAL '1 hour';

-- 8. VERIFICAR REGISTROS COM POSSÍVEIS PROBLEMAS
SELECT
  student_name,
  student_cpf,
  student_birth_date,
  final_monthly_value
FROM public.previous_year_students
WHERE created_at >= NOW() - INTERVAL '1 hour'
  AND (
    student_cpf IS NULL
    OR LENGTH(student_cpf) < 11
    OR student_birth_date IS NULL
    OR final_monthly_value = 0
  )
LIMIT 10;

*/

-- =====================================================
-- IMPORTANTE: INSTRUÇÕES DE USO
-- =====================================================
--
-- 1. Execute a PRIMEIRA PARTE deste script (até a linha 35)
-- 2. Faça o upload do CSV pelo Supabase Dashboard
-- 3. Após o upload, execute a SEGUNDA PARTE (descomente linhas 45-159)
-- 4. Verifique os resultados com as queries de validação
--
-- Se houver erro no upload:
-- - Verifique o encoding do CSV (deve ser UTF-8)
-- - Verifique o delimitador (deve ser ; ponto-e-vírgula)
-- - Verifique se as primeiras linhas não estão corrompidas
--
-- =====================================================