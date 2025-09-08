import { supabase } from '@/lib/supabase'

export type ValidationServiceStatus = 'not_found' | 'previous_year' | 'current_year'

export class ValidationService {
  static async validateCpf(cpf: string): Promise<{ status: ValidationServiceStatus }> {
    const digits = (cpf || '').replace(/\D/g, '')
    const { data, error } = await supabase.functions.invoke('validate_cpf', {
      body: { cpf: digits },
      headers: { 'content-type': 'application/json' },
    })
    if (error) throw new Error(error.message || 'Falha ao validar CPF')
    return { status: (data?.status ?? 'not_found') as ValidationServiceStatus }
  }
}

