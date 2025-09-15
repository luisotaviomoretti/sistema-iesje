-- =====================================================
-- SCRIPT DE POPULAÇÃO MASSIVA: previous_year_students
-- DADOS IMPORTADOS DO CSV (1979 registros)
-- =====================================================

-- 1. Primeiro, limpar dados existentes se necessário (CUIDADO!)
-- DELETE FROM public.previous_year_students WHERE academic_year = '2024';

-- 2. Criar tabela temporária para staging dos dados
CREATE TEMP TABLE IF NOT EXISTS temp_previous_year_import (
  id TEXT,
  student_name TEXT,
  student_cpf TEXT,
  student_rg TEXT,
  student_birth_date TEXT,
  student_gender TEXT,
  student_escola TEXT,
  series_id TEXT,
  series_name TEXT,
  track_id TEXT,
  track_name TEXT,
  shift TEXT,
  guardian1_name TEXT,
  guardian1_cpf TEXT,
  guardian1_phone TEXT,
  guardian1_email TEXT,
  guardian1_relationship TEXT,
  guardian2_name TEXT,
  guardian2_cpf TEXT,
  guardian2_phone TEXT,
  guardian2_email TEXT,
  guardian2_relationship TEXT,
  address_cep TEXT,
  address_street TEXT,
  address_number TEXT,
  address_complement TEXT,
  address_district TEXT,
  address_city TEXT,
  address_state TEXT,
  base_value TEXT,
  total_discount_percentage TEXT,
  final_monthly_value TEXT,
  applied_discounts TEXT,
  academic_year TEXT,
  enrollment_date TEXT,
  created_at TEXT,
  updated_at TEXT,
  total_discount_value TEXT,
  material_cost TEXT,
  pdf_url TEXT,
  pdf_generated_at TEXT,
  status TEXT,
  approval_level TEXT,
  approval_status TEXT,
  deleted_at TEXT,
  student_cpf_digits TEXT,
  discount_code TEXT,
  discount_description TEXT
);

-- 3. Copiar dados do CSV para tabela temporária
-- NOTA: No Supabase, você precisa fazer o upload do CSV através da interface ou usar o COPY command
-- Se estiver usando o Supabase Dashboard:
-- a) Vá para Table Editor > previous_year_students
-- b) Use a opção "Import data from CSV"
-- c) Ou use o SQL abaixo se tiver acesso direto ao PostgreSQL

-- Se tiver acesso direto ao PostgreSQL server:
-- COPY temp_previous_year_import FROM '/path/to/previous_year_students_rows_upload.csv'
-- WITH (FORMAT csv, HEADER true, DELIMITER ';', ENCODING 'UTF8');

-- 4. Função auxiliar para converter data brasileira para formato ISO
CREATE OR REPLACE FUNCTION convert_br_date(date_text TEXT)
RETURNS DATE AS $$
BEGIN
  IF date_text IS NULL OR date_text = '' OR date_text = 'n.a' THEN
    RETURN NULL;
  END IF;

  -- Formato esperado: DD/MM/YYYY
  RETURN TO_DATE(date_text, 'DD/MM/YYYY');
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 5. Função para limpar e converter valores decimais
CREATE OR REPLACE FUNCTION clean_decimal(value_text TEXT)
RETURNS DECIMAL AS $$
BEGIN
  IF value_text IS NULL OR value_text = '' OR value_text = 'n.a' THEN
    RETURN 0;
  END IF;

  -- Remove espaços e substitui vírgula por ponto
  RETURN CAST(REPLACE(TRIM(value_text), ',', '.') AS DECIMAL);
EXCEPTION
  WHEN OTHERS THEN
    RETURN 0;
END;
$$ LANGUAGE plpgsql;

-- 6. Função para limpar CPF (remover formatação)
CREATE OR REPLACE FUNCTION clean_cpf(cpf_text TEXT)
RETURNS TEXT AS $$
BEGIN
  IF cpf_text IS NULL OR cpf_text = '' OR cpf_text = 'n.a' THEN
    RETURN NULL;
  END IF;

  -- Remove pontos, hífens e espaços
  RETURN REGEXP_REPLACE(cpf_text, '[^0-9]', '', 'g');
END;
$$ LANGUAGE plpgsql;

