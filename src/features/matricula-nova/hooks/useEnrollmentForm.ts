import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState, useCallback, useMemo, useEffect } from 'react'
import { toast } from 'sonner'

import { enrollmentSchema, validateStep, validateRequiredFields } from '../services/business/validations'
import { calculatePricing, determineApprovalLevel } from '../services/business/calculations'
import { EnrollmentApiService } from '../services/api/enrollment'

// Hooks de dados
import { useDiscounts } from './data/useDiscounts'
import { useSeries } from './data/useSeries'
import { useTracks } from './data/useTracks'
import { useMatriculaAuth } from '@/features/matricula/hooks/useMatriculaAuth'
import { mapMatriculaUserEscolaToFormValue } from '../utils/escola'

// Types
import type { 
  EnrollmentFormData, 
  EnrollmentFormState, 
  EnrollmentFormActions 
} from '../types/forms'
import type { PricingCalculation } from '../types/business'

// Constants
import { TOTAL_STEPS, FIRST_STEP, LAST_STEP } from '../constants/steps'

// Valores padrão do formulário
const defaultValues: EnrollmentFormData = {
  student: {
    name: '',
    cpf: '',
    rg: '',
    birthDate: '',
    gender: '' as any, // Will be validated as enum
    escola: '' as any // Will be validated as enum
  },
  guardians: {
    guardian1: {
      name: '',
      cpf: '',
      phone: '',
      email: '',
      relationship: ''
    },
    guardian2: null // Optional second guardian
  },
  address: {
    cep: '',
    street: '',
    number: '',
    complement: '',
    district: '',
    city: '',
    state: ''
  },
  academic: {
    seriesId: '',
    trackId: '',
    shift: '' as any // Will be validated as enum
  },
  selectedDiscounts: [],
  currentStep: FIRST_STEP,
  isSubmitting: false,
  errors: {}
}

/**
 * Hook principal para gerenciar o formulário de matrícula
 * 
 * Este hook centraliza toda a lógica de:
 * - Estado do formulário (React Hook Form)
 * - Navegação entre steps
 * - Validações
 * - Cálculos de pricing
 * - Submissão
 */
