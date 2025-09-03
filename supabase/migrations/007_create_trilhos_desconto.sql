-- Migração Simplificada - Sistema de Trilhos de Desconto (Versão Básica)
-- Para ambientes onde algumas tabelas ainda não existem
-- Autor: Sistema IESJE
-- Data: 2025-01-01

-- ============================================================================
-- VERIFICAR PRÉ-REQUISITOS
-- ============================================================================

DO $$
BEGIN
  -- Verificar se enum categoria_desconto existe
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'categoria_desconto') THEN
    RAISE EXCEPTION 'ERRO: Enum categoria_desconto não existe. Execute primeiro a migração 006_add_categoria_to_tipos_desconto.sql';
  END IF;
  
  RAISE NOTICE '✅ Pré-requisitos verificados';
END $$;

-- ============================================================================
-- 1. TABELA PRINCIPAL DE TRILHOS DE DESCONTO
-- ============================================================================

CREATE TABLE trilhos_desconto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(50) NOT NULL UNIQUE,
  titulo VARCHAR(100) NOT NULL,
  descricao TEXT NOT NULL,
  icone VARCHAR(10) DEFAULT '🎯',
  cor_primaria VARCHAR(7) DEFAULT '#3B82F6',
  cap_maximo DECIMAL(5,2),
  ativo BOOLEAN DEFAULT true,
  ordem_exibicao INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. TABELA DE REGRAS DE COMPATIBILIDADE
-- ============================================================================

CREATE TABLE regras_trilhos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trilho_id UUID REFERENCES trilhos_desconto(id) ON DELETE CASCADE,
  categoria_permitida categoria_desconto NOT NULL,
  pode_combinar_com categoria_desconto[],
  prioridade INTEGER DEFAULT 0,
  restricao_especial TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 3. TABELA DE CONFIGURAÇÕES DE CAPS
-- ============================================================================

CREATE TABLE config_caps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cap_with_secondary DECIMAL(5,2) DEFAULT 25.00,
  cap_without_secondary DECIMAL(5,2) DEFAULT 12.00,
  cap_especial_maximo DECIMAL(5,2) DEFAULT 100.00,
  vigencia_inicio DATE DEFAULT CURRENT_DATE,
  vigencia_fim DATE,
  observacoes TEXT,
  updated_by UUID, -- FK será adicionada quando admin_users existir
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 4. ÍNDICES ESSENCIAIS
-- ============================================================================

CREATE INDEX idx_trilhos_ativo_ordem ON trilhos_desconto(ativo, ordem_exibicao);
CREATE INDEX idx_trilhos_nome ON trilhos_desconto(nome);
CREATE INDEX idx_regras_trilho_categoria ON regras_trilhos(trilho_id, categoria_permitida);
CREATE INDEX idx_config_caps_vigencia ON config_caps(vigencia_inicio, vigencia_fim);

-- ============================================================================
-- 5. CONSTRAINTS BÁSICAS
-- ============================================================================

-- Validar nomes de trilhos
ALTER TABLE trilhos_desconto 
ADD CONSTRAINT ck_trilho_nome_valido 
CHECK (nome IN ('especial', 'combinado', 'comercial'));

-- Validar caps (0-100%)
ALTER TABLE trilhos_desconto 
ADD CONSTRAINT ck_trilho_cap_valido 
CHECK (cap_maximo IS NULL OR (cap_maximo >= 0 AND cap_maximo <= 100));

-- Validar ordem de exibição
ALTER TABLE trilhos_desconto 
ADD CONSTRAINT ck_trilho_ordem_positiva 
CHECK (ordem_exibicao >= 0);

-- Validar configurações de caps
ALTER TABLE config_caps
ADD CONSTRAINT ck_caps_validos 
CHECK (
  cap_with_secondary >= 0 AND cap_with_secondary <= 100 AND
  cap_without_secondary >= 0 AND cap_without_secondary <= 100 AND
  cap_especial_maximo >= 0 AND cap_especial_maximo <= 100
);

-- ============================================================================
-- 6. FUNÇÕES ESSENCIAIS
-- ============================================================================

-- Função para obter configuração vigente
CREATE OR REPLACE FUNCTION get_current_cap_config()
RETURNS config_caps AS $$
DECLARE
  result config_caps;
BEGIN
  SELECT * INTO result
  FROM config_caps
  WHERE vigencia_inicio <= CURRENT_DATE
    AND (vigencia_fim IS NULL OR vigencia_fim >= CURRENT_DATE)
  ORDER BY vigencia_inicio DESC
  LIMIT 1;
  
  -- Se não encontrar, retorna valores padrão
  IF result IS NULL THEN
    result.cap_with_secondary := 25.00;
    result.cap_without_secondary := 12.00;
    result.cap_especial_maximo := 100.00;
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Função para validar compatibilidade básica
CREATE OR REPLACE FUNCTION validate_trilho_compatibility(
  p_trilho_nome VARCHAR(50),
  p_categorias_desconto categoria_desconto[]
)
RETURNS BOOLEAN AS $$
DECLARE
  trilho_record trilhos_desconto;
  categoria categoria_desconto;
