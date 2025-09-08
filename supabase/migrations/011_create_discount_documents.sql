-- ==================================================
-- Migração: Criar tabela de documentos por desconto
-- Data: 2025-01-09
-- Descrição: Sistema dinâmico de documentos necessários
-- ==================================================

-- Criar tabela de documentos vinculados aos descontos
CREATE TABLE IF NOT EXISTS public.discount_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  discount_id UUID REFERENCES public.tipos_desconto(id) ON DELETE CASCADE,
  document_name VARCHAR(255) NOT NULL,
  document_description TEXT,
  is_required BOOLEAN DEFAULT true,
  accepted_formats TEXT[] DEFAULT ARRAY['PDF', 'JPG', 'PNG'],
  max_size_mb INTEGER DEFAULT 5,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comentários para documentação
COMMENT ON TABLE public.discount_documents IS 'Documentos necessários para cada tipo de desconto';
COMMENT ON COLUMN public.discount_documents.discount_id IS 'Referência ao tipo de desconto';
COMMENT ON COLUMN public.discount_documents.document_name IS 'Nome do documento exibido ao usuário';
COMMENT ON COLUMN public.discount_documents.document_description IS 'Descrição detalhada do documento';
COMMENT ON COLUMN public.discount_documents.is_required IS 'Indica se o documento é obrigatório';
COMMENT ON COLUMN public.discount_documents.accepted_formats IS 'Formatos aceitos para upload';
COMMENT ON COLUMN public.discount_documents.max_size_mb IS 'Tamanho máximo do arquivo em MB';
COMMENT ON COLUMN public.discount_documents.display_order IS 'Ordem de exibição dos documentos';
COMMENT ON COLUMN public.discount_documents.is_active IS 'Indica se o documento está ativo';

-- Criar índices para performance
CREATE INDEX idx_discount_documents_discount_id ON public.discount_documents(discount_id);
CREATE INDEX idx_discount_documents_active ON public.discount_documents(is_active);
CREATE INDEX idx_discount_documents_order ON public.discount_documents(discount_id, display_order);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.discount_documents ENABLE ROW LEVEL SECURITY;

-- Política para leitura pública dos documentos ativos
CREATE POLICY "Documentos ativos são públicos para leitura" 
  ON public.discount_documents
  FOR SELECT 
  USING (is_active = true);

-- Política para usuários autenticados (CRUD completo)
-- Nota: Em produção, adicionar verificação de role admin quando a tabela profiles existir
CREATE POLICY "Usuários autenticados podem gerenciar documentos" 
  ON public.discount_documents
  FOR ALL 
  USING (auth.role() = 'authenticated');

-- Função para atualizar o timestamp updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_discount_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para executar a função de update
CREATE TRIGGER update_discount_documents_updated_at 
  BEFORE UPDATE ON public.discount_documents 
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_discount_documents_updated_at();

-- Grant permissões básicas
GRANT SELECT ON public.discount_documents TO anon;
GRANT ALL ON public.discount_documents TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Criar função para buscar documentos com dados do desconto
CREATE OR REPLACE FUNCTION public.get_discount_documents(discount_codes TEXT[])
RETURNS TABLE (
  id UUID,
  discount_id UUID,
  discount_code TEXT,
  discount_name TEXT,
  document_name VARCHAR(255),
  document_description TEXT,
  is_required BOOLEAN,
  accepted_formats TEXT[],
  max_size_mb INTEGER,
  display_order INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dd.id,
    dd.discount_id,
    td.codigo AS discount_code,
    td.descricao AS discount_name,
    dd.document_name,
    dd.document_description,
    dd.is_required,
    dd.accepted_formats,
    dd.max_size_mb,
    dd.display_order
  FROM public.discount_documents dd
  INNER JOIN public.tipos_desconto td ON dd.discount_id = td.id
  WHERE 
    dd.is_active = true 
    AND td.ativo = true
    AND td.codigo = ANY(discount_codes)
  ORDER BY 
    td.codigo, 
    dd.display_order, 
    dd.document_name;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant permissão para executar a função
GRANT EXECUTE ON FUNCTION public.get_discount_documents TO anon, authenticated;

-- Adicionar coluna para controlar visibilidade no frontend (opcional)
ALTER TABLE public.discount_documents 
  ADD COLUMN IF NOT EXISTS show_in_enrollment BOOLEAN DEFAULT true;

COMMENT ON COLUMN public.discount_documents.show_in_enrollment IS 'Controla se o documento aparece no processo de matrícula';

-- Criar view para facilitar queries
CREATE OR REPLACE VIEW public.v_discount_documents AS
SELECT 
  dd.id,
  dd.discount_id,
  td.codigo AS discount_code,
  td.descricao AS discount_name,
  td.percentual_fixo AS discount_percentage,
  dd.document_name,
  dd.document_description,
  dd.is_required,
  dd.accepted_formats,
  dd.max_size_mb,
  dd.display_order,
  dd.is_active,
  dd.show_in_enrollment,
  dd.created_at,
  dd.updated_at
FROM public.discount_documents dd
LEFT JOIN public.tipos_desconto td ON dd.discount_id = td.id
WHERE dd.is_active = true AND td.ativo = true;

-- Grant permissões para a view
GRANT SELECT ON public.v_discount_documents TO anon, authenticated;

-- Mensagem de conclusão
DO $$ 
BEGIN 
  RAISE NOTICE 'Tabela discount_documents criada com sucesso!';
  RAISE NOTICE 'Execute a próxima migração (012_populate_discount_documents.sql) para popular os dados iniciais.';
END $$;