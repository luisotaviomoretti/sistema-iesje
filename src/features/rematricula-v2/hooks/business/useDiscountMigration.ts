/**
 * Hook para gerenciar migração de descontos na rematrícula
 * Integra o DiscountMigrationEngine com a interface React
 * Totalmente independente do sistema de nova matrícula
 */

import { useState, useCallback, useMemo } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { DiscountMigrationEngine } from '../../services/discountMigrationRules'
import { 
  EligibilityContext,
  MigrationAnalysisComplete,
  MigrationStrategy,
  DiscountAnalysisResult
} from '../../types/migration'
import { DiscountSelection, PreviousYearStudent } from '../../types/rematricula'

interface UseDiscountMigrationParams {
  previousYearData: PreviousYearStudent | null
  currentContext: {
    cpf: string
    escola: 'pelicano' | 'sete_setembro'
    selectedSeriesId: string
    selectedTrackId: string
    cep: string
  }
  enabled?: boolean
}

interface UseDiscountMigrationReturn {
  // Estado da análise
  migrationAnalysis: MigrationAnalysisComplete | null
  isAnalyzing: boolean
  analysisError: Error | null
  
  // Descontos
  eligibleDiscounts: DiscountAnalysisResult[]
  ineligibleDiscounts: DiscountAnalysisResult[]
  needsRevalidation: DiscountAnalysisResult[]
  
  // Estratégia
  recommendedStrategy: MigrationStrategy | null
  selectedStrategy: MigrationStrategy | null
  setSelectedStrategy: (strategy: MigrationStrategy) => void
  
  // Seleção manual
  selectedDiscounts: DiscountSelection[]
  toggleDiscountSelection: (discountCode: string) => void
  clearSelection: () => void
  
  // Validação
  validationResult: {
    isValid: boolean
    totalPercentage: number
    errors: string[]
  }
  
  // Ações
  runAnalysis: () => void
  applyRecommendedStrategy: () => void
  confirmSelection: () => Promise<void>
  
  // Impacto financeiro
  financialImpact: {
    previousValue: number
    projectedValue: number
    difference: number
    percentageChange: number
  } | null
}

/**
 * Hook principal para migração de descontos
 */
