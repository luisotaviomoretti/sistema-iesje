-- ==================================================
-- Migração: Popular documentos iniciais por desconto
-- Data: 2025-01-09
-- Descrição: Dados iniciais dos documentos necessários para cada tipo de desconto
-- ==================================================

-- Função auxiliar para inserir documentos de forma segura
CREATE OR REPLACE FUNCTION insert_discount_document(
  p_codigo TEXT,
  p_document_name TEXT,
  p_document_description TEXT,
  p_display_order INTEGER DEFAULT 0,
  p_is_required BOOLEAN DEFAULT true,
  p_accepted_formats TEXT[] DEFAULT ARRAY['PDF', 'JPG', 'PNG'],
  p_max_size_mb INTEGER DEFAULT 5
) RETURNS VOID AS $$
DECLARE
  v_discount_id UUID;
BEGIN
  -- Buscar o ID do desconto pelo código
  SELECT id INTO v_discount_id 
  FROM public.tipos_desconto 
  WHERE codigo = p_codigo;
  
  IF v_discount_id IS NULL THEN
    RAISE NOTICE 'Desconto com código % não encontrado', p_codigo;
    RETURN;
  END IF;
  
  -- Verificar se o documento já existe
  IF NOT EXISTS (
    SELECT 1 FROM public.discount_documents 
    WHERE discount_id = v_discount_id 
    AND document_name = p_document_name
  ) THEN
    INSERT INTO public.discount_documents (
      discount_id,
      document_name,
      document_description,
      display_order,
      is_required,
      accepted_formats,
      max_size_mb
    ) VALUES (
      v_discount_id,
      p_document_name,
      p_document_description,
      p_display_order,
      p_is_required,
      p_accepted_formats,
      p_max_size_mb
    );
    RAISE NOTICE 'Documento "%" adicionado para desconto %', p_document_name, p_codigo;
  ELSE
    RAISE NOTICE 'Documento "%" já existe para desconto %', p_document_name, p_codigo;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- =========================================
-- IIR - ALUNOS IRMÃOS (10%)
-- =========================================
SELECT insert_discount_document(
  'IIR',
  'Comprovante de Matrícula do Irmão',
  'Declaração oficial de matrícula do irmão já estudante do IESJE para o período vigente',
  1
);

SELECT insert_discount_document(
  'IIR',
  'Certidão de Nascimento dos Irmãos',
  'Certidão de nascimento ou documento oficial comprovando o parentesco entre os alunos',
  2
);

-- =========================================
-- RES - ALUNOS DE OUTRAS CIDADES (20%)
-- =========================================
SELECT insert_discount_document(
  'RES',
  'Comprovante de Residência',
  'Comprovante de endereço em nome do responsável, emitido há no máximo 3 meses, comprovando residência em outra cidade',
  1
);

SELECT insert_discount_document(
  'RES',
  'Declaração de Residência',
  'Declaração com firma reconhecida, caso o comprovante não esteja em nome do responsável',
  2,
  false -- não obrigatório
);

-- =========================================
-- PASS - FILHOS DE PROFESSORES IESJE SINDICALIZADOS (100%)
-- =========================================
SELECT insert_discount_document(
  'PASS',
  'Contracheque ou Declaração de Vínculo',
  'Último contracheque ou declaração oficial do RH comprovando vínculo empregatício como professor no IESJE',
  1
);

SELECT insert_discount_document(
  'PASS',
  'Comprovante de Sindicalização',
  'Carteirinha do sindicato ou declaração de filiação sindical atualizada',
  2
);

SELECT insert_discount_document(
  'PASS',
  'Certidão de Nascimento ou RG',
  'Documento oficial comprovando filiação ao professor beneficiário',
  3
);

-- =========================================
-- PBS - FILHOS PROF. SINDICALIZADOS DE OUTRAS INSTITUIÇÕES (40%)
-- =========================================
SELECT insert_discount_document(
  'PBS',
  'Contracheque ou Declaração de Vínculo',
  'Último contracheque ou declaração oficial comprovando atuação como professor em instituição de ensino',
  1
);

SELECT insert_discount_document(
  'PBS',
  'Comprovante de Sindicalização',
  'Carteirinha do sindicato dos professores ou declaração de filiação sindical atualizada',
  2
);

SELECT insert_discount_document(
  'PBS',
  'Certidão de Nascimento ou RG',
  'Documento oficial comprovando filiação ao professor beneficiário',
  3
);

-- =========================================
-- COL - FILHOS DE FUNCIONÁRIOS IESJE (SAAE) (50%)
-- =========================================
SELECT insert_discount_document(
  'COL',
  'Contracheque ou Declaração de Vínculo',
  'Último contracheque ou declaração oficial do RH comprovando vínculo empregatício com o IESJE',
  1
);

SELECT insert_discount_document(
  'COL',
  'Comprovante de Filiação ao SAAE',
  'Carteirinha do SAAE ou declaração de filiação atualizada',
  2
);

SELECT insert_discount_document(
  'COL',
  'Certidão de Nascimento ou RG',
  'Documento oficial comprovando filiação ao funcionário beneficiário',
  3
);

-- =========================================
-- SAE - FILHOS DE FUNC. OUTROS ESTABELECIMENTOS (SAAE) (40%)
-- =========================================
SELECT insert_discount_document(
  'SAE',
  'Contracheque ou Carteira de Trabalho',
  'Último contracheque ou página da carteira de trabalho comprovando vínculo empregatício',
  1
);

