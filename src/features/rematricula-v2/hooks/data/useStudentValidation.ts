/**
 * Hook para validação de CPF do aluno
 * Verifica elegibilidade para rematrícula via Edge Function
 */

import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { StudentType } from '../../types'

interface ValidationParams {
  cpf: string
}

interface ValidationResponse {
  status: StudentType
  message?: string
  academic_year?: number
}

/**
 * Hook para validar CPF e verificar elegibilidade para rematrícula
 * 
 * @returns Mutation para validar CPF com estados de loading/erro
 * 
 * @example
 * ```tsx
 * const { mutate: validateCPF, isLoading } = useStudentValidation()
 * 
 * validateCPF({ cpf: '123.456.789-00' }, {
 *   onSuccess: (data) => {
 *     if (data.status === 'previous_year') {
 *       // Elegível para rematrícula
 *     }
 *   }
 * })
 * ```
 */
export function useStudentValidation() {
  return useMutation({
    mutationKey: ['rematricula-validation'],
    
    mutationFn: async ({ cpf }: ValidationParams): Promise<ValidationResponse> => {
      // Normaliza CPF removendo formatação
      const normalizedCPF = cpf.replace(/\D/g, '')
      
      // Validação básica
      if (!normalizedCPF || normalizedCPF.length !== 11) {
        throw new Error('CPF inválido')
      }
      
      // Chama Edge Function de validação
      const response = await supabase.functions.invoke('validate_cpf', {
        body: { cpf: normalizedCPF }
      })
      
      if (response.error) {
        console.error('[useStudentValidation] Edge Function error:', response.error)
        throw new Error(response.error.message || 'Erro ao validar CPF')
      }
      
      if (!response.data) {
        throw new Error('Resposta inválida do servidor')
      }
      
      // Retorna status de validação
      return {
        status: response.data.status as StudentType,
        message: response.data.message,
        academic_year: response.data.academic_year
      }
    },
    
    // Callbacks para logging em desenvolvimento
    onSuccess: (data) => {
      if (import.meta.env.DEV) {
        console.log('[useStudentValidation] Validation result:', data)
      }
    },
    
    onError: (error) => {
      if (import.meta.env.DEV) {
        console.error('[useStudentValidation] Validation error:', error)
      }
    }
  })
}