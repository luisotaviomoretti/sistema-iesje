-- =====================================================
-- MIGRATION: 002_seed_data.sql
-- DESCRIÇÃO: Dados iniciais para o sistema IESJE
-- DATA: 2025-08-30
-- AUTOR: Claude Code
-- =====================================================

-- =====================================================
-- CONFIGURAÇÕES INICIAIS DO SISTEMA
-- =====================================================
INSERT INTO public.system_configs (chave, valor, descricao, categoria) VALUES
-- Configurações Financeiras
('max_desconto_total', '101', 'Limite máximo de desconto cumulativo (%)', 'financeiro'),
('moeda_padrao', 'BRL', 'Moeda padrão do sistema', 'financeiro'),
('ano_letivo_atual', '2025', 'Ano letivo vigente', 'geral'),

-- Configurações Gerais da Instituição
('instituicao_nome', 'Instituto São João da Escócia (IESJE)', 'Nome da instituição', 'geral'),
('instituicao_cnpj', '00.000.000/0001-00', 'CNPJ da instituição', 'geral'),
('instituicao_endereco', 'Poços de Caldas, MG', 'Endereço da instituição', 'geral'),
('logo_url', '/lovable-uploads/814e5eba-7015-4421-bfe7-7094b96ef294.png', 'URL do logo da instituição', 'geral'),

-- Configurações de Sistema
('sistema_versao', '1.0.0', 'Versão atual do sistema', 'geral'),
('manutencao_modo', 'false', 'Sistema em modo de manutenção', 'geral'),
('backup_automatico', 'true', 'Backup automático habilitado', 'seguranca'),

-- Configurações de Integração
('api_cep_provider', 'viacep', 'Provedor de API para consulta de CEP', 'integracao'),
('email_smtp_host', 'smtp.gmail.com', 'Servidor SMTP para envio de emails', 'integracao'),
('email_from', 'sistema@iesje.edu.br', 'Email remetente padrão', 'integracao')

ON CONFLICT (chave) DO UPDATE SET
    valor = EXCLUDED.valor,
    descricao = EXCLUDED.descricao,
    categoria = EXCLUDED.categoria,
    updated_at = NOW();

-- =====================================================
-- TIPOS DE DESCONTO INICIAIS
-- =====================================================
INSERT INTO public.tipos_desconto (
    codigo, 
    descricao, 
    percentual_fixo, 
    eh_variavel, 
    documentos_necessarios, 
    nivel_aprovacao_requerido,
    ativo
) VALUES
-- Descontos Familiares
(
    'IIR', 
    'Alunos Irmãos Carnal - 10%', 
    10, 
    false, 
    ARRAY['Certidão de nascimento dos irmãos', 'Comprovante de matrícula do(s) irmão(s)'], 
    'AUTOMATICA',
    true
),
(
    'RES', 
    'Alunos de Outras Cidades - 20%', 
    20, 
    false, 
    ARRAY['Comprovante de residência de outra cidade'], 
    'AUTOMATICA',
    true
),

-- Descontos Profissionais - Docentes
(
    'PASS', 
    'Filhos de Prof. do IESJE Sindicalizados - 100%', 
    100, 
    false, 
    ARRAY['Vínculo empregatício com IESJE', 'Declaração de sindicalização'], 
    'DIRECAO',
    true
),
(
    'PBS', 
    'Filhos Prof. Sind. de Outras Instituições - 40%', 
    40, 
    false, 
    ARRAY['Comprovante de vínculo docente', 'Comprovante de sindicalização'], 
    'COORDENACAO',
    true
),

-- Descontos Profissionais - Funcionários
(
    'COL', 
    'Filhos de Func. do IESJE Sindicalizados (SAAE) - 50%', 
    50, 
    false, 
    ARRAY['Vínculo empregatício com IESJE', 'Comprovante de sindicalização SAAE'], 
    'COORDENACAO',
    true
),
(
    'SAE', 
    'Filhos de Func. Outros Estabelec. Sindicalizados (SAAE) - 40%', 
    40, 
    false, 
    ARRAY['Comprovante de vínculo empregatício', 'Comprovante de sindicalização SAAE'], 
    'COORDENACAO',
    true
),

-- Bolsas Filantrópicas
(
    'ABI', 
    'Bolsa Integral Filantropia - 100%', 
    100, 
    false, 
    ARRAY['Processo de filantropia completo', 'Declaração de hipossuficiência', 'Comprovante de renda familiar'], 
    'DIRECAO',
    true
),
(
    'ABP', 
    'Bolsa Parcial Filantropia - 50%', 
    50, 
    false, 
    ARRAY['Processo de filantropia completo', 'Declaração de hipossuficiência', 'Comprovante de renda familiar'], 
    'COORDENACAO',
    true
),

-- Descontos Comerciais - Pagamento
(
    'PAV', 
    'Pagamento à Vista - 15%', 
    15, 
    false, 
    ARRAY['Comprovante de pagamento integral'], 
    'AUTOMATICA',
    true
),

-- Descontos Comerciais - Geográficos (CEP)
(
    'CEP10', 
    'Comercial — CEP fora de Poços de Caldas - 10%', 
    10, 
    false, 
    ARRAY[]::TEXT[], 
    'AUTOMATICA',
    true
),
(
    'CEP5', 
    'Comercial — CEP em bairro de menor renda (Poços) - 5%', 
    5, 
    false, 
    ARRAY[]::TEXT[], 
    'AUTOMATICA',
    true
),

