/**
 * Tipos para migração de descontos
 * Sistema de análise e transferência de descontos do ano anterior
 */

// Contexto de elegibilidade para análise
export interface EligibilityContext {
  studentCPF: string
  escola: 'pelicano' | 'sete_setembro'
  seriesId: string
  trackId: string
  cep: string
  hasActiveDebts?: boolean
}

// Resultado da análise de um desconto
export interface DiscountAnalysisResult {
  discountCode: string
  discountName: string
  previousPercentage: number
  
  // Status da migração
  canKeep: boolean
  requiresNewDocuments: boolean
  expirationDate?: Date
  
  // Motivos se não pode manter
  reasonIfCantKeep?: string
  
  // Documentos necessários
  requiredDocuments?: Array<{
    id: string
    name: string
    status: 'pending' | 'approved' | 'rejected'
  }>
}

// Estratégia de migração escolhida
export type MigrationStrategy = 
  | 'inherit_all'        // Herdar todos os descontos elegíveis
  | 'inherit_selected'   // Herdar apenas descontos selecionados
  | 'manual'            // Selecionar manualmente novos descontos
  | 'hybrid'            // Combinação de herdados e novos

// Configuração de migração
export interface MigrationConfig {
  strategy: MigrationStrategy
  autoApproveIfEligible: boolean
  requireDocumentRevalidation: boolean
  maxDiscountPercentage: number  // Limite máximo (ex: 60%)
}

// Resultado completo da análise de migração
export interface MigrationAnalysisComplete {
  // Análise por desconto
  discountAnalysis: DiscountAnalysisResult[]
  
  // Resumo
  summary: {
    totalPreviousDiscounts: number
    eligibleToKeep: number
    requiresRevalidation: number
    noLongerEligible: number
    newDiscountsAvailable: number
  }
  
  // Recomendação do sistema
  recommendedStrategy: MigrationStrategy
  
  // Impacto financeiro
  financialImpact: {
    previousMonthlyValue: number
    projectedMonthlyValue: number
    difference: number
    percentageChange: number
  }
  
  // Avisos e alertas
  warnings: string[]
  
  // Data da análise
  analyzedAt: Date
}