/**
 * Tipos específicos para o formulário de rematrícula
 * Independente do useEnrollmentForm - contém apenas campos editáveis
 */

import { Gender, ShiftType } from './index'

// Dados dos responsáveis (editáveis)
export interface GuardiansData {
  guardian1: {
    name: string
    cpf: string
    phone: string
    email: string
    relationship: string
    is_financial_responsible?: boolean
  }
  guardian2?: {
    name: string
    cpf: string
    phone: string
    email: string
    relationship: string
    is_financial_responsible?: boolean
  }
}

// Dados de endereço (editáveis)
export interface AddressData {
  cep: string
  street: string
  number: string
  complement?: string
  district: string
  city: string
  state: string
}

// Seleção de descontos
export interface DiscountSelection {
  discount_id: string
  discount_code: string
  percentage: number
  requires_documents?: boolean
}

// Dados do formulário de rematrícula (apenas campos editáveis)
export interface RematriculaFormData {
  // Responsáveis - totalmente editável
  guardians: GuardiansData
  
  // Endereço - totalmente editável
  address: AddressData
  
  // Acadêmico - seleção livre sem regras de progressão
  academic: {
    selectedSeriesId: string     // Série escolhida livremente
    selectedTrackId: string      // Trilho escolhido
    shift: ShiftType            // Turno escolhido
  }
  
  // Estratégia de migração de descontos
  discountMigration: {
    strategy: 'inherit' | 'manual'  // Herdar do ano anterior ou selecionar manualmente
    selectedDiscounts?: DiscountSelection[]
  }
}

// Dados do aluno do ano anterior (somente leitura)
export interface PreviousYearStudent {
  student: {
    id?: string
    name: string
    cpf: string
    rg?: string
    birth_date: string
    gender: Gender
    escola: 'pelicano' | 'sete_setembro'
  }
  academic: {
    series_id: string
    series_name: string
    track_id: string
    track_name: string
    shift: ShiftType
  }
  guardians: GuardiansData
  address: AddressData
  financial: {
    base_value: number
    total_discount_percentage: number
    final_monthly_value: number
    applied_discounts: DiscountSelection[]
  }
}

// Análise de migração de descontos
export interface DiscountMigrationAnalysis {
  eligibleToKeep: DiscountSelection[]      // Descontos que podem ser mantidos
  mustRevalidate: DiscountSelection[]      // Descontos que precisam revalidação
  noLongerEligible: DiscountSelection[]    // Descontos não mais elegíveis
  newlyAvailable: DiscountSelection[]      // Novos descontos disponíveis
}

// Cálculo de preços
export interface RematriculaPricing {
  baseValue: number
  discounts: Array<{
    code: string
    name: string
    percentage: number
    value: number
  }>
  totalDiscountPercentage: number
  totalDiscountValue: number
  finalMonthlyValue: number
}

// Status de validação
export interface RematriculaValidationStatus {
  isValid: boolean
  errors: Record<string, string>
  warnings: Record<string, string>
  pendingDocuments: string[]
}

// Estado completo da rematrícula
export interface RematriculaState {
  // Dados do ano anterior (somente leitura)
  previousData: PreviousYearStudent | null
  
  // Dados do formulário atual (editável)
  currentFormData: Partial<RematriculaFormData>
  
  // Cálculo de preços baseado nas seleções
  pricing: RematriculaPricing | null
  
  // Análise de migração de descontos
  migrationAnalysis: DiscountMigrationAnalysis | null
  
  // Status de validação
  validationStatus: RematriculaValidationStatus
  
  // Metadados
  metadata: {
    lastSaved?: Date
    isDirty: boolean
    isSubmitting: boolean
  }
}