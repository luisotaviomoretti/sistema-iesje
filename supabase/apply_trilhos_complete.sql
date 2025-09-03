-- Script Completo para Aplicação Manual do Sistema de Trilhos
-- Execute este script no painel do Supabase ou ferramenta de administração
-- Combina as migrações 007 e 008 em um único arquivo

-- ============================================================================
-- VERIFICAÇÃO DE PRÉ-REQUISITOS
-- ============================================================================

DO $$
BEGIN
  -- Verificar se enum categoria_desconto existe
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'categoria_desconto') THEN
    RAISE EXCEPTION 'Enum categoria_desconto não existe. Execute primeiro a migração de categorias.';
  END IF;
  
  -- Verificar se tabela tipos_desconto existe
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tipos_desconto') THEN
    RAISE EXCEPTION 'Tabela tipos_desconto não existe. Execute primeiro as migrações básicas.';
  END IF;
  
  RAISE NOTICE '✅ Pré-requisitos verificados com sucesso';
END $$;

-- ============================================================================
-- 1. CRIAR TABELAS (se não existirem)
-- ============================================================================

-- Tabela principal de trilhos
CREATE TABLE IF NOT EXISTS trilhos_desconto (
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

-- Tabela de regras de compatibilidade
CREATE TABLE IF NOT EXISTS regras_trilhos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trilho_id UUID REFERENCES trilhos_desconto(id) ON DELETE CASCADE,
  categoria_permitida categoria_desconto NOT NULL,
  pode_combinar_com categoria_desconto[],
  prioridade INTEGER DEFAULT 0,
  restricao_especial TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de configurações de caps
CREATE TABLE IF NOT EXISTS config_caps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cap_with_secondary DECIMAL(5,2) DEFAULT 25.00,
  cap_without_secondary DECIMAL(5,2) DEFAULT 12.00,
  cap_especial_maximo DECIMAL(5,2) DEFAULT 100.00,
  vigencia_inicio DATE DEFAULT CURRENT_DATE,
  vigencia_fim DATE,
  observacoes TEXT,
  updated_by UUID,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. ALTERAR TABELA MATRICULAS (se campos não existirem)
-- ============================================================================

DO $$
BEGIN
  -- Verificar se tabela matriculas existe
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'matriculas'
  ) THEN
    RAISE NOTICE '✅ Tabela matriculas encontrada - adicionando campos de trilhos';
    
    -- Adicionar trilho_escolhido se não existir
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'matriculas' AND column_name = 'trilho_escolhido'
    ) THEN
      ALTER TABLE matriculas ADD COLUMN trilho_escolhido VARCHAR(20);
      RAISE NOTICE '   ➕ Campo trilho_escolhido adicionado';
    END IF;
    
    -- Adicionar cap_aplicado se não existir
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'matriculas' AND column_name = 'cap_aplicado'
    ) THEN
      ALTER TABLE matriculas ADD COLUMN cap_aplicado DECIMAL(5,2);
      RAISE NOTICE '   ➕ Campo cap_aplicado adicionado';
    END IF;
    
    -- Adicionar trilho_metadata se não existir
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'matriculas' AND column_name = 'trilho_metadata'
    ) THEN
      ALTER TABLE matriculas ADD COLUMN trilho_metadata JSONB DEFAULT '{}';
      RAISE NOTICE '   ➕ Campo trilho_metadata adicionado';
    END IF;
  ELSE
    RAISE NOTICE '⚠️  Tabela matriculas não existe - campos de trilhos serão adicionados quando a tabela for criada';
  END IF;
END $$;

-- ============================================================================
-- 3. CRIAR ÍNDICES (se não existirem)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_trilhos_ativo_ordem ON trilhos_desconto(ativo, ordem_exibicao);
CREATE INDEX IF NOT EXISTS idx_trilhos_nome ON trilhos_desconto(nome);
CREATE INDEX IF NOT EXISTS idx_regras_trilho_categoria ON regras_trilhos(trilho_id, categoria_permitida);
CREATE INDEX IF NOT EXISTS idx_regras_prioridade ON regras_trilhos(trilho_id, prioridade);
CREATE INDEX IF NOT EXISTS idx_config_caps_vigencia ON config_caps(vigencia_inicio, vigencia_fim);

-- Índices para matriculas (apenas se a tabela existir)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'matriculas'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_matriculas_trilho ON matriculas(trilho_escolhido);
    CREATE INDEX IF NOT EXISTS idx_matriculas_cap ON matriculas(cap_aplicado);
    RAISE NOTICE '✅ Índices para matriculas criados';
  END IF;
END $$;

-- ============================================================================
-- 4. CRIAR CONSTRAINTS (se não existirem)
-- ============================================================================

