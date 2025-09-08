/**
 * Hook principal para sistema de elegibilidade de descontos por CEP
 * 
 * Este hook é responsável por:
 * - Classificar o CEP do usuário
 * - Buscar regras de elegibilidade do banco
 * - Aplicar regras de negócio hardcoded
 * - Retornar descontos elegíveis e inelegíveis
 */

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// Hooks existentes
import { useCepClassification } from '../../admin/hooks/useCepRanges'

// Types
import type { DatabaseDiscount } from '../../matricula-nova/types/api'
import type { 
  CepCategory,
  TrilhoType,
  DiscountEligibilityResult,
  UseEligibleDiscountsParams,
  EligibilityHookOptions,
  DatabaseEligibilityRule
} from '../types/eligibility'

// Constants
import { ELIGIBILITY_DEFAULTS } from '../types/eligibility'

// Utils
import { 
  analyzeDiscountEligibility,
  filterEligibleDiscounts,
  filterIneligibleDiscounts,
  calculateEligibilityStats,
  debugEligibilityAnalysis
} from '../utils/eligibilityRules'

/**
 * Hook principal para obter descontos elegíveis baseado no CEP
 */
export function useEligibleDiscounts(
  cep: string | undefined,
  allDiscounts: DatabaseDiscount[],
  trilhoType: TrilhoType | undefined = undefined,
  options: EligibilityHookOptions = {}
): DiscountEligibilityResult {
  // Configurações com defaults
  const {
    staleTime = ELIGIBILITY_DEFAULTS.STALE_TIME,
    refetchOnWindowFocus = false,
    enableDebugLogs = ELIGIBILITY_DEFAULTS.ENABLE_DEBUG
  } = options

  // Hook para classificação do CEP
  const { 
    data: cepClassification, 
    isLoading: loadingCepClassification,
    error: cepError
  } = useCepClassification(cep)

  // Query para buscar regras de elegibilidade do banco
  const eligibilityQuery = useQuery({
    queryKey: ['discount-eligibility', cepClassification?.categoria, trilhoType, allDiscounts.map(d => d.id)],
    queryFn: async (): Promise<DiscountEligibilityResult> => {
      const startTime = Date.now()
      
      // Se não há categoria de CEP, retornar todos como elegíveis (fallback seguro)
      if (!cepClassification?.categoria) {
        const fallbackResult: DiscountEligibilityResult = {
          eligibleDiscounts: allDiscounts,
          ineligibleDiscounts: [],
          cepCategory: null,
          cep: cep || null,
          isLoading: false,
          error: null,
          stats: {
            totalDiscounts: allDiscounts.length,
            eligibleCount: allDiscounts.length,
            ineligibleCount: 0,
            eligibilityRate: 100
          }
        }
        
        if (enableDebugLogs) {
          console.log('🔄 useEligibleDiscounts: Fallback - todos os descontos elegíveis')
        }
        
        return fallbackResult
      }

      try {
        // Buscar regras de elegibilidade do banco de dados
        const { data: databaseRules, error: dbError } = await supabase
          .from('cep_desconto_elegibilidade')
          .select(`
            categoria_cep,
            tipo_desconto_codigo,
            elegivel,
            motivo_restricao,
            observacoes
          `)
          .eq('categoria_cep', cepClassification.categoria)
          .eq('ativo', true)

        if (dbError) {
          console.warn('⚠️ Erro ao buscar regras do banco, usando apenas hardcoded:', dbError.message)
        }

        // Analisar elegibilidade para todos os descontos
        const eligibilityChecks = analyzeDiscountEligibility(
          allDiscounts,
          cepClassification.categoria,
          trilhoType,
          (databaseRules as DatabaseEligibilityRule[]) || []
        )

        // Filtrar elegíveis e inelegíveis
        const eligibleDiscounts = filterEligibleDiscounts(eligibilityChecks)
        const ineligibleDiscounts = filterIneligibleDiscounts(eligibilityChecks)

        // Calcular estatísticas
        const stats = calculateEligibilityStats(eligibilityChecks)

        // Debug logs
        if (enableDebugLogs) {
          debugEligibilityAnalysis(cep || '', cepClassification.categoria, trilhoType, eligibilityChecks)
          console.log(`⏱️ Análise completada em ${Date.now() - startTime}ms`)
        }

        const result: DiscountEligibilityResult = {
          eligibleDiscounts,
          ineligibleDiscounts,
          cepCategory: cepClassification.categoria,
          cep: cep || null,
          isLoading: false,
          error: null,
          stats
        }

        return result

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
        console.error('❌ Erro na análise de elegibilidade:', error)

        // Em caso de erro, retornar todos como elegíveis (fail-safe)
        return {
          eligibleDiscounts: allDiscounts,
          ineligibleDiscounts: [],
          cepCategory: cepClassification?.categoria || null,
          cep: cep || null,
          isLoading: false,
          error: errorMessage,
          stats: {
            totalDiscounts: allDiscounts.length,
            eligibleCount: allDiscounts.length,
            ineligibleCount: 0,
            eligibilityRate: 100
          }
        }
      }
    },
    enabled: !!cep && allDiscounts.length > 0,
    staleTime,
    gcTime: ELIGIBILITY_DEFAULTS.CACHE_TIME,
    refetchOnWindowFocus,
    // Em caso de erro na query, fazer retry
    retry: ELIGIBILITY_DEFAULTS.MAX_RETRIES,
    retryDelay: ELIGIBILITY_DEFAULTS.RETRY_DELAY
  })

  // Estado de loading combinado
  const isLoading = loadingCepClassification || eligibilityQuery.isLoading

  // Tratamento de erro
  const error = cepError?.message || eligibilityQuery.error?.message || null

  // Se não há CEP, retornar todos os descontos como elegíveis
  if (!cep) {
    return {
      eligibleDiscounts: allDiscounts,
      ineligibleDiscounts: [],
      cepCategory: null,
      cep: null,
      isLoading: false,
      error: null,
      stats: {
        totalDiscounts: allDiscounts.length,
        eligibleCount: allDiscounts.length,
        ineligibleCount: 0,
        eligibilityRate: 100
      }
    }
  }
  
  // Se ainda está carregando, retornar estado de loading
  if (isLoading) {
    return {
      eligibleDiscounts: [],
      ineligibleDiscounts: [],
      cepCategory: null,
      cep: cep || null,
      isLoading: true,
      error: null,
      stats: {
        totalDiscounts: 0,
        eligibleCount: 0,
        ineligibleCount: 0,
        eligibilityRate: 0
      }
    }
  }

  // Retornar dados da query ou fallback
  return eligibilityQuery.data || {
    eligibleDiscounts: allDiscounts,
    ineligibleDiscounts: [],
    cepCategory: cepClassification?.categoria || null,
    cep: cep || null,
    isLoading: false,
    error,
    stats: {
      totalDiscounts: allDiscounts.length,
      eligibleCount: allDiscounts.length,
      ineligibleCount: 0,
      eligibilityRate: 100
    }
  }
}

