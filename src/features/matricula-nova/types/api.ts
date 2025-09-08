// Tipos do Supabase - baseados nas tabelas existentes

export interface DatabaseDiscount {
  id: string
  codigo: string
  nome: string
  percentual: number
  is_active: boolean
  requires_document: boolean
  description?: string
  max_cumulative_percentage?: number
  created_at?: string
  updated_at?: string
}

export interface DatabaseSeries {
  id: string
  nome: string
  nivel: string
  value: number
  is_active: boolean
  turno?: string
  created_at?: string
  updated_at?: string
}

export interface DatabaseTrack {
  id: string
  nome: string
  description?: string
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export interface DatabaseStudent {
  id: string
  name: string
  cpf: string
  birth_date: string
  email?: string
  phone?: string
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export interface DatabaseEnrollment {
  id: string
  student_data: any
  guardians_data: any
  address_data: any
  academic_data: any
  selected_discounts: string[]
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  updated_at?: string
}

// Tipos para respostas da API
export interface ApiResponse<T> {
  data: T | null
  error: string | null
}

export interface ApiListResponse<T> {
  data: T[]
  error: string | null
  count?: number
}

// Tipos para filtros de busca
export interface StudentSearchFilters {
  name?: string
  cpf?: string
  email?: string
  phone?: string
}

export interface DiscountFilters {
  isActive?: boolean
  requiresDocument?: boolean
  level?: string
}

export interface SeriesFilters {
  nivel?: string
  turno?: string
  isActive?: boolean
}

// Tipos para CEP
export interface CepData {
  cep: string
  logradouro: string
  complemento: string
  bairro: string
  localidade: string
  uf: string
  erro?: boolean
}