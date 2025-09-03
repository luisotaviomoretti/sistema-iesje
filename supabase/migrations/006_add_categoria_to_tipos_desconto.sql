-- Migração para adicionar campo categoria aos tipos de desconto
-- Autor: Sistema IESJE
-- Data: 2025-01-01

-- Adicionar enum para categorias de desconto
CREATE TYPE categoria_desconto AS ENUM (
  'especial',      -- Descontos especiais: bolsas de filantropia e filhos de funcionários  
  'regular',       -- Descontos regulares: irmãos carnal, pagamento à vista, alunos de outra cidade
  'negociacao'     -- Descontos de negociação: demais tipos
);

-- Adicionar coluna categoria à tabela tipos_desconto
ALTER TABLE tipos_desconto 
ADD COLUMN categoria categoria_desconto;

-- Atualizar registros existentes baseado na classificação solicitada
UPDATE tipos_desconto SET categoria = 'especial' WHERE codigo IN (
  'PASS',      -- Filhos de Prof. do IESJE Sindicalizados - 100%
  'PBS',       -- Filhos Prof. Sind. de Outras Instituições - 40%
  'COL',       -- Filhos de Func. do IESJE Sindicalizados SAAE - 50%
  'SAE',       -- Filhos de Func. Outros Estabelec. Sindicalizados SAAE - 40%
  'ABI',       -- Bolsa Integral Filantropia - 100%
  'ABP'        -- Bolsa Parcial Filantropia - 50%
);

UPDATE tipos_desconto SET categoria = 'regular' WHERE codigo IN (
  'IIR',       -- Alunos Irmãos Carnal - 10%
  'RES',       -- Alunos de Outras Cidades - 20%
  'PAV'        -- Pagamento à Vista - 15%
);

UPDATE tipos_desconto SET categoria = 'negociacao' WHERE codigo IN (
  'CEP10',     -- Comercial — CEP fora de Poços de Caldas - 10%
  'CEP5',      -- Comercial — CEP em bairro de menor renda (Poços) - 5%
  'ADIM2',     -- Comercial — Adimplente perfeito - 2%
  'COM_EXTRA'  -- Comercial — Extra (negociação) até 20%
);

-- Adicionar constraint para garantir que categoria não seja nula em novos registros
ALTER TABLE tipos_desconto 
ALTER COLUMN categoria SET NOT NULL;

-- Adicionar comentário na coluna
COMMENT ON COLUMN tipos_desconto.categoria IS 'Categoria do desconto: especial (bolsas/funcionários), regular (padrões), negociacao (comerciais)';

-- Criar índice para melhor performance em consultas por categoria
CREATE INDEX idx_tipos_desconto_categoria ON tipos_desconto(categoria);

-- Atualizar função RLS se existir
DROP FUNCTION IF EXISTS get_active_discount_types();
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