SELECT insert_discount_document(
  'SAE',
  'Comprovante de Filiação ao SAAE',
  'Carteirinha do SAAE ou declaração de filiação atualizada',
  2
);

SELECT insert_discount_document(
  'SAE',
  'Certidão de Nascimento ou RG',
  'Documento oficial comprovando filiação ao funcionário beneficiário',
  3
);

-- =========================================
-- ABI - BOLSA INTEGRAL FILANTROPIA (100%)
-- =========================================
SELECT insert_discount_document(
  'ABI',
  'Estudo Socioeconômico',
  'Relatório socioeconômico completo emitido por assistente social credenciado',
  1,
  true,
  ARRAY['PDF'],
  10
);

SELECT insert_discount_document(
  'ABI',
  'Comprovantes de Renda Familiar',
  'Comprovantes de renda de TODOS os membros da família dos últimos 3 meses',
  2,
  true,
  ARRAY['PDF', 'JPG', 'PNG'],
  10
);

SELECT insert_discount_document(
  'ABI',
  'Comprovantes de Despesas Básicas',
  'Contas de água, luz, telefone, aluguel e outras despesas essenciais dos últimos 3 meses',
  3,
  true,
  ARRAY['PDF', 'JPG', 'PNG'],
  10
);

SELECT insert_discount_document(
  'ABI',
  'Declaração de Imposto de Renda',
  'Declaração completa ou declaração de isenção de todos os responsáveis',
  4,
  true,
  ARRAY['PDF'],
  10
);

SELECT insert_discount_document(
  'ABI',
  'Fotos da Residência',
  'Fotos atuais da fachada e cômodos principais da residência',
  5,
  false, -- opcional
  ARRAY['JPG', 'PNG'],
  20
);

-- =========================================
-- ABP - BOLSA PARCIAL FILANTROPIA (50%)
-- =========================================
SELECT insert_discount_document(
  'ABP',
  'Estudo Socioeconômico',
  'Relatório socioeconômico emitido por assistente social credenciado',
  1,
  true,
  ARRAY['PDF'],
  10
);

SELECT insert_discount_document(
  'ABP',
  'Comprovantes de Renda dos Responsáveis',
  'Comprovantes de renda dos responsáveis financeiros dos últimos 3 meses',
  2,
  true,
  ARRAY['PDF', 'JPG', 'PNG'],
  10
);

SELECT insert_discount_document(
  'ABP',
  'Declaração de Imposto de Renda',
  'Declaração completa ou declaração de isenção dos responsáveis',
  3,
  false, -- opcional
  ARRAY['PDF'],
  10
);

-- =========================================
-- PAV - PAGAMENTO À VISTA (15%)
-- =========================================
SELECT insert_discount_document(
  'PAV',
  'Comprovante de Capacidade Financeira',
  'Extrato bancário ou comprovante de recursos para pagamento integral à vista (documento opcional)',
  1,
  false, -- não obrigatório
  ARRAY['PDF', 'JPG', 'PNG'],
  5
);

-- =========================================
-- CEP - DESCONTO POR LOCALIZAÇÃO (variável)
-- =========================================
-- Desconto CEP geralmente não requer documentação adicional,
-- pois é validado automaticamente pelo endereço informado

-- =========================================
-- ADI - DESCONTO ADIMPLÊNCIA (variável)
-- =========================================
-- Desconto de adimplência é validado automaticamente pelo histórico
-- de pagamentos, não requer documentação adicional

-- =========================================
-- COM - DESCONTOS COMERCIAIS (variável)
-- =========================================
SELECT insert_discount_document(
  'COM',
  'Documento Específico da Campanha',
  'Documentação específica conforme regras da campanha comercial vigente',
  1,
  false, -- depende da campanha
  ARRAY['PDF', 'JPG', 'PNG'],
  5
);

-- Limpar função temporária
DROP FUNCTION IF EXISTS insert_discount_document;

-- Estatísticas finais
DO $$ 
DECLARE
  v_total_documents INTEGER;
  v_total_discounts INTEGER;
  r RECORD;
BEGIN 
  SELECT COUNT(*) INTO v_total_documents FROM public.discount_documents;
  SELECT COUNT(DISTINCT discount_id) INTO v_total_discounts FROM public.discount_documents;
  
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'População de documentos concluída!';
  RAISE NOTICE 'Total de documentos cadastrados: %', v_total_documents;
  RAISE NOTICE 'Total de descontos com documentos: %', v_total_discounts;
  RAISE NOTICE '===========================================';
  
  -- Mostrar resumo por desconto
  RAISE NOTICE 'Resumo por tipo de desconto:';
  FOR r IN 
    SELECT 
      td.codigo,
      td.descricao,
      COUNT(dd.id) as total_docs,
      COUNT(CASE WHEN dd.is_required THEN 1 END) as docs_obrigatorios
    FROM public.tipos_desconto td
    LEFT JOIN public.discount_documents dd ON dd.discount_id = td.id
    WHERE td.ativo = true
    GROUP BY td.codigo, td.descricao
    ORDER BY td.codigo
  LOOP
    RAISE NOTICE '  % - %: % documentos (% obrigatórios)', 
      r.codigo, r.descricao, r.total_docs, r.docs_obrigatorios;
  END LOOP;
END $$;