/**
 * Hook simplificado que retorna apenas descontos elegíveis
 */
export function useEligibleDiscountsOnly(
  cep: string | undefined,
  allDiscounts: DatabaseDiscount[],
  trilhoType?: TrilhoType,
  options?: EligibilityHookOptions
): {
  eligibleDiscounts: DatabaseDiscount[]
  isLoading: boolean
  error: string | null
} {
  const result = useEligibleDiscounts(cep, allDiscounts, trilhoType, options)
  
  return {
    eligibleDiscounts: result.eligibleDiscounts,
    isLoading: result.isLoading,
    error: result.error
  }
}

/**
 * Hook para verificar se um desconto específico é elegível
 */
export function useDiscountEligibility(
  cep: string | undefined,
  discountCode: string,
  allDiscounts: DatabaseDiscount[],
  trilhoType?: TrilhoType,
  options?: EligibilityHookOptions
): {
  isEligible: boolean
  reason: string | null
  suggestion?: string
  isLoading: boolean
  error: string | null
} {
  const result = useEligibleDiscounts(cep, allDiscounts, trilhoType, options)
  
  // Procurar o desconto específico nos resultados
  const eligibleDiscount = result.eligibleDiscounts.find(
    d => d.codigo.toUpperCase() === discountCode.toUpperCase()
  )
  
  const ineligibleDiscount = result.ineligibleDiscounts.find(
    d => d.discount.codigo.toUpperCase() === discountCode.toUpperCase()
  )
  
  if (eligibleDiscount) {
    return {
      isEligible: true,
      reason: null,
      isLoading: result.isLoading,
      error: result.error
    }
  }
  
  if (ineligibleDiscount) {
    return {
      isEligible: false,
      reason: ineligibleDiscount.reason,
      suggestion: ineligibleDiscount.suggestion,
      isLoading: result.isLoading,
      error: result.error
    }
  }
  
  // Desconto não encontrado
  return {
    isEligible: false,
    reason: 'Desconto não encontrado',
    isLoading: result.isLoading,
    error: result.error
  }
}

