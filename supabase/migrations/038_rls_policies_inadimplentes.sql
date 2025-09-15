-- =====================================================
-- MIGRATION: 038_rls_policies_inadimplentes.sql
-- DESCRIÇÃO: RLS e Policies para as tabelas de inadimplência
--            (inadimplentes, inadimplentes_audit, staging_inadimplentes_raw)
--            Reutiliza funções auxiliares já existentes:
--            public.is_admin_user(), public.can_approve(), public.is_super_admin()
-- DATA: 2025-09-15
-- AUTOR: Cascade
-- =====================================================

-- Segurança: esta migração apenas configura RLS/policies e GRANTs de forma restritiva.
-- Não altera dados e não expõe campos sensíveis além do necessário.

-- =====================================================
-- HABILITAR RLS
-- =====================================================
ALTER TABLE public.inadimplentes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inadimplentes_audit    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staging_inadimplentes_raw ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- REVOKE E GRANTS BÁSICOS
--   Princípio: negar por padrão; conceder mínimo necessário.
-- =====================================================
-- inadimplentes
REVOKE ALL ON public.inadimplentes FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.inadimplentes TO authenticated;
GRANT ALL ON public.inadimplentes TO service_role; -- para tarefas internas e RPCs com service_role

-- inadimplentes_audit
REVOKE ALL ON public.inadimplentes_audit FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.inadimplentes_audit TO authenticated; -- leitura por admins via RLS
GRANT ALL ON public.inadimplentes_audit TO service_role;     -- gravação via funções/serviço

-- staging_inadimplentes_raw
REVOKE ALL ON public.staging_inadimplentes_raw FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staging_inadimplentes_raw TO authenticated; -- painel admin
GRANT ALL ON public.staging_inadimplentes_raw TO service_role;

-- =====================================================
-- POLÍTICAS: public.inadimplentes
-- =====================================================
-- Leitura: qualquer admin
CREATE POLICY "Admins podem ler inadimplentes"
  ON public.inadimplentes
  FOR SELECT
  USING (public.is_admin_user());

-- Inserção: coordenadores e super_admin
CREATE POLICY "Coordenadores/Super podem inserir inadimplentes"
  ON public.inadimplentes
  FOR INSERT
  WITH CHECK (public.can_approve() OR public.is_super_admin());

-- Atualização: coordenadores e super_admin (inclui soft delete via is_active=false)
CREATE POLICY "Coordenadores/Super podem atualizar inadimplentes"
  ON public.inadimplentes
  FOR UPDATE
  USING (public.can_approve() OR public.is_super_admin())
  WITH CHECK (public.can_approve() OR public.is_super_admin());

-- Delete físico: somente super_admin (não recomendado; usamos soft delete)
CREATE POLICY "Super admins podem deletar inadimplentes"
  ON public.inadimplentes
  FOR DELETE
  USING (public.is_super_admin());

-- =====================================================
-- POLÍTICAS: public.inadimplentes_audit
-- =====================================================
-- Leitura: admins
CREATE POLICY "Admins podem ler inadimplentes_audit"
  ON public.inadimplentes_audit
  FOR SELECT
  USING (public.is_admin_user());

-- Não definimos políticas de INSERT/UPDATE/DELETE para authenticated: 
--   - Gravação será realizada por service_role (bypass RLS) ou funções SECURITY DEFINER.

-- =====================================================
-- POLÍTICAS: public.staging_inadimplentes_raw
-- =====================================================
-- Painel admin: admins podem gerenciar staging (importação CSV)
CREATE POLICY "Admins podem ler staging_inadimplentes_raw"
  ON public.staging_inadimplentes_raw
  FOR SELECT
  USING (public.is_admin_user());

CREATE POLICY "Admins podem inserir staging_inadimplentes_raw"
  ON public.staging_inadimplentes_raw
  FOR INSERT
  WITH CHECK (public.is_admin_user());

CREATE POLICY "Admins podem atualizar staging_inadimplentes_raw"
  ON public.staging_inadimplentes_raw
  FOR UPDATE
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

CREATE POLICY "Admins podem deletar staging_inadimplentes_raw"
  ON public.staging_inadimplentes_raw
  FOR DELETE
  USING (public.is_admin_user());

-- =====================================================
-- NOTAS
-- 1) O frontend da Rematrícula não acessará diretamente `inadimplentes`.
--    A checagem será via RPC SECURITY DEFINER (F3) retornando apenas booleano/dados mínimos.
-- 2) O painel administrativo (authenticated + admin_users) consegue gerenciar staging
--    e visualizar audit graças às políticas acima.
-- 3) service_role mantém acesso total para rotinas internas e migrações.
-- =====================================================
