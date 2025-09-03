-- =====================================================
-- MIGRATION: 001_initial_schema.sql
-- DESCRIÇÃO: Schema inicial para o sistema IESJE
-- DATA: 2025-08-30
-- AUTOR: Claude Code
-- =====================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABELA: system_configs
-- DESCRIÇÃO: Configurações globais do sistema
-- =====================================================
CREATE TABLE IF NOT EXISTS public.system_configs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    chave TEXT NOT NULL UNIQUE,
    valor TEXT NOT NULL,
    descricao TEXT,
    categoria TEXT DEFAULT 'geral',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by TEXT,
    
    -- Constraints
    CONSTRAINT system_configs_chave_length CHECK (length(chave) >= 3),
    CONSTRAINT system_configs_categoria_valid CHECK (categoria IN ('geral', 'financeiro', 'integracao', 'seguranca'))
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_system_configs_chave ON public.system_configs(chave);
CREATE INDEX IF NOT EXISTS idx_system_configs_categoria ON public.system_configs(categoria);

-- =====================================================
-- TABELA: tipos_desconto
-- DESCRIÇÃO: Tipos de desconto disponíveis no sistema
-- =====================================================
CREATE TABLE IF NOT EXISTS public.tipos_desconto (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    codigo TEXT NOT NULL UNIQUE,
    descricao TEXT NOT NULL,
    percentual_fixo INTEGER,
    eh_variavel BOOLEAN DEFAULT FALSE,
    documentos_necessarios TEXT[] DEFAULT '{}',
    nivel_aprovacao_requerido TEXT NOT NULL DEFAULT 'AUTOMATICA',
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT tipos_desconto_codigo_format CHECK (codigo ~ '^[A-Z0-9_]+$'),
    CONSTRAINT tipos_desconto_percentual_range CHECK (percentual_fixo IS NULL OR (percentual_fixo >= 0 AND percentual_fixo <= 100)),
    CONSTRAINT tipos_desconto_nivel_aprovacao CHECK (nivel_aprovacao_requerido IN ('AUTOMATICA', 'COORDENACAO', 'DIRECAO')),
    CONSTRAINT tipos_desconto_percentual_logic CHECK (
        (eh_variavel = TRUE AND percentual_fixo IS NULL) OR 
        (eh_variavel = FALSE AND percentual_fixo IS NOT NULL)
    )
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_tipos_desconto_codigo ON public.tipos_desconto(codigo);
CREATE INDEX IF NOT EXISTS idx_tipos_desconto_ativo ON public.tipos_desconto(ativo);
CREATE INDEX IF NOT EXISTS idx_tipos_desconto_nivel ON public.tipos_desconto(nivel_aprovacao_requerido);

-- =====================================================
-- TABELA: cep_ranges
-- DESCRIÇÃO: Faixas de CEP e suas classificações
-- =====================================================
CREATE TABLE IF NOT EXISTS public.cep_ranges (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    cep_inicio TEXT NOT NULL,
    cep_fim TEXT NOT NULL,
    categoria TEXT NOT NULL,
    percentual_desconto INTEGER DEFAULT 0,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT cep_ranges_categoria_valid CHECK (categoria IN ('fora', 'baixa', 'alta')),
    CONSTRAINT cep_ranges_percentual_range CHECK (percentual_desconto >= 0 AND percentual_desconto <= 100),
    CONSTRAINT cep_ranges_cep_format CHECK (
        cep_inicio ~ '^[0-9]{8}$' AND 
        cep_fim ~ '^[0-9]{8}$'
    ),
    CONSTRAINT cep_ranges_logic CHECK (cep_inicio <= cep_fim)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_cep_ranges_categoria ON public.cep_ranges(categoria);
CREATE INDEX IF NOT EXISTS idx_cep_ranges_ativo ON public.cep_ranges(ativo);
CREATE INDEX IF NOT EXISTS idx_cep_ranges_search ON public.cep_ranges(cep_inicio, cep_fim);

-- =====================================================
-- TABELA: admin_users
-- DESCRIÇÃO: Usuários com acesso administrativo
-- =====================================================
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    nome TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'operador',
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT admin_users_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT admin_users_role_valid CHECK (role IN ('super_admin', 'coordenador', 'operador')),
    CONSTRAINT admin_users_nome_length CHECK (length(nome) >= 2)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON public.admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON public.admin_users(role);
CREATE INDEX IF NOT EXISTS idx_admin_users_ativo ON public.admin_users(ativo);

-- =====================================================
-- TABELA: audit_logs
-- DESCRIÇÃO: Logs de auditoria para rastreabilidade
-- =====================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tabela TEXT NOT NULL,
    registro_id TEXT NOT NULL,
    acao TEXT NOT NULL,
    dados_anteriores JSONB,
    dados_novos JSONB,
    usuario_id UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    
    -- Constraints
    CONSTRAINT audit_logs_acao_valid CHECK (acao IN ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT'))
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_tabela ON public.audit_logs(tabela);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_usuario_id ON public.audit_logs(usuario_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_registro_id ON public.audit_logs(registro_id);

-- =====================================================
-- FUNCTIONS: Triggers para updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar triggers de updated_at
CREATE TRIGGER trigger_system_configs_updated_at
    BEFORE UPDATE ON public.system_configs
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trigger_tipos_desconto_updated_at
    BEFORE UPDATE ON public.tipos_desconto
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trigger_cep_ranges_updated_at
    BEFORE UPDATE ON public.cep_ranges
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- =====================================================
-- FUNCTION: Audit Log Trigger
-- =====================================================
CREATE OR REPLACE FUNCTION public.audit_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO public.audit_logs (
            tabela, registro_id, acao, dados_anteriores
        ) VALUES (
            TG_TABLE_NAME, OLD.id::TEXT, 'DELETE', to_jsonb(OLD)
        );
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO public.audit_logs (
            tabela, registro_id, acao, dados_anteriores, dados_novos
        ) VALUES (
            TG_TABLE_NAME, NEW.id::TEXT, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW)
        );
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO public.audit_logs (
            tabela, registro_id, acao, dados_novos
        ) VALUES (
            TG_TABLE_NAME, NEW.id::TEXT, 'CREATE', to_jsonb(NEW)
        );
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Aplicar triggers de auditoria nas tabelas críticas
CREATE TRIGGER trigger_tipos_desconto_audit
    AFTER INSERT OR UPDATE OR DELETE ON public.tipos_desconto
    FOR EACH ROW
    EXECUTE FUNCTION public.audit_changes();

CREATE TRIGGER trigger_cep_ranges_audit
    AFTER INSERT OR UPDATE OR DELETE ON public.cep_ranges
    FOR EACH ROW
    EXECUTE FUNCTION public.audit_changes();

CREATE TRIGGER trigger_system_configs_audit
    AFTER INSERT OR UPDATE OR DELETE ON public.system_configs
    FOR EACH ROW
    EXECUTE FUNCTION public.audit_changes();

-- =====================================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================
COMMENT ON TABLE public.system_configs IS 'Configurações globais do sistema IESJE';
COMMENT ON TABLE public.tipos_desconto IS 'Tipos de desconto disponíveis para matrículas';
COMMENT ON TABLE public.cep_ranges IS 'Faixas de CEP e suas classificações para descontos regionais';
COMMENT ON TABLE public.admin_users IS 'Usuários com privilégios administrativos';
COMMENT ON TABLE public.audit_logs IS 'Log de auditoria para rastreabilidade de alterações';

COMMENT ON COLUMN public.tipos_desconto.eh_variavel IS 'TRUE = percentual definido na aplicação, FALSE = percentual fixo';
COMMENT ON COLUMN public.tipos_desconto.documentos_necessarios IS 'Array de strings com documentos obrigatórios';
COMMENT ON COLUMN public.cep_ranges.categoria IS 'fora = fora de Poços, baixa = baixa renda, alta = alta renda';
COMMENT ON COLUMN public.admin_users.role IS 'super_admin = acesso total, coordenador = aprovações, operador = consulta';

-- =====================================================
-- FIM DO SCHEMA INICIAL
-- =====================================================