DO $$
BEGIN
  -- Constraint para nomes de trilhos
  BEGIN
    ALTER TABLE trilhos_desconto 
    ADD CONSTRAINT ck_trilho_nome_valido 
    CHECK (nome IN ('especial', 'combinado', 'comercial'));
  EXCEPTION WHEN duplicate_object THEN
    NULL; -- constraint já existe
  END;
  
  -- Constraint para caps
  BEGIN
    ALTER TABLE trilhos_desconto 
    ADD CONSTRAINT ck_trilho_cap_valido 
    CHECK (cap_maximo IS NULL OR (cap_maximo >= 0 AND cap_maximo <= 100));
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  -- Constraint para ordem
  BEGIN
    ALTER TABLE trilhos_desconto 
    ADD CONSTRAINT ck_trilho_ordem_positiva 
    CHECK (ordem_exibicao >= 0);
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  -- Constraints para config_caps
  BEGIN
    ALTER TABLE config_caps
    ADD CONSTRAINT ck_caps_validos 
    CHECK (
      cap_with_secondary >= 0 AND cap_with_secondary <= 100 AND
      cap_without_secondary >= 0 AND cap_without_secondary <= 100 AND
      cap_especial_maximo >= 0 AND cap_especial_maximo <= 100
    );
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  -- Constraints para matriculas (apenas se a tabela existir)
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'matriculas'
  ) THEN
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
    
    RAISE NOTICE '✅ Constraints para matriculas criadas';
  END IF;
END $$;

-- ============================================================================
-- 5. CRIAR FUNÇÕES
-- ============================================================================

-- Função para atualizar timestamp
CREATE OR REPLACE FUNCTION update_trilho_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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
  
  IF result IS NULL THEN
    result.cap_with_secondary := 25.00;
    result.cap_without_secondary := 12.00;
    result.cap_especial_maximo := 100.00;
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Função para validar compatibilidade
CREATE OR REPLACE FUNCTION validate_trilho_compatibility(
  p_trilho_nome VARCHAR(50),
  p_categorias_desconto categoria_desconto[]
)
RETURNS BOOLEAN AS $$
DECLARE
  trilho_record trilhos_desconto;
  categoria categoria_desconto;
  is_compatible BOOLEAN := true;
BEGIN
  SELECT * INTO trilho_record
  FROM trilhos_desconto
  WHERE nome = p_trilho_nome AND ativo = true;
  
  IF trilho_record IS NULL THEN
    RETURN false;
  END IF;
  
  FOREACH categoria IN ARRAY p_categorias_desconto
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM regras_trilhos
      WHERE trilho_id = trilho_record.id
        AND categoria_permitida = categoria
    ) THEN
      is_compatible := false;
      EXIT;
    END IF;
  END LOOP;
  
  RETURN is_compatible;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. CRIAR TRIGGERS
-- ============================================================================

DROP TRIGGER IF EXISTS tr_trilhos_updated_at ON trilhos_desconto;
CREATE TRIGGER tr_trilhos_updated_at
  BEFORE UPDATE ON trilhos_desconto
  FOR EACH ROW
  EXECUTE FUNCTION update_trilho_timestamp();

DROP TRIGGER IF EXISTS tr_config_caps_updated_at ON config_caps;
CREATE TRIGGER tr_config_caps_updated_at
  BEFORE UPDATE ON config_caps
  FOR EACH ROW
  EXECUTE FUNCTION update_trilho_timestamp();

-- ============================================================================
-- 7. INSERIR DADOS INICIAIS (se não existirem)
-- ============================================================================

-- Inserir trilhos se não existirem
INSERT INTO trilhos_desconto (nome, titulo, descricao, icone, cor_primaria, cap_maximo, ordem_exibicao)
SELECT * FROM (VALUES
  ('especial', 'Desconto Especial', 'Bolsas de filantropia e descontos para filhos de funcionários. Descontos exclusivos com percentuais altos, mas bloqueia outros tipos de desconto.', '🌟', '#8B5CF6', NULL, 1),
  ('combinado', 'Regular + Negociação', 'Combine descontos regulares (irmãos, pagamento à vista, outras cidades) com descontos comerciais até o limite permitido.', '📋', '#3B82F6', 25.00, 2),
  ('comercial', 'Apenas Negociação', 'Descontos comerciais baseados em CEP, adimplência e negociações especiais com flexibilidade comercial.', '🤝', '#F59E0B', 12.00, 3)
) AS v(nome, titulo, descricao, icone, cor_primaria, cap_maximo, ordem_exibicao)
WHERE NOT EXISTS (SELECT 1 FROM trilhos_desconto WHERE trilhos_desconto.nome = v.nome);

-- Inserir regras se não existirem
DO $$
DECLARE
  trilho_especial_id UUID;
  trilho_combinado_id UUID;
  trilho_comercial_id UUID;
