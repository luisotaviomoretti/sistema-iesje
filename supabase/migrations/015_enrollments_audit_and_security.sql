-- =====================================================
-- MIGRATION: 015_enrollments_audit_and_security.sql
-- DESCRIÇÃO: Auditoria para tabelas de matrículas e revisão de segurança
-- DATA: 2025-01-10
-- =====================================================

-- Função de auditoria com associação de usuário admin (se houver)
CREATE OR REPLACE FUNCTION public.audit_changes_enrollments()
RETURNS TRIGGER AS $$
DECLARE
  v_usuario_id UUID;
BEGIN
  -- Tenta identificar o usuário admin pela claim de email do JWT
  BEGIN
    SELECT au.id INTO v_usuario_id
    FROM public.admin_users au
    WHERE au.email = auth.jwt() ->> 'email' AND au.ativo = true
    LIMIT 1;
  EXCEPTION WHEN others THEN
    v_usuario_id := NULL;
  END;

  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (
      tabela, registro_id, acao, dados_anteriores, usuario_id
    ) VALUES (
      TG_TABLE_NAME, OLD.id::TEXT, 'DELETE', to_jsonb(OLD), v_usuario_id
    );
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (
      tabela, registro_id, acao, dados_anteriores, dados_novos, usuario_id
    ) VALUES (
      TG_TABLE_NAME, NEW.id::TEXT, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), v_usuario_id
    );
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (
      tabela, registro_id, acao, dados_novos, usuario_id
    ) VALUES (
      TG_TABLE_NAME, NEW.id::TEXT, 'CREATE', to_jsonb(NEW), v_usuario_id
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers de auditoria nas tabelas de matrícula
DROP TRIGGER IF EXISTS trigger_enrollments_audit ON public.enrollments;
CREATE TRIGGER trigger_enrollments_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.enrollments
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_changes_enrollments();

DROP TRIGGER IF EXISTS trigger_enrollment_discounts_audit ON public.enrollment_discounts;
CREATE TRIGGER trigger_enrollment_discounts_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.enrollment_discounts
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_changes_enrollments();

DROP TRIGGER IF EXISTS trigger_enrollment_documents_audit ON public.enrollment_documents;
CREATE TRIGGER trigger_enrollment_documents_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.enrollment_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_changes_enrollments();

-- Comentários
COMMENT ON FUNCTION public.audit_changes_enrollments() IS 'Audita mudanças nas tabelas de matrícula vinculando ao admin autenticado quando possível.';

-- Observação de segurança (documentação):
--  - RLS já impõe que apenas admins possam SELECT/UPDATE/DELETE nas tabelas de matrícula.
--  - INSERT público permanece permitido para criação inicial via fluxo público.
--  - Triggers de auditoria rodam no contexto do banco e registram as operações sem expor dados sensíveis.

