// Tipos de cálculos e regras de negócio

export interface PricingCalculation {
  baseValue: number
  discounts: Array<{
    id: string
    name: string
    code: string
    percentage: number
    value: number
  }>
  totalDiscountPercentage: number
  totalDiscountValue: number
  finalValue: number
  isValid: boolean
  validationErrors: string[]
  warnings: string[]
}

// Tipos de validação
export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

export interface FieldValidation {
  field: string
  value: any
  result: ValidationResult
}

// Tipos de regras de negócio para descontos
export interface DiscountRule {
  maxCumulativePercentage: number
  requiredDocuments: string[]
  incompatibleDiscounts: string[]
  approvalLevel: 'automatic' | 'coordinator' | 'director'
  conditions: DiscountCondition[]
}

export interface DiscountCondition {
  type: 'age' | 'location' | 'family' | 'income' | 'other'
  operator: 'equals' | 'greater_than' | 'less_than' | 'contains' | 'in'
  value: any
  message?: string
}

// Tipos para elegibilidade de descontos
export interface DiscountEligibility {
  discountId: string
  isEligible: boolean
  reasons: string[]
  requirements: string[]
  autoApply: boolean
}

// Tipos para aprovação
export interface ApprovalLevel {
  level: 'automatic' | 'coordinator' | 'director'
  maxPercentage: number
  description: string
}

export interface ApprovalRequest {
  enrollmentId: string
  discounts: string[]
  totalPercentage: number
  requiredLevel: ApprovalLevel['level']
  justification?: string
  documents: string[]
}

// Tipos para cálculo de CEP
export interface CepDiscountResult {
  isEligible: boolean
  discountId?: string
  percentage: number
  reason: string
  zipCode: string
  city: string
}

// Tipos para histórico de cálculos
export interface CalculationHistory {
  timestamp: Date
  calculation: PricingCalculation
  changes: Array<{
    field: string
    oldValue: any
    newValue: any
    reason: string
  }>
}

// Tipos para validação de documentos
export interface DocumentValidation {
  type: 'cpf' | 'rg' | 'certidao' | 'comprovante_residencia' | 'declaracao' | 'other'
  isValid: boolean
  errors: string[]
  required: boolean
  uploaded: boolean
}

// Tipos para sugestões automáticas
export interface DiscountSuggestion {
  discountId: string
  confidence: number
  reason: string
  autoApply: boolean
  requiresConfirmation: boolean
}

// Tipos para relatórios
export interface EnrollmentSummary {
  student: {
    name: string
    cpf: string
    age: number
  }
  academic: {
    series: string
    track: string
    shift: string
  }
  financial: {
    baseValue: number
    totalDiscount: number
    finalValue: number
    discounts: Array<{
      name: string
      percentage: number
      value: number
    }>
  }
  approval: {
    required: boolean
    level: ApprovalLevel['level']
    status: 'pending' | 'approved' | 'rejected'
  }
}