BEGIN
  -- Obter IDs dos trilhos
  SELECT id INTO trilho_especial_id FROM trilhos_desconto WHERE nome = 'especial';
  SELECT id INTO trilho_combinado_id FROM trilhos_desconto WHERE nome = 'combinado';
  SELECT id INTO trilho_comercial_id FROM trilhos_desconto WHERE nome = 'comercial';
  
  -- Regras do trilho especial
  INSERT INTO regras_trilhos (trilho_id, categoria_permitida, pode_combinar_com, prioridade, restricao_especial)
  SELECT trilho_especial_id, 'especial'::categoria_desconto, ARRAY[]::categoria_desconto[], 1, 'Descontos especiais são exclusivos'
  WHERE NOT EXISTS (
    SELECT 1 FROM regras_trilhos 
    WHERE trilho_id = trilho_especial_id AND categoria_permitida = 'especial'::categoria_desconto
  );
  
  -- Regras do trilho combinado
  INSERT INTO regras_trilhos (trilho_id, categoria_permitida, pode_combinar_com, prioridade, restricao_especial)
  SELECT trilho_combinado_id, 'regular'::categoria_desconto, ARRAY['negociacao'::categoria_desconto], 1, 'Descontos regulares podem ser combinados'
  WHERE NOT EXISTS (
    SELECT 1 FROM regras_trilhos 
    WHERE trilho_id = trilho_combinado_id AND categoria_permitida = 'regular'::categoria_desconto
  );
  
  INSERT INTO regras_trilhos (trilho_id, categoria_permitida, pode_combinar_com, prioridade, restricao_especial)
  SELECT trilho_combinado_id, 'negociacao'::categoria_desconto, ARRAY['regular'::categoria_desconto], 2, 'Descontos de negociação complementam os regulares'
  WHERE NOT EXISTS (
    SELECT 1 FROM regras_trilhos 
    WHERE trilho_id = trilho_combinado_id AND categoria_permitida = 'negociacao'::categoria_desconto
  );
  
  -- Regras do trilho comercial
  INSERT INTO regras_trilhos (trilho_id, categoria_permitida, pode_combinar_com, prioridade, restricao_especial)
  SELECT trilho_comercial_id, 'negociacao'::categoria_desconto, ARRAY[]::categoria_desconto[], 1, 'Foco em flexibilidade comercial'
  WHERE NOT EXISTS (
    SELECT 1 FROM regras_trilhos 
    WHERE trilho_id = trilho_comercial_id AND categoria_permitida = 'negociacao'::categoria_desconto
  );
END $$;

-- Inserir configuração inicial se não existir
INSERT INTO config_caps (cap_with_secondary, cap_without_secondary, cap_especial_maximo, vigencia_inicio, observacoes)
SELECT 25.00, 12.00, 100.00, CURRENT_DATE, 'Configuração inicial do sistema de trilhos'
WHERE NOT EXISTS (SELECT 1 FROM config_caps);

-- ============================================================================
-- 8. VALIDAÇÃO FINAL
-- ============================================================================

DO $$
DECLARE
  trilhos_count INTEGER;
  regras_count INTEGER;
  config_count INTEGER;
  trilho RECORD;
BEGIN
  SELECT COUNT(*) INTO trilhos_count FROM trilhos_desconto WHERE ativo = true;
  SELECT COUNT(*) INTO regras_count FROM regras_trilhos;
  SELECT COUNT(*) INTO config_count FROM config_caps;
  
  RAISE NOTICE '';
  RAISE NOTICE '🎯 ═══════════════════════════════════════';
  RAISE NOTICE '🎯 SISTEMA DE TRILHOS APLICADO COM SUCESSO!';
  RAISE NOTICE '🎯 ═══════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📊 RESUMO DA INSTALAÇÃO:';
  RAISE NOTICE '  • Trilhos criados: %', trilhos_count;
  RAISE NOTICE '  • Regras configuradas: %', regras_count;
  RAISE NOTICE '  • Configurações de cap: %', config_count;
  RAISE NOTICE '';
  RAISE NOTICE '✅ Próximos passos:';
  RAISE NOTICE '  1. Atualizar os tipos TypeScript';
  RAISE NOTICE '  2. Implementar hooks React Query';
  RAISE NOTICE '  3. Criar componentes da interface';
  RAISE NOTICE '';
  
  -- Mostrar trilhos criados
  FOR trilho IN 
    SELECT nome, titulo, cap_maximo 
    FROM trilhos_desconto 
    WHERE ativo = true 
    ORDER BY ordem_exibicao
  LOOP
    RAISE NOTICE '🛤️  %: % (Cap: %)', 
      UPPER(trilho.nome), 
      trilho.titulo, 
      COALESCE(trilho.cap_maximo::TEXT || '%', 'Sem limite');
  END LOOP;
  
  RAISE NOTICE '';
END $$;