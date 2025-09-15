import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, type CepRange, type CepRangeInsert, type CepRangeUpdate } from '@/lib/supabase'
import { type CepCategory } from '@/features/enrollment/types/eligibility'

// Hook para listar faixas de CEP
export const useCepRanges = (includeInactive = false) => {
  return useQuery({
    queryKey: ['cep-ranges', includeInactive],
    queryFn: async () => {
      let query = supabase
        .from('cep_ranges')
        .select('*')
        .order('categoria')
        .order('cep_inicio')
      
      if (!includeInactive) {
        query = query.eq('ativo', true)
      }
      
      const { data, error } = await query
      
      if (error) {
        console.error('Erro ao buscar faixas de CEP:', error)
        throw new Error(error.message)
      }
      
      return data as CepRange[]
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  })
}

// Hook para obter faixas de CEP por categoria
export const useCepRangesByCategory = (categoria: 'fora' | 'baixa' | 'alta' | undefined) => {
  return useQuery({
    queryKey: ['cep-ranges-by-category', categoria],
    queryFn: async () => {
      if (!categoria) return []
      
      const { data, error } = await supabase
        .from('cep_ranges')
        .select('*')
        .eq('categoria', categoria)
        .eq('ativo', true)
        .order('cep_inicio')
      
      if (error) {
        console.error('Erro ao buscar faixas de CEP por categoria:', error)
        throw new Error(error.message)
      }
      
      return data as CepRange[]
    },
    enabled: !!categoria,
  })
}

// Hook para criar nova faixa de CEP
export const useCreateCepRange = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (cepRange: CepRangeInsert) => {
      // Validar se CEP início não é maior que CEP fim
      if (cepRange.cep_inicio > cepRange.cep_fim) {
        throw new Error('CEP inicial não pode ser maior que CEP final')
      }
      
      const { data, error } = await supabase
        .from('cep_ranges')
        .insert(cepRange)
        .select()
        .single()
      
      if (error) {
        console.error('Erro ao criar faixa de CEP:', error)
        throw new Error(error.message)
      }
      
      return data as CepRange
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cep-ranges'] })
      queryClient.invalidateQueries({ queryKey: ['cep-ranges-by-category'] })
      queryClient.invalidateQueries({ queryKey: ['cep-classification'] })
    },
    onError: (error) => {
      console.error('Erro na criação de faixa CEP:', error)
    },
  })
}

// Hook para atualizar faixa de CEP
export const useUpdateCepRange = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & CepRangeUpdate) => {
      const { data, error } = await supabase
        .from('cep_ranges')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()
      
      if (error) {
        console.error('Erro ao atualizar faixa de CEP:', error)
        throw new Error(error.message)
      }
      
      return data as CepRange
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cep-ranges'] })
      queryClient.invalidateQueries({ queryKey: ['cep-ranges-by-category'] })
      queryClient.invalidateQueries({ queryKey: ['cep-classification'] })
    },
    onError: (error) => {
      console.error('Erro na atualização de faixa CEP:', error)
    },
  })
}

// Hook para desativar faixa de CEP
export const useDeleteCepRange = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('cep_ranges')
        .update({ 
          ativo: false,
          updated_at: new Date().toISOString() 
        })
        .eq('id', id)
        .select()
        .single()
      
      if (error) {
        console.error('Erro ao desativar faixa de CEP:', error)
        throw new Error(error.message)
      }
      
      return data as CepRange
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cep-ranges'] })
      queryClient.invalidateQueries({ queryKey: ['cep-classification'] })
    },
    onError: (error) => {
      console.error('Erro na desativação de faixa CEP:', error)
    },
  })
}

// Hook público para classificação de CEP (usado no sistema de matrícula)
export const useCepClassification = (cep: string | undefined) => {
  return useQuery({
    queryKey: ['cep-classification', cep],
    queryFn: async () => {
      if (!cep) return null
      
      // Remove formatação do CEP
      const cleanCep = cep.replace(/\D/g, '')
      
      if (cleanCep.length !== 8) {
        return null
      }
      
      console.log('🔍 Chamando RPC classify_cep com CEP:', cleanCep);
      const { data, error } = await supabase
        .rpc('classify_cep', { input_cep: cleanCep })
      
      console.log('📡 Resultado da RPC classify_cep:', { data, error });
      
      if (error) {
        console.error('❌ Erro ao classificar CEP:', error)
        throw new Error(error.message)
      }
      
      // A função RPC retorna um array, pegar o primeiro resultado
      const result = data?.[0]
      console.log('📊 Primeiro resultado extraído:', result);
      
      if (!result || result.categoria === null || result.categoria === undefined) {
        console.log('⚠️ Resultado inválido ou categoria null/undefined');
        return {
          categoria: null as any,
          percentual_desconto: 0,
          descricao: 'CEP não classificado'
        }
      }
      
      console.log('✅ Categoria encontrada:', result.categoria);
      const finalResult = {
        categoria: result.categoria as 'fora' | 'baixa' | 'alta',
        percentual_desconto: result.percentual_desconto || 0,
        descricao: result.descricao || getCepCategoryDescription(result.categoria, result.percentual_desconto)
      };
      
      console.log('🎯 Resultado final processado:', finalResult);
      return finalResult;
    },
    enabled: !!cep && cep.replace(/\D/g, '').length === 8,
    staleTime: 30 * 60 * 1000, // 30 minutos (CEPs mudam raramente)
    gcTime: 60 * 60 * 1000, // 1 hora
  })
}

