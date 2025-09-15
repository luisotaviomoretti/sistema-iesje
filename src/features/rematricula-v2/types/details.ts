/**
 * Read Model exclusivo da Rematrícula (Detalhes do Aluno Veterano)
 * Independente do fluxo de aluno novo.
 */

export type RematriculaDataSource = 'previous_year' | 'enrollment' | 'both' | 'unknown'

export interface ReadModelStudent {
  id?: string
  name: string
  cpf: string
  birth_date?: string
  gender?: 'M' | 'F' | 'other'
  escola?: 'pelicano' | 'sete_setembro'
}

export interface ReadModelAcademic {
  academic_year?: string
  series_id?: string
  series_name?: string
  track_id?: string
  track_name?: string
  shift?: 'morning' | 'afternoon' | 'night'
}

export interface ReadModelGuardian {
  name: string
  cpf: string
  phone?: string
  email?: string
  relationship?: string
}

export interface ReadModelGuardians {
  guardian1: ReadModelGuardian
  guardian2?: ReadModelGuardian
}

export interface ReadModelAddress {
  cep?: string
  street?: string
  number?: string
  complement?: string
  district?: string
  city?: string
  state?: string
}

export interface ReadModelAppliedDiscount {
  discount_id?: string
  discount_code?: string
  discount_name?: string
  percentage_applied?: number
  category?: string
  requires_approval?: boolean
  approved?: boolean
}

export interface ReadModelFinancial {
  base_value?: number
  total_discount_percentage?: number
  final_monthly_value?: number
  applied_discounts?: ReadModelAppliedDiscount[]
  total_discount_value?: number
  material_cost?: number
  pdf_url?: string
  pdf_generated_at?: string
  // Campos opcionais para detalhar o "Desconto sugerido" do ano anterior
  suggested_discount_code?: string
  suggested_discount_description?: string
}

export interface RematriculaReadModel {
  student: ReadModelStudent
  academic: ReadModelAcademic
  guardians: ReadModelGuardians
  address: ReadModelAddress
  financial: ReadModelFinancial
  meta?: {
    source: RematriculaDataSource
    fetched_at: string
    has_permission_issue?: boolean
    raw?: Record<string, unknown>
  }
}

/**
 * Shapes mínimos esperados das fontes (para mapeamento puro)
 * Não importar tipos do fluxo de aluno novo.
 */
export interface PreviousYearStudentRowMinimal {
  id?: string
  student_name: string
  student_cpf: string
  student_cpf_digits?: string
  student_birth_date?: string
  student_gender?: 'M' | 'F' | 'other'
  student_escola?: 'pelicano' | 'sete_setembro'
  academic_year?: string
  series_id?: string
  series_name?: string
  track_id?: string
  track_name?: string
  shift?: 'morning' | 'afternoon' | 'night'
  guardian1_name?: string
  guardian1_cpf?: string
  guardian1_phone?: string
  guardian1_email?: string
  guardian1_relationship?: string
  guardian2_name?: string
  guardian2_cpf?: string
  guardian2_phone?: string
  guardian2_email?: string
  guardian2_relationship?: string
  address_cep?: string
  address_street?: string
  address_number?: string
  address_complement?: string
  address_district?: string
  address_city?: string
  address_state?: string
  base_value?: number | string
  total_discount_percentage?: number | string
  final_monthly_value?: number | string
  applied_discounts?: any[]
  total_discount_value?: number | string
  material_cost?: number | string
  pdf_url?: string
  pdf_generated_at?: string
  status?: string
  approval_level?: string
  approval_status?: string
  created_at?: string
  updated_at?: string
  // Novas colunas em previous_year_students
  discount_code?: string
  discount_description?: string
}

export interface EnrollmentRowMinimal {
  id?: string
  student_name: string
  student_cpf: string
  student_cpf_digits?: string
  student_birth_date?: string
  student_gender?: 'M' | 'F' | 'other'
  student_escola?: 'pelicano' | 'sete_setembro'
  series_id?: string
  series_name?: string
  track_id?: string
  track_name?: string
  shift?: 'morning' | 'afternoon' | 'night'
  guardian1_name?: string
  guardian1_cpf?: string
  guardian1_phone?: string
  guardian1_email?: string
  guardian1_relationship?: string
  guardian2_name?: string
  guardian2_cpf?: string
  guardian2_phone?: string
  guardian2_email?: string
  guardian2_relationship?: string
  address_cep?: string
  address_street?: string
  address_number?: string
  address_complement?: string
  address_district?: string
  address_city?: string
  address_state?: string
  base_value?: number | string
  total_discount_percentage?: number | string
  final_monthly_value?: number | string
  applied_discounts?: any[]
  material_cost?: number | string
  pdf_url?: string
  pdf_generated_at?: string
  status?: string
  approval_level?: string
  approval_status?: string
  created_at?: string
  updated_at?: string
  // Tag de origem do fluxo (quando disponível)
  tag_matricula?: 'novo_aluno' | 'rematricula'
}