-- Descontos Comerciais - Fidelidade
(
    'ADIM2', 
    'Comercial — Adimplente perfeito - 2%', 
    2, 
    false, 
    ARRAY['Histórico de adimplência'], 
    'AUTOMATICA',
    true
),

-- Descontos Especiais - Negociação
(
    'COM_EXTRA', 
    'Comercial — Extra (negociação) até 20%', 
    null, 
    true, 
    ARRAY['Justificativa da negociação', 'Aprovação prévia'], 
    'DIRECAO',
    true
)

ON CONFLICT (codigo) DO UPDATE SET
    descricao = EXCLUDED.descricao,
    percentual_fixo = EXCLUDED.percentual_fixo,
    eh_variavel = EXCLUDED.eh_variavel,
    documentos_necessarios = EXCLUDED.documentos_necessarios,
    nivel_aprovacao_requerido = EXCLUDED.nivel_aprovacao_requerido,
    updated_at = NOW();

-- =====================================================
-- FAIXAS DE CEP INICIAIS
-- =====================================================
INSERT INTO public.cep_ranges (
    cep_inicio, 
    cep_fim, 
    categoria, 
    percentual_desconto,
    ativo
) VALUES
-- Poços de Caldas - Região Central (Alta Renda - Sem Desconto)
('37700000', '37711999', 'alta', 0, true),
('37714000', '37719999', 'alta', 0, true),
('37720000', '37799999', 'alta', 0, true),

-- Poços de Caldas - Bairros de Menor Renda (5% de Desconto)
('37712000', '37712999', 'baixa', 5, true),  -- Jardim Esperança
('37713000', '37713999', 'baixa', 5, true),  -- Vila Verde
('37715000', '37715999', 'baixa', 5, true),  -- Jardim Quisisana
('37716000', '37716999', 'baixa', 5, true),  -- Vila Togni
('37717000', '37717999', 'baixa', 5, true),  -- Jardim dos Estados

-- Fora de Poços de Caldas (10% de Desconto)
-- Região 1: CEPs menores que Poços de Caldas
('00000000', '37699999', 'fora', 10, true),
-- Região 2: CEPs maiores que Poços de Caldas  
('37800000', '99999999', 'fora', 10, true)

ON CONFLICT DO NOTHING;

-- =====================================================
-- USUÁRIOS ADMINISTRATIVOS INICIAIS
-- =====================================================
INSERT INTO public.admin_users (email, nome, role, ativo) VALUES
('admin@iesje.edu.br', 'Administrador do Sistema', 'super_admin', true),
('coordenacao@iesje.edu.br', 'Coordenação Acadêmica', 'coordenador', true),
('secretaria@iesje.edu.br', 'Secretaria Escolar', 'operador', true)
ON CONFLICT (email) DO UPDATE SET
    nome = EXCLUDED.nome,
    role = EXCLUDED.role,
    ativo = EXCLUDED.ativo;

-- =====================================================
-- VALORES DE MENSALIDADE POR SÉRIE (como configuração)
-- =====================================================
INSERT INTO public.system_configs (chave, valor, descricao, categoria) VALUES
-- Ensino Fundamental I
('mensalidade_1_ano', '700', 'Valor da mensalidade - 1º ano', 'financeiro'),
('mensalidade_2_ano', '800', 'Valor da mensalidade - 2º ano', 'financeiro'),
('mensalidade_3_ano', '900', 'Valor da mensalidade - 3º ano', 'financeiro'),
('mensalidade_4_ano', '1000', 'Valor da mensalidade - 4º ano', 'financeiro'),
('mensalidade_5_ano', '1100', 'Valor da mensalidade - 5º ano', 'financeiro'),

-- Ensino Fundamental II
('mensalidade_6_ano', '1200', 'Valor da mensalidade - 6º ano', 'financeiro'),
('mensalidade_7_ano', '1300', 'Valor da mensalidade - 7º ano', 'financeiro'),
('mensalidade_8_ano', '1400', 'Valor da mensalidade - 8º ano', 'financeiro'),
('mensalidade_9_ano', '1500', 'Valor da mensalidade - 9º ano', 'financeiro'),

-- Ensino Médio
('mensalidade_1_serie_em', '1600', 'Valor da mensalidade - 1ª série EM', 'financeiro'),
('mensalidade_2_serie_em', '1700', 'Valor da mensalidade - 2ª série EM', 'financeiro'),
('mensalidade_3_serie_em', '1800', 'Valor da mensalidade - 3ª série EM', 'financeiro')

ON CONFLICT (chave) DO UPDATE SET
    valor = EXCLUDED.valor,
    updated_at = NOW();

-- =====================================================
-- LOG DE INICIALIZAÇÃO
-- =====================================================
INSERT INTO public.audit_logs (
    tabela, 
    registro_id, 
    acao, 
    dados_novos,
    timestamp
) VALUES (
    'system_migration',
    '002_seed_data',
    'CREATE',
    '{"message": "Dados iniciais inseridos com sucesso", "migration": "002_seed_data.sql"}'::jsonb,
    NOW()
);

-- =====================================================
-- FIM DOS DADOS INICIAIS
-- =====================================================
