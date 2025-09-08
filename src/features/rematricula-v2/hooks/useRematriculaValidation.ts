/**
 * Hook para validação de CPF na rematrícula
 * Determina se o aluno é elegível para rematrícula
 */

import { useState } from 'react'
import { StudentType, ValidationResponse } from '../types'
import { MESSAGES, TIMEOUTS } from '../constants'

interface UseRematriculaValidationReturn {
  validate: (cpf: string) => Promise<ValidationResponse>
  isValidating: boolean
  studentType: StudentType
  error: string | null
  reset: () => void
}

export function useRematriculaValidation(): UseRematriculaValidationReturn {
  const [isValidating, setIsValidating] = useState(false)
  const [studentType, setStudentType] = useState<StudentType>('unknown')
  const [error, setError] = useState<string | null>(null)

  const validate = async (cpf: string): Promise<ValidationResponse> => {
    setIsValidating(true)
    setError(null)

    try {
      // TODO: Implementar chamada à Edge Function validate_cpf
      // Por enquanto, retorna mock
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const response: ValidationResponse = {
        status: 'previous_year',
        message: MESSAGES.validation.previousYear
      }

      setStudentType(response.status)
      return response

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : MESSAGES.validation.error
      setError(errorMessage)
      setStudentType('unknown')
      
      return {
        status: 'unknown',
        error: errorMessage
      }
    } finally {
      setIsValidating(false)
    }
  }

  const reset = () => {
    setStudentType('unknown')
    setError(null)
    setIsValidating(false)
  }

  return {
    validate,
    isValidating,
    studentType,
    error,
    reset
  }
}