-- 7. Função para processar descontos e criar JSONB
CREATE OR REPLACE FUNCTION process_discounts(
  discount_code TEXT,
  discount_description TEXT,
  discount_percentage DECIMAL
)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  IF discount_code IS NULL OR discount_code = '' OR discount_percentage = 0 THEN
    RETURN '[]'::JSONB;
  END IF;

  result := jsonb_build_array(
    jsonb_build_object(
      'discount_code', discount_code,
      'discount_name', COALESCE(discount_description, 'Desconto ' || discount_code),
      'percentage', discount_percentage,
      'requires_documents', true
    )
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 8. Inserir dados na tabela final
INSERT INTO public.previous_year_students (
  student_name,
  student_cpf,
  student_rg,
  student_birth_date,
  student_gender,
  student_escola,
  series_id,
  series_name,
  track_id,
  track_name,
  shift,
  guardian1_name,
  guardian1_cpf,
  guardian1_phone,
  guardian1_email,
  guardian1_relationship,
  guardian2_name,
  guardian2_cpf,
  guardian2_phone,
  guardian2_email,
  guardian2_relationship,
  address_cep,
  address_street,
  address_number,
  address_complement,
  address_district,
  address_city,
  address_state,
  base_value,
  total_discount_percentage,
  total_discount_value,
  final_monthly_value,
  material_cost,
  applied_discounts,
  academic_year,
  status,
  created_at,
  updated_at
)
SELECT
  NULLIF(TRIM(student_name), ''),
  clean_cpf(student_cpf),
  NULLIF(TRIM(student_rg), ''),
  convert_br_date(student_birth_date),
  CASE
    WHEN UPPER(TRIM(student_gender)) = 'M' THEN 'M'
    WHEN UPPER(TRIM(student_gender)) = 'F' THEN 'F'
    ELSE NULL
  END,
  LOWER(REPLACE(NULLIF(TRIM(student_escola), ''), ' ', '_')),
  NULLIF(TRIM(series_id), ''),
  NULLIF(TRIM(series_name), ''),
  NULLIF(TRIM(track_id), ''),
  NULLIF(TRIM(track_name), ''),
  LOWER(NULLIF(TRIM(shift), '')),
  NULLIF(TRIM(guardian1_name), ''),
  clean_cpf(guardian1_cpf),
  NULLIF(TRIM(guardian1_phone), ''),
  NULLIF(TRIM(guardian1_email), ''),
  NULLIF(TRIM(guardian1_relationship), ''),
  NULLIF(TRIM(guardian2_name), ''),
  clean_cpf(guardian2_cpf),
  NULLIF(TRIM(guardian2_phone), ''),
  NULLIF(TRIM(guardian2_email), ''),
  NULLIF(TRIM(guardian2_relationship), ''),
  clean_cpf(address_cep),
  NULLIF(TRIM(address_street), ''),
  NULLIF(TRIM(address_number), ''),
  CASE
    WHEN TRIM(address_complement) = 'n.a' THEN NULL
    ELSE NULLIF(TRIM(address_complement), '')
  END,
  NULLIF(TRIM(address_district), ''),
  NULLIF(TRIM(address_city), ''),
  UPPER(NULLIF(TRIM(address_state), '')),
  clean_decimal(base_value),
  clean_decimal(total_discount_percentage),
  clean_decimal(total_discount_value),
  clean_decimal(final_monthly_value),
  clean_decimal(material_cost),
  process_discounts(
    NULLIF(TRIM(discount_code), ''),
    NULLIF(TRIM(discount_description), ''),
    clean_decimal(total_discount_percentage)
  ),
  COALESCE(NULLIF(TRIM(academic_year), ''), '2024'),
  COALESCE(NULLIF(TRIM(status), ''), 'approved'),
  COALESCE(TO_TIMESTAMP(NULLIF(TRIM(created_at), ''), 'YYYY-MM-DD HH24:MI:SS'), NOW()),
  COALESCE(TO_TIMESTAMP(NULLIF(TRIM(updated_at), ''), 'YYYY-MM-DD HH24:MI:SS'), NOW())
FROM temp_previous_year_import
WHERE student_name IS NOT NULL
  AND student_name != ''
  AND student_name != 'student_name'; -- Ignora linha de cabeçalho se houver

-- 9. Verificar resultados
SELECT
  COUNT(*) as total_registros,
  COUNT(DISTINCT student_cpf) as cpfs_unicos,
  COUNT(DISTINCT student_escola) as escolas,
  AVG(final_monthly_value)::DECIMAL(10,2) as valor_medio,
  MIN(final_monthly_value)::DECIMAL(10,2) as valor_minimo,
  MAX(final_monthly_value)::DECIMAL(10,2) as valor_maximo
FROM public.previous_year_students
WHERE academic_year = '2024';

-- 10. Limpar funções temporárias
DROP FUNCTION IF EXISTS convert_br_date(TEXT);
DROP FUNCTION IF EXISTS clean_decimal(TEXT);
DROP FUNCTION IF EXISTS clean_cpf(TEXT);
DROP FUNCTION IF EXISTS process_discounts(TEXT, TEXT, DECIMAL);

-- 11. Limpar tabela temporária
DROP TABLE IF EXISTS temp_previous_year_import;

-- =====================================================
-- INSTRUÇÕES DE USO
-- =====================================================
--
-- OPÇÃO 1: Upload via Supabase Dashboard (RECOMENDADO)
-- 1. Acesse o Supabase Dashboard
-- 2. Vá para Table Editor > previous_year_students
-- 3. Clique em "Import data from CSV"
-- 4. Faça upload do arquivo previous_year_students_rows_upload.csv
-- 5. Configure o delimitador como ";" (ponto e vírgula)
-- 6. Execute as etapas 4-11 deste script para processar os dados
--
-- OPÇÃO 2: Upload via psql (se tiver acesso direto)
-- 1. Conecte ao banco via psql
-- 2. Execute este script completo
-- 3. Use COPY command para importar o CSV (descomentar linha 56-57)
--
-- OPÇÃO 3: Upload manual em lotes
-- 1. Divida o CSV em arquivos menores (500 linhas cada)
-- 2. Use INSERT statements gerados a partir do CSV
-- 3. Execute em lotes para evitar timeout
--
-- VALIDAÇÃO:
-- Após o upload, verifique:
-- - Total de registros importados
-- - CPFs duplicados
-- - Valores financeiros consistentes
-- - Datas convertidas corretamente
--
-- =====================================================