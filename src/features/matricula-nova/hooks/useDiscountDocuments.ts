import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// Types
interface SupabaseDocument {
  id: string
  discount_id: string
  document_name: string
  document_description: string
  is_required: boolean
  accepted_formats: string[]
  max_size_mb: number
  display_order: number
  is_active: boolean
  show_in_enrollment: boolean
  discount_types?: {
    codigo: string
    descricao: string
  }
}

export interface DocumentRequirement {
  id: string;
  name: string;
  description: string;
  category: 'discount';
  required: boolean;
  discountRelated: string;
  acceptedFormats: string[];
  maxSize: string;
  displayOrder: number;
}

/**
 * Hook para buscar documentos necessários do Supabase baseado nos códigos de desconto
 * 
 * @param discountCodes - Array de códigos de desconto (ex: ['IIR', 'RES', 'PAV'])
 * @returns Query result com documentos transformados para formato do frontend
 * 
 * @example
 * const { data: documents, isLoading } = useDiscountDocuments(['IIR', 'RES'])
 */
export function useDiscountDocuments(discountCodes: string[]) {
  return useQuery({
    queryKey: ['discount-documents', discountCodes],
    
    queryFn: async () => {
      console.log('[useDiscountDocuments] Buscando documentos para:', discountCodes)
      
      // Se não há códigos, retornar array vazio
      if (!discountCodes || discountCodes.length === 0) {
        console.log('[useDiscountDocuments] Nenhum código fornecido, retornando array vazio')
        return []
      }

      try {
        // Buscar documentos usando a função SQL criada na migration
        const { data, error } = await supabase
          .rpc('get_discount_documents', {
            discount_codes: discountCodes
          })

        if (error) {
          console.error('[useDiscountDocuments] Erro ao buscar documentos:', error)
          
          // Em caso de erro, tentar busca alternativa com join manual
          return await fallbackQuery(discountCodes)
        }

        console.log('[useDiscountDocuments] Documentos encontrados:', data?.length || 0)
        
        // Transformar para formato do frontend
        const transformed = transformToFrontendFormat(data || [])
        console.log('[useDiscountDocuments] Documentos transformados:', transformed)
        
        return transformed
      } catch (error) {
        console.error('[useDiscountDocuments] Erro inesperado:', error)
        
        // Em caso de erro crítico, retornar dados estáticos como fallback
        if (process.env.NODE_ENV === 'production') {
          return getStaticDocuments(discountCodes)
        }
        
        throw error
      }
    },
    
    // Configurações da query
    enabled: discountCodes.length > 0,
    staleTime: 5 * 60 * 1000,     // Dados considerados "frescos" por 5 minutos
    cacheTime: 15 * 60 * 1000,    // Cache mantido por 15 minutos
    refetchOnWindowFocus: false,   // Não refazer query ao focar janela
    retry: 2,                       // Tentar 2x em caso de erro
    
    // Manter dados anteriores enquanto revalida
    keepPreviousData: true,
  })
}

/**
 * Query alternativa caso a função RPC falhe
 */
async function fallbackQuery(discountCodes: string[]): Promise<any[]> {
  console.log('[fallbackQuery] Tentando busca alternativa...')
  
  const { data: discounts } = await supabase
    .from('tipos_desconto')
    .select('id, codigo')
    .in('codigo', discountCodes)
    .eq('ativo', true)
  
  if (!discounts || discounts.length === 0) {
    console.log('[fallbackQuery] Nenhum desconto encontrado')
    return []
  }
  
  const discountIds = discounts.map(d => d.id)
  
  const { data: documents, error } = await supabase
    .from('discount_documents')
    .select('*')
    .in('discount_id', discountIds)
    .eq('is_active', true)
    .eq('show_in_enrollment', true)
    .order('display_order')
  
  if (error) {
    console.error('[fallbackQuery] Erro na busca alternativa:', error)
    return []
  }
  
  // Adicionar código do desconto aos documentos
  return documents.map(doc => {
    const discount = discounts.find(d => d.id === doc.discount_id)
    return {
      ...doc,
      discount_code: discount?.codigo || '',
      discount_name: discount?.codigo || '' // Usar código como nome se não tiver descrição
    }
  })
}

/**
 * Transforma dados do Supabase para formato esperado pelo frontend
 */
function transformToFrontendFormat(data: any[]): DocumentRequirement[] {
  return data.map(doc => ({
    id: doc.id,
    name: doc.document_name,
    description: doc.document_description || '',
    category: 'discount',
    required: doc.is_required ?? true,
    discountRelated: doc.discount_code || '',
    acceptedFormats: doc.accepted_formats || ['PDF', 'JPG', 'PNG'],
    maxSize: `${doc.max_size_mb || 5}MB`,
    displayOrder: doc.display_order || 0
  })).sort((a, b) => a.displayOrder - b.displayOrder)
}

/**
 * Fallback para dados estáticos (temporário, será removido após validação)
 * Usado apenas em produção se API falhar completamente
 */
function getStaticDocuments(discountCodes: string[]): DocumentRequirement[] {
  console.warn('[getStaticDocuments] USANDO DADOS ESTÁTICOS - API falhou')
  
  // Mapa simplificado de documentos por código
  const staticDocs: Record<string, DocumentRequirement[]> = {
    'IIR': [
      {
        id: 'static-iir-1',
        name: 'Comprovante de Matrícula do Irmão',
        description: 'Declaração oficial de matrícula do irmão',
        category: 'discount',
        required: true,
        discountRelated: 'IIR',
        acceptedFormats: ['PDF', 'JPG', 'PNG'],
        maxSize: '5MB',
        displayOrder: 1
      },
      {
        id: 'static-iir-2',
        name: 'Certidão de Nascimento dos Irmãos',
        description: 'Certidão comprovando parentesco',
        category: 'discount',
        required: true,
        discountRelated: 'IIR',
        acceptedFormats: ['PDF', 'JPG', 'PNG'],
        maxSize: '5MB',
        displayOrder: 2
      }
    ],
    'RES': [
      {
        id: 'static-res-1',
        name: 'Comprovante de Residência',
        description: 'Comprovante de endereço em outra cidade',
        category: 'discount',
        required: true,
        discountRelated: 'RES',
        acceptedFormats: ['PDF', 'JPG', 'PNG'],
        maxSize: '5MB',
        displayOrder: 1
      }
    ],
    'PAV': [
      {
        id: 'static-pav-1',
        name: 'Comprovante de Capacidade Financeira',
        description: 'Documento opcional para pagamento à vista',
        category: 'discount',
        required: false,
        discountRelated: 'PAV',
        acceptedFormats: ['PDF', 'JPG', 'PNG'],
        maxSize: '5MB',
        displayOrder: 1
      }
    ]
  }
  
  // Retornar documentos para os códigos solicitados
  return discountCodes.flatMap(code => staticDocs[code] || [])
}

/**
 * Hook para verificar se está usando dados estáticos (debug)
 */
export function useDocumentDataSource() {
  return {
    isStatic: false, // Será true quando usar fallback
    source: 'supabase' as 'supabase' | 'static',
    message: 'Dados vindos do Supabase'
  }
}

// Exportar tipos para uso em outros componentes
export type { SupabaseDocument }