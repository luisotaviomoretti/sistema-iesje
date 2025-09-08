// Tipos TypeScript para o schema de matrículas (Supabase)
// Gerados de acordo com a migração 014_create_enrollments.sql

export type Gender = 'M' | 'F' | 'other'
export type EscolaType = 'pelicano' | 'sete_setembro'
export type ShiftType = 'morning' | 'afternoon' | 'night'
export type EnrollmentStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'deleted'
export type ApprovalLevel = 'automatic' | 'coordinator' | 'director'
export type ApprovalStatus = 'pending' | 'approved' | 'rejected'

export interface EnrollmentRecord {
  id: string

  // Dados do Aluno
  student_name: string
  student_cpf: string
  student_rg?: string
  student_birth_date: string // ISO date (YYYY-MM-DD)
  student_gender: Gender
  student_escola: EscolaType

  // Dados Acadêmicos
  series_id: string
  series_name: string
  track_id: string
  track_name: string
  shift: ShiftType

  // Responsáveis
  guardian1_name: string
  guardian1_cpf: string
  guardian1_phone: string
  guardian1_email: string
  guardian1_relationship: string

  guardian2_name?: string
  guardian2_cpf?: string
  guardian2_phone?: string
  guardian2_email?: string
  guardian2_relationship?: string

  // Endereço
  address_cep: string
  address_street: string
  address_number: string
  address_complement?: string
  address_district: string
  address_city: string
  address_state: string

  // Financeiro
  base_value: number
  total_discount_percentage: number
  total_discount_value: number
  final_monthly_value: number
  material_cost: number

  // PDF
  pdf_url?: string
  pdf_generated_at?: string // ISO datetime

  // Status
  status: EnrollmentStatus
  approval_level?: ApprovalLevel
  approval_status: ApprovalStatus

  // Timestamps
  created_at: string // ISO datetime
  updated_at: string // ISO datetime
  deleted_at?: string // ISO datetime

  // Rastreamento de usuário (NOVO - Fase 2)
  created_by_user_id?: string | null
  created_by_user_email?: string | null
  created_by_user_name?: string | null
  created_by_user_type?: 'admin' | 'matricula' | 'anonymous'

  // Relacionamentos (joins opcionais)
  discounts?: EnrollmentDiscountRecord[]
  documents?: EnrollmentDocumentRecord[]
}

export interface EnrollmentDiscountRecord {
  id: string
  enrollment_id: string
  discount_id: string
  discount_code: string
  discount_name: string
  discount_category: string
  percentage_applied: number
  value_applied: number
  created_at: string // ISO datetime
}

export interface EnrollmentDocumentRecord {
  id: string
  enrollment_id: string
  document_type: string
  document_name: string
  file_url?: string
  is_required: boolean
  is_uploaded: boolean
  upload_date?: string // ISO datetime
  created_at: string // ISO datetime
}

