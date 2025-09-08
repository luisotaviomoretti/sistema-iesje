/**
 * Hook para cálculo de preços na rematrícula
 * Totalmente independente do sistema de nova matrícula
 * Não utiliza hooks ou serviços do sistema legado
 */

import { useState, useMemo, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../../lib/supabase'
import { RematriculaPricingService } from '../../services/rematriculaPricingService'
import type { DatabaseSeries, DatabaseDiscount } from '../../../matricula-nova/types/api'
import type {
  RematriculaPricing,
  PricingComparison,
  PreviousYearFinance,
  RematriculaFinancialResult
} from '../../types/rematricula-pricing'
import type { PreviousYearStudent } from '../../types/rematricula'

interface UseRematriculaPricingParams {
  selectedSeriesId: string | null
  selectedDiscounts: DatabaseDiscount[]
  previousYearData: PreviousYearStudent | null
  escola?: 'pelicano' | 'sete_setembro'
  enabled?: boolean
}

interface UseRematriculaPricingReturn extends RematriculaFinancialResult {
  // Ações
  refetch: () => void
  clearCache: () => void
  
  // Estados adicionais
  hasChanges: boolean
  savingsAmount: number | null
  savingsPercentage: number | null
  
  // Utilitários
  formatCurrency: (value: number) => string
  formatPercentage: (value: number) => string
  generateSummary: () => string
}

/**
 * Hook independente para cálculo de preços na rematrícula
 */
export function useRematriculaPricing({
  selectedSeriesId,
  selectedDiscounts,
  previousYearData,
  escola,
  enabled = true
}: UseRematriculaPricingParams): UseRematriculaPricingReturn {
  
  // Estado local para controle
  const [lastCalculation, setLastCalculation] = useState<Date | null>(null)
  
  // Buscar série do Supabase - Query independente
  const seriesQuery = useQuery({
    queryKey: ['rematricula-series', selectedSeriesId, escola],
    queryFn: async () => {
      if (!selectedSeriesId) {
        return null
      }
      
      let query = supabase
        .from('series')
        .select(`
          id,
          nome,
          ano_serie,
          valor_mensal_com_material,
          valor_material,
          valor_mensal_sem_material,
          escola,
          ativo
        `)
        .eq('id', selectedSeriesId)
        .eq('ativo', true)
      
      // Filtrar por escola se especificado
      if (escola) {
        query = query.eq('escola', escola === 'pelicano' ? 'Pelicano' : 'Sete de Setembro')
      }
      
      const { data, error } = await query.single()
      
      if (error) {
        console.error('Erro ao buscar série:', error)
        throw new Error('Falha ao carregar dados da série')
      }
      
      // Mapear para formato esperado
      return {
        id: data.id,
        nome: data.nome,
        nivel: data.ano_serie,
        value: data.valor_mensal_com_material,
        valor_mensal_com_material: data.valor_mensal_com_material,
        valor_material: data.valor_material,
        valor_mensal_sem_material: data.valor_mensal_sem_material,
        escola: data.escola,
        is_active: data.ativo
      } as DatabaseSeries
    },
    enabled: enabled && !!selectedSeriesId,
    staleTime: 5 * 60 * 1000, // Cache de 5 minutos
    gcTime: 10 * 60 * 1000, // Garbage collection em 10 minutos
    retry: 2
  })
  
  // Calcular pricing usando o serviço independente
  const pricing = useMemo(() => {
    if (!seriesQuery.data || !selectedDiscounts) {
      return null
    }
    
    const calculation = RematriculaPricingService.calculate(
      seriesQuery.data,
      selectedDiscounts
    )
    
    // Atualizar timestamp da última calculação
    setLastCalculation(new Date())
    
    return calculation
  }, [seriesQuery.data, selectedDiscounts])
  
  // Preparar dados financeiros do ano anterior
  const previousYearFinance = useMemo((): PreviousYearFinance | null => {
    if (!previousYearData?.financial) {
      return null
    }
    
    const financial = previousYearData.financial
    
    return {
      base_value: financial.base_value || 0,
      total_discounts: financial.total_discounts || 0,
      final_monthly_value: financial.final_monthly_value || 0,
      material_cost: financial.material_cost || 0,
      applied_discounts: financial.applied_discounts?.map(d => ({
        discount_id: d.discount_id,
        discount_code: d.discount_code,
        percentage: d.percentage
      })) || []
    }
  }, [previousYearData])
  
  // Comparação com ano anterior
  const comparison = useMemo(() => {
    if (!pricing || !previousYearFinance) {
      return null
    }
    
    return RematriculaPricingService.compareWithPreviousYear(
      pricing,
      previousYearFinance
    )
  }, [pricing, previousYearFinance])
  
  // Verificar se houve mudanças em relação ao ano anterior
  const hasChanges = useMemo(() => {
    if (!comparison) return false
    return comparison.difference !== 0
  }, [comparison])
  
  // Calcular economia/aumento
  const savingsAmount = useMemo(() => {
    if (!comparison) return null
    // Valor negativo significa economia
    return -comparison.difference
  }, [comparison])
  
  const savingsPercentage = useMemo(() => {
    if (!comparison) return null
    // Percentual negativo significa economia
    return -comparison.percentageChange
  }, [comparison])
  
  // Refetch da série
  const refetch = useCallback(() => {
    seriesQuery.refetch()
  }, [seriesQuery])
  
  // Limpar cache
  const clearCache = useCallback(() => {
    seriesQuery.remove()
    setLastCalculation(null)
  }, [seriesQuery])
  
  // Formatadores - usando métodos do serviço
  const formatCurrency = useCallback((value: number) => {
    return RematriculaPricingService.formatCurrency(value)
  }, [])
  
  const formatPercentage = useCallback((value: number) => {
    return RematriculaPricingService.formatPercentage(value)
  }, [])
  
  // Gerar resumo
  const generateSummary = useCallback(() => {
    if (!pricing) {
      return 'Nenhum cálculo disponível'
    }
    
    let summary = RematriculaPricingService.generateSummary(pricing)
    
    // Adicionar comparação se disponível
    if (comparison) {
      summary += '\n\n📊 Comparação com Ano Anterior:'
      summary += `\n• Valor anterior: ${formatCurrency(comparison.previousYearValue)}`
      summary += `\n• Valor atual: ${formatCurrency(comparison.currentYearValue)}`
      
      if (comparison.difference > 0) {
        summary += `\n• Aumento: ${formatCurrency(comparison.difference)} (${formatPercentage(comparison.percentageChange)})`
      } else if (comparison.difference < 0) {
        summary += `\n• Economia: ${formatCurrency(Math.abs(comparison.difference))} (${formatPercentage(Math.abs(comparison.percentageChange))})`
      } else {
        summary += '\n• Sem alteração no valor'
      }
    }
    
    return summary
  }, [pricing, comparison, formatCurrency, formatPercentage])
  
  // Determinar erro
  const error = useMemo(() => {
    if (seriesQuery.error) {
      return seriesQuery.error instanceof Error 
        ? seriesQuery.error.message 
        : 'Erro ao buscar série'
    }
    
    if (pricing && !pricing.isValid) {
      return pricing.validationErrors.join('; ')
    }
    
    return null
  }, [seriesQuery.error, pricing])
  
  return {
    // Resultado principal
    series: seriesQuery.data || null,
    pricing,
    comparison,
    isLoading: seriesQuery.isLoading,
    error,
    
    // Ações
    refetch,
    clearCache,
    
    // Estados adicionais
    hasChanges,
    savingsAmount,
    savingsPercentage,
    
    // Utilitários
    formatCurrency,
    formatPercentage,
    generateSummary
  }
}