// Hook para importação em massa de CEPs (CSV)
export const useImportCepRanges = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (cepRanges: CepRangeInsert[]) => {
      // Validar todos os registros antes de inserir
      for (const range of cepRanges) {
        if (range.cep_inicio > range.cep_fim) {
          throw new Error(`Faixa inválida: ${range.cep_inicio} - ${range.cep_fim}`)
        }
      }
      
      const { data, error } = await supabase
        .from('cep_ranges')
        .insert(cepRanges)
        .select()
      
      if (error) {
        console.error('Erro ao importar faixas de CEP:', error)
        throw new Error(error.message)
      }
      
      return data as CepRange[]
    },
    onSuccess: (importedRanges) => {
      queryClient.invalidateQueries({ queryKey: ['cep-ranges'] })
      queryClient.invalidateQueries({ queryKey: ['cep-classification'] })
      console.log(`${importedRanges.length} faixas de CEP importadas com sucesso`)
    },
    onError: (error) => {
      console.error('Erro na importação em massa:', error)
    },
  })
}

// Função utilitária para descrição das categorias
function getCepCategoryDescription(categoria: string, percentual: number): string {
  switch (categoria) {
    case 'fora':
      return `Fora de Poços de Caldas — elegível a ${percentual}% (CEP10)`
    case 'baixa':
      return `Poços (bairro de menor renda) — elegível a ${percentual}% (CEP5)`
    case 'alta':
      return `Poços (bairro de maior renda) — sem desconto por CEP`
    default:
      return 'Categoria não identificada'
  }
}

// Hook para estatísticas de CEP (para dashboard)
export const useCepStatistics = () => {
  return useQuery({
    queryKey: ['cep-statistics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cep_ranges')
        .select('categoria, ativo')
      
      if (error) {
        console.error('Erro ao buscar estatísticas de CEP:', error)
        throw new Error(error.message)
      }
      
      const stats = {
        total: data.length,
        ativo: data.filter(r => r.ativo).length,
        inativo: data.filter(r => !r.ativo).length,
        por_categoria: {
          fora: data.filter(r => r.categoria === 'fora' && r.ativo).length,
          baixa: data.filter(r => r.categoria === 'baixa' && r.ativo).length,
          alta: data.filter(r => r.categoria === 'alta' && r.ativo).length,
        }
      }
      
      return stats
    },
    staleTime: 10 * 60 * 1000, // 10 minutos
  })
}

// =============================================================================
// HOOKS PÚBLICOS MELHORADOS PARA SISTEMA DE MATRÍCULA
// =============================================================================

/**
 * Hook otimizado para classificação de CEP no sistema de matrícula
 * Inclui funcionalidades extras específicas para o enrollment
 * Agora também retorna a categoria para uso com elegibilidade
 */
export const usePublicCepClassification = (cep: string | undefined) => {
  // DETECTAR QUEM ESTÁ CHAMANDO
  if (cep === '13331-461') {
    console.log('🚨 usePublicCepClassification sendo chamado para CEP:', cep);
    console.trace('Stack trace de quem está chamando:');
  }
  
  const classification = useCepClassification(cep)
  
  // LOGS DESABILITADOS TEMPORARIAMENTE
  // console.log('🏠 usePublicCepClassification - Input CEP:', cep);
  // console.log('📋 Classification result:', classification);
  // console.log('🎯 Data from classification:', classification.data);
  // console.log('📍 Categoria extraída:', classification.data?.categoria);

  const result = {
    ...classification,
    // Propriedades calculadas para facilitar uso no enrollment
    isEligibleForDiscount: classification.data?.percentual_desconto > 0,
    discountType: classification.data?.categoria === 'fora' ? 'CEP10' : 
                  classification.data?.categoria === 'baixa' ? 'CEP5' : null,
    shortDescription: getShortCepDescription(classification.data?.categoria),
    shouldShowCepToggle: classification.data?.percentual_desconto > 0,
    // Categoria para uso com sistema de elegibilidade
    cepCategory: classification.data?.categoria as CepCategory | null,
  };
  
  // console.log('🚀 usePublicCepClassification - Final result:', result);
  // console.log('🏷️ CEP Category final:', result.cepCategory);
  
  return result;
}

/**
 * Hook para verificar se um CEP específico tem direito a desconto
 * Também retorna a categoria para uso com sistema de elegibilidade
 */
export const useCepDiscountEligibility = (cep: string | undefined) => {
  const classification = usePublicCepClassification(cep)
  
  return {
    isLoading: classification.isLoading,
    error: classification.error,
    isEligible: classification.isEligibleForDiscount,
    discountPercentage: classification.data?.percentual_desconto || 0,
    discountCode: classification.discountType,
    category: classification.data?.categoria as CepCategory | null,
    cepCategory: classification.cepCategory,
    description: classification.data?.descricao,
  }
}

/**
 * Função utilitária para descrição curta das categorias (para badges/chips)
 */
function getShortCepDescription(categoria?: string): string {
  switch (categoria) {
    case 'fora':
      return 'Fora de Poços'
    case 'baixa':
      return 'Baixa Renda'
    case 'alta':
      return 'Alta Renda'
    default:
      return 'Não classificado'
  }
}

/**
 * Função utilitária para validar formato de CEP
 */
export const isValidCepFormat = (cep: string): boolean => {
  const cleanCep = cep.replace(/\D/g, '')
  return cleanCep.length === 8
}

/**
 * Função utilitária para formatar CEP (XXXXX-XXX)
 */
export const formatCep = (cep: string): string => {
  const cleanCep = cep.replace(/\D/g, '')
  if (cleanCep.length === 8) {
    return `${cleanCep.slice(0, 5)}-${cleanCep.slice(5)}`
  }
  return cep
}