/**
 * Hook para estatísticas de elegibilidade (para dashboards)
 */
export function useEligibilityStats(
  cep: string | undefined,
  allDiscounts: DatabaseDiscount[],
  trilhoType?: TrilhoType
): {
  stats: {
    totalDiscounts: number
    eligibleCount: number
    ineligibleCount: number
    eligibilityRate: number
  }
  cepCategory: CepCategory | null
  isLoading: boolean
  error: string | null
} {
  const result = useEligibleDiscounts(cep, allDiscounts, trilhoType, { 
    enableDebugLogs: false // Desabilitar logs para stats
  })
  
  return {
    stats: result.stats,
    cepCategory: result.cepCategory,
    isLoading: result.isLoading,
    error: result.error
  }
}

/**
 * Hook para forçar revalidação das regras de elegibilidade
 */
export function useRefreshEligibility() {
  const queryClient = useQueryClient()
  
  return {
    refreshEligibility: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['discount-eligibility'] 
      })
      queryClient.invalidateQueries({ 
        queryKey: ['cep-classification'] 
      })
    }
  }
}

// ===================================================================
// HOOK PARA DESENVOLVIMENTO/DEBUG
// ===================================================================

/**
 * Hook especial para debug e desenvolvimento
 * Retorna dados extras para análise
 */
export function useEligibleDiscountsDebug(
  cep: string | undefined,
  allDiscounts: DatabaseDiscount[],
  trilhoType?: TrilhoType
) {
  const result = useEligibleDiscounts(cep, allDiscounts, trilhoType, {
    enableDebugLogs: true
  })
  
  // Dados extras para debug
  const debugData = {
    ...result,
    // Breakdowns detalhados
    ruleBreakdown: result.ineligibleDiscounts.reduce((acc, check) => {
      acc[check.discount.codigo] = {
        ruleApplied: check.ruleApplied,
        reason: check.reason,
        suggestion: check.suggestion
      }
      return acc
    }, {} as Record<string, any>),
    
    // Timing info
    queryStatus: {
      isFetching: result.isLoading,
      isSuccess: !result.error && !result.isLoading,
      isError: !!result.error
    }
  }
  
  // Log completo para debug
  if (process.env.NODE_ENV === 'development' && !result.isLoading) {
    console.group('🐛 Debug - useEligibleDiscounts')
    console.table(debugData.stats)
    console.log('Elegíveis:', result.eligibleDiscounts.map(d => d.codigo))
    console.log('Inelegíveis:', result.ineligibleDiscounts.map(d => d.discount.codigo))
    console.groupEnd()
  }
  
  return debugData
}