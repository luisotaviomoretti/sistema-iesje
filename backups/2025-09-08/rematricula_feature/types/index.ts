export type EscolaType = 'pelicano' | 'sete_setembro'
export type Gender = 'M' | 'F' | 'other'
export type ShiftType = 'morning' | 'afternoon' | 'night'

export interface PreviousYearGuardian {
  name: string
  cpf: string
  phone: string
  email: string
  relationship: string
}

export interface PreviousYearPrefill {
  student: {
    name: string
    cpf: string
    rg?: string | null
    birth_date: string
    gender: Gender
    escola: EscolaType
  }
  academic: {
    series_id: string
    series_name: string
    track_id: string
    track_name: string
    shift: ShiftType
  }
  guardians: {
    guardian1: PreviousYearGuardian
    guardian2: PreviousYearGuardian | null
  }
  address: {
    cep: string
    street: string
    number: string
    complement?: string | null
    district: string
    city: string
    state: string
  }
  finance: {
    base_value: number
    total_discount_percentage: number
    final_monthly_value: number
    previous_applied_discounts: Array<{
      discount_id: string
      discount_code: string
      discount_name: string
      percentage_applied: number
      category: string
    }>
  }
}

