import type { UseFormReturn } from 'react-hook-form'
import type { DescontoSelecionado } from './discounts'

// Dados específicos do step de descontos
export interface DiscountFormData {
  descontos_selecionados: DescontoSelecionado[]
  observacoes_gerais?: string
  aceita_termos: boolean
}

// Dados do formulário principal
export interface EnrollmentFormData {
  // Dados do aluno
  student: {
    name: string
    cpf: string
    rg?: string
    birthDate: string
    gender: 'M' | 'F' | 'other'
    escola: 'pelicano' | 'sete_setembro'
  }
  
  // Dados dos responsáveis
  guardians: {
    guardian1: {
      name: string
      cpf: string
      phone: string
      email: string
      relationship: string
    }
    guardian2?: {
      name: string
      cpf: string
      phone: string
      email: string
      relationship: string
    } | null
  }
  
  // Endereço
  address: {
    cep: string
    street: string
    number: string
    complement?: string
    district: string
    city: string
    state: string
  }
  
  // Dados acadêmicos
  academic: {
    seriesId: string
    trackId: string
    shift: 'morning' | 'afternoon' | 'night'
  }
  
  // Dados de desconto - Array com IDs e percentuais aplicados
  selectedDiscounts: Array<{
    id: string
    percentual: number
  }>
  
  // Metadados
  currentStep: number
  isSubmitting: boolean
  errors: Record<string, string>
}

// Estado do hook principal
export interface EnrollmentFormState {
  form: UseFormReturn<EnrollmentFormData>
  currentStep: number
  isSubmitting: boolean
  errors: Record<string, string>
  pricing: any | null // Será tipado em business.ts
  isLoadingData: boolean
}

// Ações disponíveis
export interface EnrollmentFormActions {
  nextStep: () => void
  prevStep: () => void
  goToStep: (step: number) => void
  submitForm: () => Promise<void>
  resetForm: () => void
  canGoNext: boolean
  canGoPrev: boolean
  isFirstStep: boolean
  isLastStep: boolean
}

// Tipos para os steps
export interface StepProps extends EnrollmentFormState, EnrollmentFormActions {}

// Tipos para opções de seleção
export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

// Tipos para relacionamentos
export type GuardianRelationship = 
  | 'pai' 
  | 'mae' 
  | 'avo' 
  | 'ava' 
  | 'tio' 
  | 'tia' 
  | 'irmao' 
  | 'irma' 
  | 'tutor' 
  | 'responsavel'

// Tipos para turnos
export type ShiftType = 'morning' | 'afternoon' | 'night'

// Tipos para escolas
export type EscolaType = 'pelicano' | 'sete_setembro'

// Tipos para validação de steps
export interface StepValidation {
  isValid: boolean
  errors: string[]
  canProceed: boolean
}