export function useEnrollmentForm(): EnrollmentFormState & EnrollmentFormActions {
  // Form setup com React Hook Form
  const form = useForm<EnrollmentFormData>({
    resolver: zodResolver(enrollmentSchema),
    defaultValues,
    mode: 'onChange' // Validação em tempo real
  })

  // Sessão de matrícula (apenas operadores de matrícula possuem este contexto)
  const matriculaSession = useMatriculaAuth()

  // Estado local
  const [currentStep, setCurrentStep] = useState(FIRST_STEP)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Watch valores do formulário para cálculos reativos
  const watchedValues = form.watch()
  const selectedDiscounts = watchedValues.selectedDiscounts || []
  const academicData = watchedValues.academic
  
  // Watch student data specifically for validation and escola
  const studentData = watchedValues.student
  const escolaSelecionada = studentData?.escola

  // Auto-preenchimento seguro do campo escola conforme usuário de matrícula
  useEffect(() => {
    try {
      const currentEscola = form.getValues('student.escola')
      if (currentEscola) return // não sobrescrever escolha existente

      const dbEscola = matriculaSession?.data?.matriculaUser?.escola
      const mapped = mapMatriculaUserEscolaToFormValue(dbEscola)

      if (mapped) {
        form.setValue('student.escola', mapped as any, {
          shouldValidate: true,
          shouldDirty: false,
          shouldTouch: false,
        })
      }
    } catch (e) {
      // Fail-safe: nunca quebra o fluxo por erro de mapeamento
      console.warn('[useEnrollmentForm] Falha ao mapear escola do usuário:', e)
    }
  }, [matriculaSession?.data?.matriculaUser?.escola, form])

  // Hooks de dados
  const { data: discounts, isLoading: loadingDiscounts, error: discountsError } = useDiscounts()
  const seriesResult = useSeries(escolaSelecionada) // Passar escola para filtro
  const { data: tracks, isLoading: loadingTracks, error: tracksError } = useTracks()
  
  // Debug logging para séries com escola
  console.log('🎪 [useEnrollmentForm] Series hook result:', {
    isLoading: seriesResult.isLoading,
    error: seriesResult.error,
    dataLength: seriesResult.data?.length || 0,
    escolaSelecionada: escolaSelecionada,
    data: seriesResult.data?.slice(0, 2) // Primeiras 2 séries
  })
  
  const series = seriesResult.data
  const loadingSeries = seriesResult.isLoading
  const seriesError = seriesResult.error

  // Estado de loading geral
  const isLoadingData = loadingDiscounts || loadingSeries || loadingTracks

  // Erros de carregamento de dados
  const dataErrors = [discountsError, seriesError, tracksError].filter(Boolean)

  // Cálculo de pricing (memoizado para performance)
  const pricing: PricingCalculation | null = useMemo(() => {
    if (!academicData?.seriesId || !series || !discounts) {
      return null
    }

    // Encontrar série selecionada
    const selectedSeries = series.find(s => s.id === academicData.seriesId)
    if (!selectedSeries) {
      return null
    }

    // Processar descontos selecionados com percentuais personalizados
    const selectedDiscountObjects = selectedDiscounts.map(selection => {
      // Se selection é um objeto com id e percentual
      const discountId = typeof selection === 'object' ? selection.id : selection
      const customPercentual = typeof selection === 'object' ? selection.percentual : null
      
      // Buscar desconto base
      const discount = discounts.find(d => d.id === discountId)
      if (!discount) return null
      
      // Aplicar percentual customizado se existir
      return {
        ...discount,
        percentual: customPercentual !== null ? customPercentual : discount.percentual
      }
    }).filter(Boolean) // Remove nulls

    // Calcular pricing
    // Emergency fix: Suporta ambos os campos para compatibilidade
    const baseValue = (selectedSeries as any).valor_mensal_com_material || selectedSeries.value || 0
    
    return calculatePricing({
      baseValue,
      discounts: selectedDiscountObjects,
      trackId: academicData.trackId
    })
  }, [academicData, selectedDiscounts, discounts, series])

  // Informações de aprovação baseadas no pricing
  const approvalInfo = useMemo(() => {
    if (!pricing) return null
    
    return determineApprovalLevel(pricing.totalDiscountPercentage)
  }, [pricing])

  // ACTIONS - Navegação entre steps

  const nextStep = useCallback(() => {
    // Validar step atual antes de avançar
    const currentFormData = form.getValues()
    const stepValidation = validateStep(currentStep, currentFormData)
    
    if (!stepValidation.isValid) {
      setErrors(prev => ({
        ...prev,
        [currentStep]: stepValidation.errors.join(', ')
      }))
      toast.error('Por favor, corrija os erros antes de continuar')
      return
    }

    // Validar campos obrigatórios
    const requiredValidation = validateRequiredFields(currentStep, currentFormData)
    
    if (!requiredValidation.hasRequiredFields) {
      setErrors(prev => ({
        ...prev,
        [currentStep]: `Campos obrigatórios: ${requiredValidation.missingFields.join(', ')}`
      }))
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    // Regra extra: Step 0 (Dados do Aluno) não avança com erro no CPF (ex.: duplicidade)
    if (currentStep === FIRST_STEP) {
      const cpfError = form.getFieldState('student.cpf').error
      if (cpfError) {
        toast.error('CPF inválido ou já cadastrado. Corrija antes de continuar.')
        return
      }
    }

    // Limpar erros do step atual e avançar
    setErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[currentStep]
      return newErrors
    })

    if (currentStep < LAST_STEP) {
      setCurrentStep(prev => prev + 1)
      toast.success('Progresso salvo!')
    }
  }, [currentStep, form])

  const prevStep = useCallback(() => {
    if (currentStep > FIRST_STEP) {
      setCurrentStep(prev => prev - 1)
    }
  }, [currentStep])

  const goToStep = useCallback((step: number) => {
    if (step >= FIRST_STEP && step <= LAST_STEP) {
      // Validar se pode ir para o step solicitado
      // Proteção mínima: não permitir pular do Step 0 com erro de CPF
      if (step > currentStep && currentStep === FIRST_STEP) {
        const cpfError = form.getFieldState('student.cpf').error
        if (cpfError) {
          toast.error('CPF inválido ou já cadastrado. Corrija antes de avançar.')
          return
        }
      }
      setCurrentStep(step)
    }
  }, [])

  // ACTIONS - Submissão

  const submitForm = useCallback(async (data: EnrollmentFormData) => {
    try {
      setIsSubmitting(true)
      setErrors({})

      // Validação final completa
      if (!pricing?.isValid) {
        throw new Error('Configuração de descontos inválida')
      }

      // Verificar se requer aprovação
      if (approvalInfo?.level !== 'automatic') {
        toast.warning(`Esta matrícula requer ${approvalInfo.description}`)
      }

      // Submeter para API
      const result = await EnrollmentApiService.createEnrollment(data)
      
      if (result.error) {
        throw new Error(result.error)
      }

      // Sucesso
      toast.success('Matrícula criada com sucesso!')
      
      // Reset do formulário
      form.reset(defaultValues)
      setCurrentStep(FIRST_STEP)
      
      // Opcionalmente, redirecionar ou mostrar próximos passos
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      setErrors({ submit: errorMessage })
      toast.error('Erro ao criar matrícula: ' + errorMessage)
      
    } finally {
      setIsSubmitting(false)
    }
  }, [form, pricing, approvalInfo])

  const resetForm = useCallback(() => {
    form.reset(defaultValues)
    setCurrentStep(FIRST_STEP)
    setIsSubmitting(false)
    setErrors({})
    toast.success('Formulário resetado')
  }, [form])

  // HELPERS - Status e validações

  const canGoNext = useMemo(() => {
    if (currentStep >= LAST_STEP) return false
    if (isLoadingData) return false
    
    // Usar watchedValues ao invés de getValues() para ter valores atualizados
    const requiredValidation = validateRequiredFields(currentStep, watchedValues)

    // Regra extra: bloquear se houver erro manual no CPF (ex.: duplicidade)
    if (currentStep === 0) {
      const cpfError = form.getFieldState('student.cpf').error
      if (cpfError) {
        return false
      }
    }
    
    // VALIDAÇÃO ESPECIAL: Step 5 (Desconto) - não pode avançar se exceder cap
    if (currentStep === 4) { // Step de desconto
      // Se há pricing calculado e excedeu o cap, bloquear
      if (pricing && !pricing.isValid) {
        console.warn('🚫 Navegação bloqueada: Configuração de descontos inválida')
        return false
      }
      
      // Verificar se há erros de validação nos descontos
      const hasDiscountErrors = pricing?.validationErrors && pricing.validationErrors.length > 0
      if (hasDiscountErrors) {
        console.warn('🚫 Navegação bloqueada: Erros de validação nos descontos:', pricing.validationErrors)
        return false
      }
    }
    
    return requiredValidation.hasRequiredFields
  }, [currentStep, isLoadingData, watchedValues, pricing])

  const canGoPrev = currentStep > FIRST_STEP
  const isFirstStep = currentStep === FIRST_STEP
  const isLastStep = currentStep === LAST_STEP

  const canSubmit = useMemo(() => {
    if (!isLastStep || isSubmitting || isLoadingData) return false
    if (!pricing?.isValid) return false
    
    // Verificar se todos os steps foram preenchidos
    const formData = form.getValues()
    return !!(
      formData.student &&
      formData.guardians &&
      formData.address &&
      formData.academic
    )
  }, [isLastStep, isSubmitting, isLoadingData, pricing, form])

  // Progress calculation
  const progress = useMemo(() => {
    const totalSteps = TOTAL_STEPS
    const completedSteps = currentStep
    return Math.round((completedSteps / (totalSteps - 1)) * 100)
  }, [currentStep])

  // RETURN - Estado e ações consolidados
  return {
    // Estado do formulário
    form,
    currentStep,
    isSubmitting,
    errors,
    
    // Dados computados
    pricing,
    approvalInfo,
    isLoadingData,
    progress,
    
    // Dados externos
    discounts: discounts || [],
    series: series || [],
    tracks: tracks || [],
    
    // Status de navegação
    canGoNext,
    canGoPrev,
    isFirstStep,
    isLastStep,
    canSubmit,
    
    // Ações de navegação
    nextStep,
    prevStep,
    goToStep,
    
    // Ações do formulário
    submitForm: form.handleSubmit(submitForm),
    resetForm,
    
    // Informações de erro
    hasDataErrors: dataErrors.length > 0,
    dataErrorMessages: dataErrors.map(e => e?.message || 'Erro desconhecido'),
    
    // Helpers úteis
    getStepErrors: (step: number) => errors[step] || null,
    clearStepErrors: (step: number) => {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[step]
        return newErrors
      })
    },
    
    // Debug info (apenas em desenvolvimento)
    ...(process.env.NODE_ENV === 'development' && {
      _debug: {
        watchedValues,
        formState: form.formState,
        selectedDiscounts,
        academicData
      }
    })
  }
}

/**
 * Hook simplificado para componentes que só precisam de informações básicas
 */
export function useEnrollmentFormBasic() {
  const enrollment = useEnrollmentForm()
  
  return {
    currentStep: enrollment.currentStep,
    progress: enrollment.progress,
    canGoNext: enrollment.canGoNext,
    canGoPrev: enrollment.canGoPrev,
    nextStep: enrollment.nextStep,
    prevStep: enrollment.prevStep,
    isLoading: enrollment.isLoadingData
  }
}

/**
 * Hook para acessar apenas dados de pricing
 */
export function useEnrollmentPricing() {
  const enrollment = useEnrollmentForm()
  
  return {
    pricing: enrollment.pricing,
    approvalInfo: enrollment.approvalInfo,
    hasValidPricing: !!enrollment.pricing?.isValid
  }
}
