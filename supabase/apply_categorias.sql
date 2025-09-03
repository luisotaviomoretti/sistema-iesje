-- Script para aplicar categorização de descontos manualmente
-- Execule este script no seu painel do Supabase ou ferramenta de administração

-- 1. Adicionar enum de categorias (se não existir)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'categoria_desconto') THEN
        CREATE TYPE categoria_desconto AS ENUM ('especial', 'regular', 'negociacao');
    END IF;
END $$;

-- 2. Adicionar coluna categoria (se não existir)  
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tipos_desconto' AND column_name = 'categoria'
    ) THEN
        ALTER TABLE tipos_desconto ADD COLUMN categoria categoria_desconto;
    END IF;
END $$;

-- 3. Atualizar dados existentes
-- DESCONTOS ESPECIAIS (bolsas de filantropia e filhos de funcionários)
UPDATE tipos_desconto SET categoria = 'especial' 
WHERE codigo IN ('PASS', 'PBS', 'COL', 'SAE', 'ABI', 'ABP') AND categoria IS NULL;

-- DESCONTOS REGULARES (irmãos carnal, pagamento à vista, alunos de outra cidade)
UPDATE tipos_desconto SET categoria = 'regular' 
WHERE codigo IN ('IIR', 'RES', 'PAV') AND categoria IS NULL;

-- DESCONTOS DE NEGOCIAÇÃO (demais tipos/comerciais)
UPDATE tipos_desconto SET categoria = 'negociacao' 
WHERE codigo IN ('CEP10', 'CEP5', 'ADIM2', 'COM_EXTRA') AND categoria IS NULL;

-- 4. Tornar coluna NOT NULL (após atualizar dados)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tipos_desconto' AND column_name = 'categoria' AND is_nullable = 'YES'
    ) THEN
        -- Definir valor padrão para registros ainda sem categoria
        UPDATE tipos_desconto SET categoria = 'negociacao' WHERE categoria IS NULL;
        
        -- Tornar NOT NULL
        ALTER TABLE tipos_desconto ALTER COLUMN categoria SET NOT NULL;
    END IF;
END $$;

-- 5. Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_tipos_desconto_categoria ON tipos_desconto(categoria);

-- 6. Adicionar comentário
COMMENT ON COLUMN tipos_desconto.categoria IS 'Categoria do desconto: especial (bolsas/funcionários), regular (padrões), negociacao (comerciais)';

-- 7. Recriar função RLS atualizada
CREATE OR REPLACE FUNCTION get_active_discount_types()
RETURNS TABLE (
  id text,
  codigo text,
  descricao text,
  percentual_fixo integer,
  eh_variavel boolean,
  documentos_necessarios text[],
  nivel_aprovacao_requerido text,
  categoria categoria_desconto,
  ativo boolean,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    id::text,
    codigo,
    descricao,
    percentual_fixo,
    eh_variavel,
    documentos_necessarios,
    nivel_aprovacao_requerido::text,
    categoria,
    ativo,
    created_at,
    updated_at
  FROM tipos_desconto 
  WHERE ativo = true
  ORDER BY 
    CASE categoria
      WHEN 'regular' THEN 1
      WHEN 'especial' THEN 2  
      WHEN 'negociacao' THEN 3
    END,
    codigo;
$$;

-- Verificar resultado
SELECT 
  categoria,
  COUNT(*) as quantidade,
  STRING_AGG(codigo, ', ' ORDER BY codigo) as codigos
FROM tipos_desconto 
GROUP BY categoria 
ORDER BY categoria;