export function useDiscountMigration({
  previousYearData,
  currentContext,
  enabled = true
}: UseDiscountMigrationParams): UseDiscountMigrationReturn {
  
  // Estado local
  const [selectedStrategy, setSelectedStrategy] = useState<MigrationStrategy | null>(null)
  const [selectedDiscounts, setSelectedDiscounts] = useState<DiscountSelection[]>([])
  const [migrationAnalysis, setMigrationAnalysis] = useState<MigrationAnalysisComplete | null>(null)
  
  // Criar contexto de elegibilidade
  const eligibilityContext = useMemo<EligibilityContext | null>(() => {
    if (!currentContext.cpf || !currentContext.selectedSeriesId) {
      return null
    }
    
    return {
      studentCPF: currentContext.cpf,
      escola: currentContext.escola,
      seriesId: currentContext.selectedSeriesId,
      trackId: currentContext.selectedTrackId,
      cep: currentContext.cep,
      hasActiveDebts: false // TODO: Implementar verificação de débitos
    }
  }, [currentContext])
  
  // Query para análise de migração
  const analysisQuery = useQuery({
    queryKey: ['discount-migration-analysis', eligibilityContext, previousYearData?.financial?.applied_discounts],
    queryFn: async () => {
      if (!eligibilityContext || !previousYearData?.financial?.applied_discounts) {
        return null
      }
      
      // Mapear descontos do ano anterior para o formato esperado
      const previousDiscounts = previousYearData.financial.applied_discounts.map(d => ({
        discount_id: d.discount_id,
        discount_code: d.discount_code,
        discount_name: d.discount_code, // TODO: Buscar nome completo
        percentage_applied: d.percentage,
        category: 'general', // TODO: Buscar categoria real
        required_documents: d.requires_documents ? ['Documentação padrão'] : undefined
      }))
      
      // Executar análise
      const analysis = DiscountMigrationEngine.analyzeMigration(
        previousDiscounts,
        eligibilityContext
      )
      
      setMigrationAnalysis(analysis)
      
      // Se não há estratégia selecionada, usar a recomendada
      if (!selectedStrategy) {
        setSelectedStrategy(analysis.recommendedStrategy)
      }
      
      return analysis
    },
    enabled: enabled && !!eligibilityContext && !!previousYearData,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000 // 10 minutos
  })
  
  // Mutation para confirmar seleção
  const confirmMutation = useMutation({
    mutationFn: async () => {
      // TODO: Implementar salvamento real no backend
      console.log('Salvando seleção de descontos:', {
        strategy: selectedStrategy,
        discounts: selectedDiscounts
      })
      
      // Simular delay de API
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      return { success: true }
    },
    onSuccess: () => {
      console.log('Seleção de descontos confirmada com sucesso')
    },
    onError: (error) => {
      console.error('Erro ao confirmar seleção:', error)
    }
  })
  
  // Descontos categorizados
  const eligibleDiscounts = useMemo(() => {
    if (!migrationAnalysis) return []
    return migrationAnalysis.discountAnalysis.filter(d => d.canKeep && !d.requiresNewDocuments)
  }, [migrationAnalysis])
  
  const ineligibleDiscounts = useMemo(() => {
    if (!migrationAnalysis) return []
    return migrationAnalysis.discountAnalysis.filter(d => !d.canKeep)
  }, [migrationAnalysis])
  
  const needsRevalidation = useMemo(() => {
    if (!migrationAnalysis) return []
    return migrationAnalysis.discountAnalysis.filter(d => d.requiresNewDocuments)
  }, [migrationAnalysis])
  
  // Validação da seleção atual
  const validationResult = useMemo(() => {
    if (selectedDiscounts.length === 0) {
      return {
        isValid: true,
        totalPercentage: 0,
        errors: []
      }
    }
    
    return DiscountMigrationEngine.validateDiscountSet(selectedDiscounts)
  }, [selectedDiscounts])
  
  // Toggle de seleção de desconto
  const toggleDiscountSelection = useCallback((discountCode: string) => {
    setSelectedDiscounts(prev => {
      const exists = prev.find(d => d.discount_code === discountCode)
      
      if (exists) {
        // Remover
        return prev.filter(d => d.discount_code !== discountCode)
      } else {
        // Adicionar - buscar dados do desconto na análise
        const discountData = migrationAnalysis?.discountAnalysis.find(
          d => d.discountCode === discountCode
        )
        
        if (discountData) {
          const newDiscount: DiscountSelection = {
            discount_id: `disc_${discountCode}`,
            discount_code: discountCode,
            percentage: discountData.previousPercentage,
            requires_documents: discountData.requiresNewDocuments
          }
          
          return [...prev, newDiscount]
        }
      }
      
      return prev
    })
  }, [migrationAnalysis])
  
  // Limpar seleção
  const clearSelection = useCallback(() => {
    setSelectedDiscounts([])
    setSelectedStrategy('manual')
  }, [])
  
  // Aplicar estratégia recomendada
  const applyRecommendedStrategy = useCallback(() => {
    if (!migrationAnalysis) return
    
    const strategy = migrationAnalysis.recommendedStrategy
    setSelectedStrategy(strategy)
    
    switch (strategy) {
      case 'inherit_all':
        // Selecionar todos os elegíveis
        const allEligible = migrationAnalysis.discountAnalysis
          .filter(d => d.canKeep)
          .map(d => ({
            discount_id: `disc_${d.discountCode}`,
            discount_code: d.discountCode,
            percentage: d.previousPercentage,
            requires_documents: d.requiresNewDocuments
          }))
        setSelectedDiscounts(allEligible)
        break
        
      case 'inherit_selected':
        // Selecionar apenas os que não precisam revalidação
        const noValidationNeeded = migrationAnalysis.discountAnalysis
          .filter(d => d.canKeep && !d.requiresNewDocuments)
          .map(d => ({
            discount_id: `disc_${d.discountCode}`,
            discount_code: d.discountCode,
            percentage: d.previousPercentage,
            requires_documents: false
          }))
        setSelectedDiscounts(noValidationNeeded)
        break
        
      case 'manual':
        // Limpar seleção para escolha manual
        setSelectedDiscounts([])
        break
        
      case 'hybrid':
        // Começar com os sem validação, permitir adicionar outros
        const hybridStart = migrationAnalysis.discountAnalysis
          .filter(d => d.canKeep && !d.requiresNewDocuments)
          .slice(0, 2) // Pegar apenas os 2 primeiros como exemplo
          .map(d => ({
            discount_id: `disc_${d.discountCode}`,
            discount_code: d.discountCode,
            percentage: d.previousPercentage,
            requires_documents: false
          }))
        setSelectedDiscounts(hybridStart)
        break
    }
  }, [migrationAnalysis])
  
  // Executar análise manualmente
  const runAnalysis = useCallback(() => {
    analysisQuery.refetch()
  }, [analysisQuery])
  
  // Confirmar seleção
  const confirmSelection = useCallback(async () => {
    if (!validationResult.isValid) {
      throw new Error(validationResult.errors.join('; '))
    }
    
    await confirmMutation.mutateAsync()
  }, [validationResult, confirmMutation])
  
  // Impacto financeiro
  const financialImpact = useMemo(() => {
    if (!migrationAnalysis) return null
    
    return {
      previousValue: migrationAnalysis.financialImpact.previousMonthlyValue,
      projectedValue: migrationAnalysis.financialImpact.projectedMonthlyValue,
      difference: migrationAnalysis.financialImpact.difference,
      percentageChange: migrationAnalysis.financialImpact.percentageChange
    }
  }, [migrationAnalysis])
  
  return {
    // Estado da análise
    migrationAnalysis,
    isAnalyzing: analysisQuery.isLoading,
    analysisError: analysisQuery.error as Error | null,
    
    // Descontos categorizados
    eligibleDiscounts,
    ineligibleDiscounts,
    needsRevalidation,
    
    // Estratégia
    recommendedStrategy: migrationAnalysis?.recommendedStrategy || null,
    selectedStrategy,
    setSelectedStrategy,
    
    // Seleção manual
    selectedDiscounts,
    toggleDiscountSelection,
    clearSelection,
    
    // Validação
    validationResult,
    
    // Ações
    runAnalysis,
    applyRecommendedStrategy,
    confirmSelection,
    
    // Impacto financeiro
    financialImpact
  }
}