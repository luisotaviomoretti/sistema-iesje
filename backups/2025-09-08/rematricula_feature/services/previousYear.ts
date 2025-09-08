import { supabase } from '@/lib/supabase'
import type { PreviousYearPrefill } from '../types'

export class PreviousYearService {
  static async getPrefill(cpf: string, birthDateHint: string): Promise<PreviousYearPrefill> {
    const digits = (cpf || '').replace(/\D/g, '')
    const { data, error } = await supabase.functions.invoke('get_previous_year_student', {
      body: { cpf: digits, birth_date_hint: birthDateHint },
      headers: { 'content-type': 'application/json' },
    })
    if (error) {
      throw new Error(error.message || 'Falha ao obter dados do ano anterior')
    }
    return data as PreviousYearPrefill
  }
}