BEGIN
  -- Buscar o trilho
  SELECT * INTO trilho_record
  FROM trilhos_desconto
  WHERE nome = p_trilho_nome AND ativo = true;
  
  IF trilho_record IS NULL THEN
    RETURN false;
  END IF;
  
  -- Verificar cada categoria
  FOREACH categoria IN ARRAY p_categorias_desconto
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM regras_trilhos
      WHERE trilho_id = trilho_record.id
        AND categoria_permitida = categoria
    ) THEN
      RETURN false;
    END IF;
  END LOOP;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. TRIGGERS BÁSICOS
-- ============================================================================

-- Função para atualizar timestamp
CREATE OR REPLACE FUNCTION update_trilho_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para trilhos_desconto
CREATE TRIGGER tr_trilhos_updated_at
  BEFORE UPDATE ON trilhos_desconto
  FOR EACH ROW
  EXECUTE FUNCTION update_trilho_timestamp();

-- Trigger para config_caps
CREATE TRIGGER tr_config_caps_updated_at
  BEFORE UPDATE ON config_caps
  FOR EACH ROW
  EXECUTE FUNCTION update_trilho_timestamp();

-- ============================================================================
-- 8. SCRIPT PARA MIGRAÇÃO FUTURA DE MATRICULAS
-- ============================================================================

-- Criar função que será executada quando matriculas existir
CREATE OR REPLACE FUNCTION setup_matriculas_trilhos()
RETURNS VOID AS $$
BEGIN
  -- Verificar se matriculas existe
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'matriculas'
  ) THEN
    -- Adicionar colunas se não existirem
    BEGIN
      ALTER TABLE matriculas ADD COLUMN trilho_escolhido VARCHAR(20);
    EXCEPTION WHEN duplicate_column THEN
      NULL;
    END;
    
    BEGIN
      ALTER TABLE matriculas ADD COLUMN cap_aplicado DECIMAL(5,2);
    EXCEPTION WHEN duplicate_column THEN
      NULL;
    END;
    
    BEGIN
      ALTER TABLE matriculas ADD COLUMN trilho_metadata JSONB DEFAULT '{}';
    EXCEPTION WHEN duplicate_column THEN
      NULL;
    END;
    
    -- Criar índices
    CREATE INDEX IF NOT EXISTS idx_matriculas_trilho ON matriculas(trilho_escolhido);
    CREATE INDEX IF NOT EXISTS idx_matriculas_cap ON matriculas(cap_aplicado);
    
    -- Adicionar constraints
    BEGIN
      ALTER TABLE matriculas
      ADD CONSTRAINT ck_matricula_trilho_valido
      CHECK (trilho_escolhido IS NULL OR trilho_escolhido IN ('especial', 'combinado', 'comercial'));
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
    
    BEGIN
      ALTER TABLE matriculas
      ADD CONSTRAINT ck_matricula_cap_valido
      CHECK (cap_aplicado IS NULL OR (cap_aplicado >= 0 AND cap_aplicado <= 100));
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
    
    RAISE NOTICE '✅ Configuração de trilhos aplicada à tabela matriculas';
  ELSE
    RAISE NOTICE '⚠️ Tabela matriculas não encontrada - execute setup_matriculas_trilhos() depois';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 9. VERIFICAÇÃO FINAL
-- ============================================================================

DO $$
DECLARE
  tables_created INTEGER;
BEGIN
  SELECT COUNT(*) INTO tables_created
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN ('trilhos_desconto', 'regras_trilhos', 'config_caps');
    
  IF tables_created = 3 THEN
    RAISE NOTICE '';
    RAISE NOTICE '🎯 ═══════════════════════════════════════════════';
    RAISE NOTICE '🎯 MIGRAÇÃO BÁSICA DE TRILHOS - SUCESSO!';
    RAISE NOTICE '🎯 ═══════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Tabelas criadas: trilhos_desconto, regras_trilhos, config_caps';
    RAISE NOTICE '✅ Funções disponíveis: get_current_cap_config(), validate_trilho_compatibility()';
    RAISE NOTICE '✅ Função futura: setup_matriculas_trilhos() (execute quando matriculas existir)';
    RAISE NOTICE '';
    RAISE NOTICE '📋 PRÓXIMOS PASSOS:';
    RAISE NOTICE '  1. Execute a migração de seeds: 008_seed_trilhos_desconto.sql';
    RAISE NOTICE '  2. Quando tabela matriculas existir: SELECT setup_matriculas_trilhos();';
    RAISE NOTICE '  3. Continue com implementação dos hooks e componentes';
    RAISE NOTICE '';
  ELSE
    RAISE EXCEPTION '❌ Erro na criação das tabelas de trilhos';
  END IF;
END $$;