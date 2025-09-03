import { useMemo } from 'react'
import { useCurrentCapConfig } from '@/features/admin/hooks/useTrilhos'
import { TrilhoCalculationService, type TrilhoValidationInput } from '../services/trilhoCalculationService'
import { determinarTrilhoOptimo } from '../utils/trilhos'
import type { TrilhoNome, TipoDesconto } from '@/lib/supabase'

// ============================================================================
// HOOK DE VALIDAÇÃO EM TEMPO REAL
// ============================================================================

export interface TrackValidationResult {
  // Status geral
  isValid: boolean
  hasErrors: boolean
  hasWarnings: boolean
  
  // Cálculos
  totalDiscount: number
  capApplied: number
  remainingCap: number
  finalValue: number
  savings: number
  
  // Trilho
  suggestedTrack: TrilhoNome | null
  trackCompatible: boolean
  
  // Aprovação
  approvalLevel: 'AUTOMATICA' | 'COORDENACAO' | 'DIRECAO'
  approvalMessage: string
  
  // Mensagens
  errors: string[]
  warnings: string[]
  suggestions: string[]
  
  // Estado de loading
  isLoading: boolean
  
  // Documentação
  documentationComplete: boolean
  missingDocuments: string[]
  requiredDocuments: Array<{ desconto: string; documentos: string[] }>
}

export interface UseTrackValidationProps {
  trilho?: TrilhoNome | null
  descontos?: TipoDesconto[]
  valorBase?: number
  temResponsavelSecundario?: boolean
  autoSuggest?: boolean // Se deve sugerir trilho automaticamente
}

/**
 * Hook para validação em tempo real do sistema de trilhos
 * 
 * @param props - Parâmetros de validação
 * @returns Resultado da validação com todos os cálculos e mensagens
 */
export const useTrackValidation = ({
  trilho = null,
  descontos = [],
  valorBase = 0,
  temResponsavelSecundario = false,
  autoSuggest = true
}: UseTrackValidationProps = {}): TrackValidationResult => {
  
  const { data: configCap, isLoading: isLoadingConfig } = useCurrentCapConfig()
  
  return useMemo(() => {
    // Estado inicial de loading
    if (isLoadingConfig || !configCap) {
      return {
        isValid: false,
        hasErrors: false,
        hasWarnings: false,
        totalDiscount: 0,
        capApplied: 0,
        remainingCap: 0,
        finalValue: valorBase,
        savings: 0,
        suggestedTrack: null,
        trackCompatible: true,
        approvalLevel: 'AUTOMATICA' as const,
        approvalMessage: '',
        errors: [],
        warnings: [],
        suggestions: [],
        isLoading: true,
        documentationComplete: true,
        missingDocuments: [],
        requiredDocuments: []
      }
    }
    
    // Se não há descontos, retornar estado vazio
    if (!descontos.length) {
      return {
        isValid: false,
        hasErrors: false,
        hasWarnings: false,
        totalDiscount: 0,
        capApplied: 0,
        remainingCap: 0,
        finalValue: valorBase,
        savings: 0,
        suggestedTrack: null,
        trackCompatible: true,
        approvalLevel: 'AUTOMATICA' as const,
        approvalMessage: 'Selecione pelo menos um desconto',
        errors: [],
        warnings: [],
        suggestions: ['Selecione os descontos aplicáveis para este aluno'],
        isLoading: false,
        documentationComplete: true,
        missingDocuments: [],
        requiredDocuments: []
      }
    }
    
    // Determinar trilho sugerido
    const suggestedTrack = autoSuggest ? determinarTrilhoOptimo(descontos) : null
    const trilhoParaCalcular = trilho || suggestedTrack
    
    if (!trilhoParaCalcular) {
      return {
        isValid: false,
        hasErrors: true,
        hasWarnings: false,
        totalDiscount: 0,
        capApplied: 0,
        remainingCap: 0,
        finalValue: valorBase,
        savings: 0,
        suggestedTrack,
        trackCompatible: false,
        approvalLevel: 'AUTOMATICA' as const,
        approvalMessage: '',
        errors: ['Não foi possível determinar um trilho compatível com os descontos selecionados'],
        warnings: [],
        suggestions: ['Revise os descontos selecionados ou escolha um trilho manualmente'],
        isLoading: false,
        documentationComplete: true,
        missingDocuments: [],
        requiredDocuments: []
      }
    }
    
    // Executar cálculo
    const calculationInput: TrilhoValidationInput = {
      trilho: trilhoParaCalcular,
      descontos,
      valorBase,
      temResponsavelSecundario,
      configCap
    }
    
    const result = TrilhoCalculationService.calculateDiscount(calculationInput)
    
    // Validar documentação
    const docValidation = TrilhoCalculationService.validateDocumentation(descontos)
    
    // Calcular economia
    const savings = valorBase - result.finalValue
    
    // Gerar mensagens adicionais
    const suggestions: string[] = []
    
    if (trilho !== suggestedTrack && suggestedTrack) {
      suggestions.push(
        `Trilho sugerido: ${suggestedTrack.toUpperCase()}. ` +
        `Pode oferecer melhores condições para estes descontos.`
      )
    }
    
    if (result.remainingCap > 10) {
      suggestions.push(
        `Ainda há ${result.remainingCap.toFixed(1)}% de cap disponível. ` +
        `Considere descontos comerciais adicionais.`
      )
    }
    
    if (temResponsavelSecundario && trilhoParaCalcular === 'comercial') {
      suggestions.push(
        `Com responsável secundário, o trilho COMBINADO pode oferecer cap maior (${configCap.cap_with_secondary}%).`
      )
    }
    
    // Formatagem da mensagem de aprovação
    const approvalMessage = result.isValid 
      ? TrilhoCalculationService.formatters.approvalLevel(result.nivel_aprovacao)
      : 'Corrija os erros para determinar nível de aprovação'
    
    return {
      isValid: result.isValid,
      hasErrors: result.errors.length > 0,
      hasWarnings: result.warnings.length > 0,
      totalDiscount: result.totalDiscount,
      capApplied: result.capApplied,
      remainingCap: result.remainingCap,
      finalValue: result.finalValue,
      savings,
      suggestedTrack,
      trackCompatible: trilho ? result.errors.length === 0 : true,
      approvalLevel: result.nivel_aprovacao,
      approvalMessage,
      errors: result.errors,
      warnings: result.warnings,
      suggestions,
      isLoading: false,
      documentationComplete: docValidation.isComplete,
      missingDocuments: docValidation.missingDocuments,
      requiredDocuments: docValidation.requiredDocuments
    }
    
  }, [trilho, descontos, valorBase, temResponsavelSecundario, configCap, isLoadingConfig, autoSuggest])
}

