-- =====================================================
-- MIGRATION: 003_rls_policies.sql
-- DESCRIÇÃO: Políticas de Row Level Security (RLS)
-- DATA: 2025-08-30
-- AUTOR: Claude Code
-- =====================================================

-- =====================================================
-- HABILITAR RLS EM TODAS AS TABELAS
-- =====================================================
ALTER TABLE public.system_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tipos_desconto ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cep_ranges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- FUNÇÕES AUXILIARES PARA RLS
-- =====================================================

-- Função para verificar se o usuário é admin
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN AS $$
BEGIN
    -- Verifica se o usuário autenticado é um admin ativo
    RETURN EXISTS (
        SELECT 1 
        FROM public.admin_users 
        WHERE email = auth.jwt() ->> 'email' 
        AND ativo = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter o papel do usuário admin
CREATE OR REPLACE FUNCTION public.get_admin_role()
RETURNS TEXT AS $$
BEGIN
    RETURN (
        SELECT role 
        FROM public.admin_users 
        WHERE email = auth.jwt() ->> 'email' 
        AND ativo = true
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar se o usuário é super admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN get_admin_role() = 'super_admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar se o usuário pode aprovar (coordenador ou super_admin)
CREATE OR REPLACE FUNCTION public.can_approve()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN get_admin_role() IN ('coordenador', 'super_admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- POLÍTICAS PARA: system_configs
-- =====================================================

-- Super admins podem fazer tudo
CREATE POLICY "Super admins full access on system_configs"
    ON public.system_configs
    FOR ALL
    USING (is_super_admin())
    WITH CHECK (is_super_admin());

-- Coordenadores e operadores podem apenas ler configurações não sensíveis
CREATE POLICY "Admins read system_configs"
    ON public.system_configs
    FOR SELECT
    USING (
        is_admin_user() 
        AND categoria NOT IN ('seguranca')
    );

-- =====================================================
-- POLÍTICAS PARA: tipos_desconto
-- =====================================================

-- Super admins podem fazer tudo
CREATE POLICY "Super admins full access on tipos_desconto"
    ON public.tipos_desconto
    FOR ALL
    USING (is_super_admin())
    WITH CHECK (is_super_admin());

-- Coordenadores podem ler e editar (mas não deletar)
CREATE POLICY "Coordenadores read/update tipos_desconto"
    ON public.tipos_desconto
    FOR SELECT
    USING (can_approve());

CREATE POLICY "Coordenadores update tipos_desconto"
    ON public.tipos_desconto
    FOR UPDATE
    USING (can_approve())
    WITH CHECK (can_approve());

-- Operadores podem apenas ler
CREATE POLICY "Operadores read tipos_desconto"
    ON public.tipos_desconto
    FOR SELECT
    USING (is_admin_user());

-- =====================================================
-- POLÍTICAS PARA: cep_ranges
-- =====================================================

-- Super admins podem fazer tudo
CREATE POLICY "Super admins full access on cep_ranges"
    ON public.cep_ranges
    FOR ALL
    USING (is_super_admin())
    WITH CHECK (is_super_admin());

-- Coordenadores podem ler e editar
CREATE POLICY "Coordenadores read/update cep_ranges"
    ON public.cep_ranges
    FOR SELECT
    USING (can_approve());

CREATE POLICY "Coordenadores update cep_ranges"
    ON public.cep_ranges
    FOR UPDATE
    USING (can_approve())
    WITH CHECK (can_approve());

CREATE POLICY "Coordenadores insert cep_ranges"
    ON public.cep_ranges
    FOR INSERT
    WITH CHECK (can_approve());

-- Operadores podem apenas ler
CREATE POLICY "Operadores read cep_ranges"
    ON public.cep_ranges
    FOR SELECT
    USING (is_admin_user());

-- =====================================================
-- POLÍTICAS PARA: admin_users
-- =====================================================

-- Super admins podem fazer tudo
CREATE POLICY "Super admins full access on admin_users"
    ON public.admin_users
    FOR ALL
    USING (is_super_admin())
    WITH CHECK (is_super_admin());

-- Usuários podem ver seu próprio perfil
CREATE POLICY "Users can view own profile"
    ON public.admin_users
    FOR SELECT
    USING (email = auth.jwt() ->> 'email');

-- Coordenadores podem ver outros usuários (mas não editar)
CREATE POLICY "Coordenadores read other admin_users"
    ON public.admin_users
    FOR SELECT
    USING (
        can_approve() 
        AND email != auth.jwt() ->> 'email'
    );

-- =====================================================
-- POLÍTICAS PARA: audit_logs
-- =====================================================

-- Super admins podem ver todos os logs
CREATE POLICY "Super admins read all audit_logs"
    ON public.audit_logs
    FOR SELECT
    USING (is_super_admin());

-- Coordenadores podem ver logs relacionados às suas ações
CREATE POLICY "Coordenadores read own audit_logs"
    ON public.audit_logs
    FOR SELECT
    USING (
        can_approve()
        AND (
            usuario_id = (
                SELECT id FROM public.admin_users 
                WHERE email = auth.jwt() ->> 'email'
            )
            OR tabela NOT IN ('admin_users', 'system_configs')
        )
    );

-- Operadores podem ver logs de suas próprias ações
CREATE POLICY "Operadores read own audit_logs"
    ON public.audit_logs
    FOR SELECT
    USING (
        is_admin_user()
        AND usuario_id = (
            SELECT id FROM public.admin_users 
            WHERE email = auth.jwt() ->> 'email'
        )
    );

-- Apenas o sistema pode inserir logs (via triggers)
CREATE POLICY "System can insert audit_logs"
    ON public.audit_logs
    FOR INSERT
    WITH CHECK (true); -- Controlado pelos triggers

-- =====================================================
-- POLÍTICAS ESPECIAIS PARA CONSULTAS PÚBLICAS
-- =====================================================

-- Permitir consulta pública de tipos de desconto ativos (para o sistema de matrícula)
CREATE POLICY "Public read active tipos_desconto"
    ON public.tipos_desconto
    FOR SELECT
    USING (ativo = true);

-- Permitir consulta pública de faixas de CEP ativas (para classificação automática)
CREATE POLICY "Public read active cep_ranges"
    ON public.cep_ranges
    FOR SELECT
    USING (ativo = true);

-- Permitir consulta pública de algumas configurações não sensíveis
CREATE POLICY "Public read basic system_configs"
    ON public.system_configs
    FOR SELECT
    USING (
        categoria IN ('geral', 'financeiro') 
        AND chave NOT LIKE '%_key%' 
        AND chave NOT LIKE '%_secret%'
        AND chave NOT LIKE '%_password%'
    );

-- =====================================================
-- FUNÇÕES PARA BYPASSAR RLS EM CONTEXTOS ESPECÍFICOS
-- =====================================================

-- Função para obter tipos de desconto (usada pelo sistema)
CREATE OR REPLACE FUNCTION public.get_active_discount_types()
RETURNS SETOF public.tipos_desconto AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM public.tipos_desconto
    WHERE ativo = true
    ORDER BY codigo;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para classificar CEP (usada pelo sistema)
CREATE OR REPLACE FUNCTION public.classify_cep(input_cep TEXT)
RETURNS TABLE(categoria TEXT, percentual_desconto INTEGER) AS $$
BEGIN
    -- Remove formatação do CEP
    input_cep := regexp_replace(input_cep, '[^0-9]', '', 'g');
    
    -- Verifica se tem 8 dígitos
    IF LENGTH(input_cep) != 8 THEN
        RETURN QUERY SELECT ''::TEXT, 0::INTEGER;
        RETURN;
    END IF;
    
    -- Busca a faixa correspondente
    RETURN QUERY
    SELECT cr.categoria, cr.percentual_desconto
    FROM public.cep_ranges cr
    WHERE cr.ativo = true
    AND input_cep >= cr.cep_inicio
    AND input_cep <= cr.cep_fim
    ORDER BY cr.categoria DESC -- Prioriza 'fora' > 'baixa' > 'alta'
    LIMIT 1;
    
    -- Se não encontrou, retorna vazio
    IF NOT FOUND THEN
        RETURN QUERY SELECT ''::TEXT, 0::INTEGER;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter configuração do sistema
CREATE OR REPLACE FUNCTION public.get_system_config(config_key TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN (
        SELECT valor 
        FROM public.system_configs 
        WHERE chave = config_key 
        AND categoria NOT IN ('seguranca')
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- GRANTS PARA FUNÇÕES PÚBLICAS
-- =====================================================
GRANT EXECUTE ON FUNCTION public.get_active_discount_types() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.classify_cep(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_system_config(TEXT) TO anon, authenticated;

-- =====================================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================
COMMENT ON FUNCTION public.is_admin_user() IS 'Verifica se o usuário autenticado é um administrador ativo';
COMMENT ON FUNCTION public.get_admin_role() IS 'Retorna o papel do usuário admin autenticado';
COMMENT ON FUNCTION public.is_super_admin() IS 'Verifica se o usuário é super administrador';
COMMENT ON FUNCTION public.can_approve() IS 'Verifica se o usuário pode aprovar (coordenador ou super_admin)';
COMMENT ON FUNCTION public.classify_cep(TEXT) IS 'Classifica um CEP e retorna categoria e percentual de desconto';
COMMENT ON FUNCTION public.get_system_config(TEXT) IS 'Obtém valor de configuração do sistema (não sensível)';

-- =====================================================
-- LOG DE FINALIZAÇÃO
-- =====================================================
INSERT INTO public.audit_logs (
    tabela, 
    registro_id, 
    acao, 
    dados_novos,
    timestamp
) VALUES (
    'system_migration',
    '003_rls_policies',
    'CREATE',
    '{"message": "Políticas RLS configuradas com sucesso", "migration": "003_rls_policies.sql"}'::jsonb,
    NOW()
);

-- =====================================================
-- FIM DAS POLÍTICAS RLS
-- =====================================================