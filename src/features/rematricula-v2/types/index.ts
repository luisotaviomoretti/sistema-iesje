/**
 * Tipos e Interfaces para o Sistema de Rematrícula V2
 * Arquitetura completamente independente do useEnrollmentForm
 */

// Tipos base reutilizados do sistema principal
export type EscolaType = 'pelicano' | 'sete_setembro'
export type Gender = 'M' | 'F' | 'other'
export type ShiftType = 'morning' | 'afternoon' | 'night'

// Status do fluxo de rematrícula
export type RematriculaStatus = 
  | 'idle'
  | 'validating'
  | 'loading_previous_data'
  | 'editing'
  | 'submitting'
  | 'completed'
  | 'error'

// Tipo de estudante para rematrícula
export type StudentType = 
  | 'current_year'    // Aluno já matriculado no ano corrente
  | 'previous_year'   // Aluno do ano anterior elegível para rematrícula
  | 'not_found'       // CPF não encontrado
  | 'unknown'         // Estado inicial

// Dados do responsável
export interface Guardian {
  id?: string
  name: string
  cpf: string
  phone: string
  email: string
  relationship: string
  is_financial_responsible?: boolean
}

// Dados do endereço
export interface Address {
  cep: string
  street: string
  number: string
  complement?: string
  district: string
  city: string
  state: string
}

// Dados acadêmicos
export interface AcademicData {
  series_id: string
  series_name?: string
  track_id: string
  track_name?: string
  shift: ShiftType
  previous_series_id?: string  // Série do ano anterior (apenas informativo)
}

// Dados do aluno
export interface StudentData {
  id?: string
  name: string
  cpf: string
  rg?: string
  birth_date: string
  gender: Gender
  escola: EscolaType
}

// Desconto aplicado
export interface AppliedDiscount {
  discount_id: string
  discount_code: string
  discount_name: string
  percentage_applied: number
  category: string
  requires_approval?: boolean
  approved?: boolean
}

// Dados financeiros
export interface FinancialData {
  base_value: number
  total_discount_percentage: number
  final_monthly_value: number
  applied_discounts: AppliedDiscount[]
  previous_discounts?: AppliedDiscount[]  // Descontos do ano anterior
}

// Dados completos de rematrícula
export interface RematriculaData {
  student: StudentData
  guardians: {
    guardian1: Guardian
    guardian2?: Guardian
  }
  address: Address
  academic: AcademicData
  financial: FinancialData
  metadata?: {
    academic_year: number
    created_by?: string
    created_at?: string
    updated_at?: string
  }
}

// Resposta da validação de CPF
export interface ValidationResponse {
  status: StudentType
  message?: string
  error?: string
}

// Resposta dos dados do ano anterior
export interface PreviousYearResponse {
  success: boolean
  data?: RematriculaData
  error?: string
}

// Estado do formulário de rematrícula
export interface RematriculaFormState {
  status: RematriculaStatus
  studentType: StudentType
  data: Partial<RematriculaData>
  previousYearData?: RematriculaData
  errors: Record<string, string>
  isDirty: boolean
  isValid: boolean
}

// Configurações do hook de rematrícula
export interface RematriculaConfig {
  keepPreviousDiscounts?: boolean  // Mantém descontos do ano anterior
  requireDocumentValidation?: boolean  // Exige validação de documentos
  enablePartialSave?: boolean  // Permite salvar parcialmente
}

// Resultado da submissão
export interface SubmissionResult {
  success: boolean
  enrollmentId?: string
  proposalUrl?: string
  error?: string
  validationErrors?: Record<string, string>
}