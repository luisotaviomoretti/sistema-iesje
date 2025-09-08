import { useCallback, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { cpfIsValid } from '@/features/enrollment/utils/validation'

export type ValidationState = 'idle' | 'validating' | 'ready' | 'error'
export type ValidationResult = 'not_found' | 'previous_year' | 'current_year'

interface HookState {
  state: ValidationState
  result: ValidationResult | null
  error: string | null
}

/**
 * Fallback validation hook that queries the database directly
 * Used when edge function is not available
 */
export function useStudentValidationFallback() {
  const [hookState, setHookState] = useState<HookState>({ 
    state: 'idle', 
    result: null, 
    error: null 
  })

  const reset = useCallback(() => {
    setHookState({ state: 'idle', result: null, error: null })
  }, [])

  const validateCPF = useCallback(async (cpfInput: string) => {
    const digits = (cpfInput || '').replace(/\D/g, '')
    
    if (!cpfIsValid(digits)) {
      setHookState({ state: 'error', result: null, error: 'CPF inválido' })
      return { ok: false as const, error: 'invalid' as const }
    }

    setHookState({ state: 'validating', error: null })

    try {
      // Format CPF with mask
      const cpfFormatted = digits.length === 11 
        ? `${digits.slice(0,3)}.${digits.slice(3,6)}.${digits.slice(6,9)}-${digits.slice(9)}`
        : digits

      const currentYear = new Date().getFullYear()
      const prevYear = currentYear - 1
      const startOfCurrent = new Date(currentYear, 0, 1).toISOString()
      const startOfNext = new Date(currentYear + 1, 0, 1).toISOString()
      const startOfPrev = new Date(prevYear, 0, 1).toISOString()

      // Check current year enrollments
      const { data: currentEnrollments, error: currentError } = await supabase
        .from('enrollments')
        .select('id')
        .or(`student_cpf.eq.${digits},student_cpf.eq.${cpfFormatted}`)
        .gte('created_at', startOfCurrent)
        .lt('created_at', startOfNext)
        .limit(1)

      if (currentError) throw currentError

      if (currentEnrollments && currentEnrollments.length > 0) {
        setHookState({ state: 'ready', result: 'current_year', error: null })
        return { ok: true as const, status: 'current_year' as ValidationResult }
      }

      // Check previous year enrollments
      const { data: prevEnrollments, error: prevError } = await supabase
        .from('enrollments')
        .select('id')
        .or(`student_cpf.eq.${digits},student_cpf.eq.${cpfFormatted}`)
        .gte('created_at', startOfPrev)
        .lt('created_at', startOfCurrent)
        .limit(1)

      if (prevError) throw prevError

      if (prevEnrollments && prevEnrollments.length > 0) {
        setHookState({ state: 'ready', result: 'previous_year', error: null })
        return { ok: true as const, status: 'previous_year' as ValidationResult }
      }

      // Check dedicated previous_year_students table
      const { data: prevStudents, error: pysError } = await supabase
        .from('previous_year_students')
        .select('id')
        .or(`student_cpf.eq.${digits},student_cpf.eq.${cpfFormatted}`)
        .eq('academic_year', String(prevYear))
        .limit(1)

      if (pysError) throw pysError

      if (prevStudents && prevStudents.length > 0) {
        setHookState({ state: 'ready', result: 'previous_year', error: null })
        return { ok: true as const, status: 'previous_year' as ValidationResult }
      }

      // Not found
      setHookState({ state: 'ready', result: 'not_found', error: null })
      return { ok: true as const, status: 'not_found' as ValidationResult }

    } catch (error: any) {
      console.error('[validateCPF fallback] Error:', error)
      setHookState({ 
        state: 'error', 
        result: null, 
        error: error.message || 'Erro ao validar CPF' 
      })
      return { ok: false as const, error: 'database' as const }
    }
  }, [])

  return {
    state: hookState.state,
    result: hookState.result,
    error: hookState.error,
    isBusy: hookState.state === 'validating',
    canValidate: hookState.state !== 'validating',
    validateCPF,
    reset,
  }
}