// ============================================================================
// HOOKS AUXILIARES
// ============================================================================

/**
 * Hook simplificado para validação de trilho específico
 */
export const useTrackCompatibility = (
  trilho: TrilhoNome,
  descontos: TipoDesconto[]
) => {
  return useMemo(() => {
    if (!descontos.length) {
      return { isCompatible: true, reason: null }
    }
    
    const categorias = descontos.map(d => d.categoria)
    const temEspecial = categorias.includes('especial')
    const temRegular = categorias.includes('regular')
    const temNegociacao = categorias.includes('negociacao')
    
    switch (trilho) {
      case 'especial':
        if (temRegular || temNegociacao) {
          return { 
            isCompatible: false, 
            reason: 'Trilho Especial aceita apenas descontos especiais' 
          }
        }
        break
        
      case 'combinado':
        if (temEspecial) {
          return { 
            isCompatible: false, 
            reason: 'Trilho Combinado não aceita descontos especiais' 
          }
        }
        break
        
      case 'comercial':
        if (temEspecial || temRegular) {
          return { 
            isCompatible: false, 
            reason: 'Trilho Comercial aceita apenas descontos de negociação' 
          }
        }
        break
    }
    
    return { isCompatible: true, reason: null }
  }, [trilho, descontos])
}

/**
 * Hook para sugestões de melhoria
 */
export const useTrackSuggestions = (
  trilho: TrilhoNome,
  descontos: TipoDesconto[],
  temResponsavelSecundario: boolean
) => {
  const { data: configCap } = useCurrentCapConfig()
  
  return useMemo(() => {
    if (!configCap) return []
    
    const suggestions: string[] = []
    
    // Comparar opções de trilho
    const comparisons = TrilhoCalculationService.compareTrackOptions(
      descontos,
      1000, // Valor base padrão para comparação
      temResponsavelSecundario,
      configCap
    )
    
    // Encontrar melhor opção
    const validTracks = Object.entries(comparisons)
      .filter(([_, result]) => result.isValid)
      .sort((a, b) => b[1].capApplied - a[1].capApplied)
    
    if (validTracks.length > 1) {
      const [bestTrack, bestResult] = validTracks[0]
      const currentResult = comparisons[trilho]
      
      if (bestTrack !== trilho && currentResult.capApplied < bestResult.capApplied) {
        suggestions.push(
          `Trilho ${bestTrack.toUpperCase()} pode oferecer ${bestResult.capApplied.toFixed(1)}% ` +
          `vs ${currentResult.capApplied.toFixed(1)}% do trilho atual`
        )
      }
    }
    
    return suggestions
  }, [trilho, descontos, temResponsavelSecundario, configCap])
}