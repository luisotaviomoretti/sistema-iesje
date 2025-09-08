/**
 * Hook principal para gerenciar o formulário de rematrícula
 * Coordena validação, carregamento de dados e submissão
 */

import { useState, useCallback, useMemo } from 'react'
import { 
  RematriculaFormState, 
  RematriculaData, 
  RematriculaConfig,
  SubmissionResult 
} from '../types'
import { DEFAULT_CONFIG } from '../constants'
import { useRematriculaValidation } from './useRematriculaValidation'
import { usePreviousYearData } from './usePreviousYearData'

interface UseRematriculaFormReturn {
  // Estado
  formState: RematriculaFormState
  
  // Ações
  validateCPF: (cpf: string) => Promise<void>
  loadPreviousData: (cpf: string, birthDateHint?: string) => Promise<void>
  updateField: (path: string, value: any) => void
  submit: () => Promise<SubmissionResult>
  reset: () => void
  
  // Flags de estado
  isValidating: boolean
  isLoadingData: boolean
  isSubmitting: boolean
  canSubmit: boolean
}

export function useRematriculaForm(
  config: Partial<RematriculaConfig> = {}
): UseRematriculaFormReturn {
  const finalConfig = { ...DEFAULT_CONFIG, ...config }
  
  // Sub-hooks
  const validation = useRematriculaValidation()
  const previousYear = usePreviousYearData()
  
  // Estado principal
  const [formState, setFormState] = useState<RematriculaFormState>({
    status: 'idle',
    studentType: 'unknown',
    data: {},
    errors: {},
    isDirty: false,
    isValid: false
  })
  
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Validar CPF
  const validateCPF = useCallback(async (cpf: string) => {
    setFormState(prev => ({ ...prev, status: 'validating' }))
    
    const result = await validation.validate(cpf)
    
    setFormState(prev => ({
      ...prev,
      status: result.status === 'previous_year' ? 'idle' : 'error',
      studentType: result.status,
      data: { ...prev.data, student: { ...prev.data.student, cpf } as any }
    }))
  }, [validation])

  // Carregar dados anteriores
  const loadPreviousData = useCallback(async (cpf: string, birthDateHint?: string) => {
    setFormState(prev => ({ ...prev, status: 'loading_previous_data' }))
    
    const result = await previousYear.loadData(cpf, birthDateHint)
    
    if (result.success && result.data) {
      setFormState(prev => ({
        ...prev,
        status: 'editing',
        data: result.data,
        previousYearData: result.data,
        isValid: true
      }))
    } else {
      setFormState(prev => ({
        ...prev,
        status: 'error',
        errors: { load: result.error || 'Erro ao carregar dados' }
      }))
    }
  }, [previousYear])

  // Atualizar campo
  const updateField = useCallback((path: string, value: any) => {
    setFormState(prev => {
      const newData = { ...prev.data }
      const keys = path.split('.')
      let current: any = newData
      
      for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i]
        if (!current[key]) current[key] = {}
        current = current[key]
      }
      
      current[keys[keys.length - 1]] = value
      
      return {
        ...prev,
        data: newData,
        isDirty: true,
        errors: { ...prev.errors, [path]: undefined }
      }
    })
  }, [])

  // Submeter formulário
  const submit = useCallback(async (): Promise<SubmissionResult> => {
    setIsSubmitting(true)
    setFormState(prev => ({ ...prev, status: 'submitting' }))
    
    try {
      // TODO: Implementar submissão real
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      setFormState(prev => ({ ...prev, status: 'completed' }))
      
      return {
        success: true,
        enrollmentId: 'ENROLL-' + Date.now(),
        proposalUrl: '/pdf/proposal.pdf'
      }
    } catch (error) {
      setFormState(prev => ({ 
        ...prev, 
        status: 'error',
        errors: { submit: 'Erro ao enviar matrícula' }
      }))
      
      return {
        success: false,
        error: 'Erro ao enviar matrícula'
      }
    } finally {
      setIsSubmitting(false)
    }
  }, [formState.data])

  // Reset
  const reset = useCallback(() => {
    validation.reset()
    previousYear.reset()
    setFormState({
      status: 'idle',
      studentType: 'unknown',
      data: {},
      errors: {},
      isDirty: false,
      isValid: false
    })
    setIsSubmitting(false)
  }, [validation, previousYear])

  // Computar se pode submeter
  const canSubmit = useMemo(() => {
    return formState.isValid && 
           formState.isDirty && 
           !isSubmitting &&
           formState.status === 'editing' &&
           Object.keys(formState.errors).length === 0
  }, [formState, isSubmitting])

  return {
    formState,
    validateCPF,
    loadPreviousData,
    updateField,
    submit,
    reset,
    isValidating: validation.isValidating,
    isLoadingData: previousYear.isLoading,
    isSubmitting,
    canSubmit
  }
}