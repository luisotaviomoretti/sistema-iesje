import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface DiscountDocument {
  id: string
  discount_id: string
  document_name: string
  document_description?: string
  is_required: boolean
  display_order?: number
  discount_code?: string
}

/**
 * Hook independente para buscar documentos necessários dos descontos selecionados
 * Busca primeiro os códigos dos descontos e depois os documentos relacionados
 */
export function useDiscountDocuments(discountTypeIds: string[] = []) {
  return useQuery({
    queryKey: ['rematricula-discount-documents', discountTypeIds],
    queryFn: async (): Promise<DiscountDocument[]> => {
      if (discountTypeIds.length === 0) {
        console.log('[useDiscountDocuments] Sem IDs de desconto para buscar')
        return []
      }

      try {
        console.log('[useDiscountDocuments] Buscando documentos para IDs:', discountTypeIds)
        
        // Tentar buscar diretamente os documentos pelos IDs dos tipos de desconto
        // Assumindo que discount_id na tabela discount_documents corresponde ao ID do tipo_desconto
        const { data: documents, error: docsError } = await supabase
          .from('discount_documents')
          .select(`
            *,
            tipos_desconto!discount_documents_discount_id_fkey (
              id,
              codigo,
              nome
            )
          `)
          .in('discount_id', discountTypeIds)
          .eq('is_active', true)
          .eq('show_in_enrollment', true)
          .order('display_order', { ascending: true })
          .order('document_name', { ascending: true })

        if (docsError) {
          console.error('[useDiscountDocuments] Erro ao buscar documentos com join:', docsError)
          
          // Fallback: tentar busca simples sem join
          const { data: simpleDocs, error: simpleError } = await supabase
            .from('discount_documents')
            .select('*')
            .in('discount_id', discountTypeIds)
            .eq('is_active', true)
            .eq('show_in_enrollment', true)
            .order('display_order', { ascending: true })
            
          if (simpleError) {
            console.error('[useDiscountDocuments] Erro na busca simples:', simpleError)
            return []
          }
          
          console.log('[useDiscountDocuments] Documentos encontrados (busca simples):', simpleDocs?.length || 0)
          return simpleDocs || []
        }

        console.log('[useDiscountDocuments] Documentos encontrados:', documents?.length || 0)

        // Mapear os documentos com os códigos dos descontos
        const documentsWithCodes = (documents || []).map(doc => {
          const discountInfo = doc.tipos_desconto
          return {
            id: doc.id,
            discount_id: doc.discount_id,
            document_name: doc.document_name,
            document_description: doc.document_description,
            is_required: doc.is_required,
            display_order: doc.display_order,
            discount_code: discountInfo?.codigo || '',
            discount_name: discountInfo?.nome || ''
          }
        })

        return documentsWithCodes
      } catch (error) {
        console.error('[useDiscountDocuments] Erro geral:', error)
        // Em caso de erro, retornar lista vazia para não quebrar a UI
        return []
      }
    },
    enabled: discountTypeIds.length > 0,
    staleTime: 10 * 60 * 1000, // 10 minutos
    gcTime: 15 * 60 * 1000,    // 15 minutos
    retry: 2,
  })
}