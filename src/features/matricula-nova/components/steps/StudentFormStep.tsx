import React, { useEffect, useRef } from 'react'
import { Controller } from 'react-hook-form'
import { User, Calendar, CreditCard, Users, School } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { prefetchDiscountTypes, prefetchSeries } from '@/features/enrollment/prefetch/prefetchers'
import type { EscolaType } from '@/features/admin/hooks/useSeries'

// Components
import { FormField } from '../ui/FormField'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { ValidationFeedback } from '../ui/ValidationFeedback'
import { StepNavigation } from '../ui/StepNavigation'
import { TOTAL_STEPS } from '../../constants/steps'

// Utils and validations
import { formatCPF, formatRG, formatName } from '../../utils/formatters'
import { validators } from '../../services/business/validations'
import { useCpfUniqueness } from '../../hooks/data/useCpfUniqueness'
import { toast } from 'sonner'

// Types
import type { StepProps } from '../../types/forms'
import { useMatriculaAuth } from '@/features/matricula/hooks/useMatriculaAuth'
import { mapMatriculaUserEscolaToFormValue, labelFromDbValue } from '../../utils/escola'

/**
 * Step 1 - Formulário de Dados do Aluno
 * 
 * Campos:
 * - Nome completo (obrigatório)
 * - CPF (obrigatório)
 * - RG (opcional)
 * - Data de nascimento (obrigatório)
 * - Sexo (obrigatório)
 */
export default function StudentFormStep(props: StepProps) {
  const { 
    form, 
    nextStep, 
    prevStep, 
    canGoNext, 
    canGoPrev, 
    currentStep 
  } = props

  // Sessão de matrícula do operador (se houver)
  const matriculaSession = useMatriculaAuth()
  const lockedDbEscola = matriculaSession?.data?.matriculaUser?.escola
  const lockedFormEscola = mapMatriculaUserEscolaToFormValue(lockedDbEscola)
  const isEscolaLocked = Boolean(lockedFormEscola)
  const lockedEscolaLabel = labelFromDbValue(lockedDbEscola)
  // Mapear escola bloqueada para o formato do banco ('Pelicano' | 'Sete de Setembro')
  const escolaPrefetch: EscolaType | undefined =
    lockedDbEscola === 'Pelicano' || lockedDbEscola === 'Sete de Setembro'
      ? (lockedDbEscola as EscolaType)
      : lockedFormEscola === 'pelicano'
        ? 'Pelicano'
        : lockedFormEscola === 'sete_setembro'
          ? 'Sete de Setembro'
          : undefined

  // Debug para verificar o form
  console.log('StudentFormStep - form:', form)
  console.log('StudentFormStep - form.control:', form?.control)
  const formValues = form?.getValues()
  console.log('StudentFormStep - form.getValues() completo:', JSON.stringify(formValues, null, 2))
  console.log('StudentFormStep - student data:', formValues?.student)

  // Verificação de CPF duplicado (debounced) — bloqueia avanço via erro manual
  const cpfValue = form.watch('student.cpf') as string | undefined
  const cpfCheck = useCpfUniqueness(cpfValue)
  const duplicateToastShownRef = useRef<string | null>(null)
  const queryClient = useQueryClient()
  const prefetchTriggeredRef = useRef(false)
  const prefetchDebounceRef = useRef<number | null>(null)

  useEffect(() => {
    try {
      // Quando CPF estiver vazio, limpar erros e toasts de duplicidade
      if (!cpfValue || (cpfValue.replace(/\D/g, '').length === 0)) {
        try { form.clearErrors('student.cpf') } catch {}
        duplicateToastShownRef.current = null
        return
      }
      const cpfValidation = cpfValue ? validators.cpf(cpfValue) : { valid: false }

      if (cpfValidation.valid && cpfCheck.exists) {
        form.setError('student.cpf', {
          type: 'validate',
          message: 'CPF já cadastrado na matrícula para o ano 2026.'
        })

        // Exibir toast informativo apenas uma vez por CPF verificado
        const normalized = cpfCheck.normalizedCpf
        if (duplicateToastShownRef.current !== normalized) {
          duplicateToastShownRef.current = normalized
          toast.warning('CPF já cadastrado', {
            description: 'CPF já cadastrado na matrícula para o ano 2026.'
          })
        }
      } else if (cpfValidation.valid && !cpfCheck.exists) {
        const currentError = form.getFieldState('student.cpf').error
        if (currentError?.type === 'validate' && currentError.message?.includes('CPF já cadastrado')) {
          form.clearErrors('student.cpf')
        }
        // Limpar marcador do toast ao mudar para CPF não duplicado
        duplicateToastShownRef.current = null
      }
    } catch (e) {
      // Não interromper a digitação por falhas na verificação
      console.warn('[StudentFormStep] Falha ao verificar CPF duplicado:', e)
    }
  }, [cpfValue, cpfCheck.exists])

  // Prefetch inteligente (debounced) quando CPF torna-se válido (11 dígitos) — executa uma vez por sessão/página
  useEffect(() => {
    const digits = (cpfValue || '').replace(/\D/g, '')
    if (digits.length === 11 && !prefetchTriggeredRef.current) {
      if (prefetchDebounceRef.current) {
        window.clearTimeout(prefetchDebounceRef.current)
      }
      prefetchDebounceRef.current = window.setTimeout(async () => {
        try {
          prefetchTriggeredRef.current = true
          await prefetchDiscountTypes(queryClient)
          await prefetchSeries(queryClient, escolaPrefetch)
        } catch {
          // silencioso: prefetch não deve quebrar fluxo
        }
      }, 400)
    }
    return () => {
      if (prefetchDebounceRef.current) {
        window.clearTimeout(prefetchDebounceRef.current)
        prefetchDebounceRef.current = null
      }
    }
  }, [cpfValue, queryClient])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <User className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900">
          Dados do Aluno
        </h2>
        <p className="text-gray-600 mt-2">
          Informações básicas do estudante
        </p>
      </div>

      {/* Form Fields */}
      <div className="space-y-6">
        {/* Nome Completo */}
        <Controller
          name="student.name"
          control={form.control}
          render={({ field, fieldState }) => {
            const validation = field.value ? validators.name(field.value) : null
            
            return (
              <FormField
                label="Nome Completo"
                error={fieldState.error?.message}
                required
                id="student-name"
              >
                <Input
                  {...field}
                  id="student-name"
                  placeholder="Digite o nome completo do aluno"
                  error={!!fieldState.error}
                  icon={<User className="w-4 h-4" />}
                  onChange={(e) => {
                    console.log('Nome onChange:', e.target.value) // Debug
                    field.onChange(e.target.value)
                    // Verificar se o valor foi salvo
                    setTimeout(() => {
                      const currentValues = form.getValues()
                      console.log('Após onChange - student.name:', currentValues.student?.name)
                    }, 100)
                  }}
                  onBlur={(e) => {
                    const formattedName = formatName(e.target.value)
                    console.log('Nome onBlur:', formattedName) // Debug
                    field.onChange(formattedName)
                    field.onBlur()
                  }}
                />
                <ValidationFeedback
                  isValid={validation?.valid && !fieldState.error}
                  isInvalid={!!fieldState.error || (validation && !validation.valid)}
                  message={fieldState.error?.message || validation?.message}
                  showSuccess={true}
                />
              </FormField>
            )
          }}
        />

        {/* CPF */}
        <Controller
          name="student.cpf"
          control={form.control}
          render={({ field, fieldState }) => {
            const validation = field.value ? validators.cpf(field.value) : null
            
            return (
              <FormField
                label="CPF"
                error={fieldState.error?.message}
                id="student-cpf"
              >
                <Input
                  {...field}
                  id="student-cpf"
                  placeholder="000.000.000-00"
                  error={!!fieldState.error}
                  icon={<CreditCard className="w-4 h-4" />}
                  onChange={(e) => {
                    const formatted = formatCPF(e.target.value)
                    console.log('CPF onChange:', formatted) // Debug
                    field.onChange(formatted)
                  }}
                  maxLength={14}
                />
                {cpfCheck.isChecking && (
                  <div className="mt-1 flex items-center text-xs text-gray-500">
                    <span className="mr-2 inline-flex">
                      {/* pequeno spinner visual */}
                      <svg className="animate-spin h-4 w-4 text-gray-500" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    </span>
                    Verificando CPF...
                  </div>
                )}
                <ValidationFeedback
                  isValid={validation?.valid && !fieldState.error}
                  isInvalid={!!fieldState.error || (validation && !validation.valid)}
                  message={fieldState.error?.message || validation?.message}
                  showSuccess={true}
                />
              </FormField>
            )
          }}
        />

        {/* Data de Nascimento */}
        <Controller
          name="student.birthDate"
          control={form.control}
          render={({ field, fieldState }) => {
            const validation = field.value ? validators.birthDate(field.value) : null
            
            return (
              <FormField
                label="Data de Nascimento"
                error={fieldState.error?.message}
                required
                id="student-birth"
              >
                <Input
                  {...field}
                  id="student-birth-date"
                  type="date"
                  error={!!fieldState.error}
                  icon={<Calendar className="w-4 h-4" />}
                />
                <ValidationFeedback
                  isValid={validation?.valid && !fieldState.error}
                  isInvalid={!!fieldState.error || (validation && !validation.valid)}
                  message={fieldState.error?.message || validation?.message}
                  showSuccess={true}
                />
              </FormField>
            )
          }}
        />

        {/* RG (opcional) */}
        <Controller
          name="student.rg"
          control={form.control}
          render={({ field, fieldState }) => {
            const validation = field.value ? validators.rg(field.value) : null
            
            return (
              <FormField
                label="RG"
                error={fieldState.error?.message}
                id="student-rg"
                description="Opcional"
              >
                <Input
                  {...field}
                  id="student-rg"
                  placeholder="00.000.000-0"
                  error={!!fieldState.error}
                  icon={<CreditCard className="w-4 h-4" />}
                  onChange={(e) => {
                    const formatted = formatRG(e.target.value)
                    field.onChange(formatted)
                  }}
                  maxLength={12}
                />
                <ValidationFeedback
                  isValid={validation?.valid && !fieldState.error}
                  isInvalid={!!fieldState.error || (validation && !validation.valid)}
                  message={fieldState.error?.message || validation?.message}
                  showSuccess={!!field.value && validation?.valid}
                />
              </FormField>
            )
          }}
        />

        {/* Sexo (obrigatório) */}
        <Controller
          name="student.gender"
          control={form.control}
          render={({ field, fieldState }) => {
            const genderOptions = [
              { value: 'M', label: 'Masculino' },
              { value: 'F', label: 'Feminino' },
              { value: 'other', label: 'Outro' }
            ]
            
            return (
              <FormField
                label="Sexo"
                error={fieldState.error?.message}
                required
                id="student-gender"
              >
                <Select
                  {...field}
                  id="student-gender"
                  placeholder="Selecione o sexo"
                  error={!!fieldState.error}
                  icon={<Users className="w-4 h-4" />}
                  options={genderOptions}
                />
                <ValidationFeedback
                  isValid={!fieldState.error && !!field.value}
                  isInvalid={!!fieldState.error}
                  message={fieldState.error?.message}
                  showSuccess={true}
                />
              </FormField>
            )
          }}
        />

        {/* Escola (obrigatório) */}
        <Controller
          name="student.escola"
          control={form.control}
          render={({ field, fieldState }) => {
            const escolaOptions = [
              { value: 'pelicano', label: 'Colégio Pelicano' },
              { value: 'sete_setembro', label: 'Instituto Sete de Setembro' }
            ]
            
            return (
              <FormField
                label="Escola"
                error={fieldState.error?.message}
                required
                id="student-escola"
                description={
                  isEscolaLocked
                    ? `Definido pelo seu perfil${lockedEscolaLabel ? `: ${lockedEscolaLabel}` : ''}`
                    : 'Selecione a unidade escolar do aluno'
                }
              >
                <Select
                  {...field}
                  id="student-escola"
                  placeholder="Selecione a escola"
                  error={!!fieldState.error}
                  icon={<School className="w-4 h-4" />}
                  options={escolaOptions}
                  disabled={isEscolaLocked}
                  title={isEscolaLocked ? 'Campo bloqueado pela sua escola de usuário' : undefined}
                />
                <ValidationFeedback
                  isValid={!fieldState.error && !!field.value}
                  isInvalid={!!fieldState.error}
                  message={fieldState.error?.message}
                  showSuccess={true}
                />
              </FormField>
            )
          }}
        />
      </div>

      {/* Navigation */}
      <StepNavigation
        canGoPrev={canGoPrev}
        canGoNext={canGoNext}
        canSubmit={false}
        isSubmitting={false}
        onPrev={prevStep}
        onNext={nextStep}
        onSubmit={() => {}}
        currentStep={currentStep}
        totalSteps={TOTAL_STEPS}
      />

      {/* Debug Info (development only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-8 p-4 bg-gray-100 rounded text-xs">
          <details>
            <summary>Debug Info - Dados do Aluno</summary>
            <pre className="mt-2 text-xs">
              {JSON.stringify({
                step: currentStep,
                canGoNext,
                canGoPrev,
                studentData: form.watch('student'),
                errors: form.formState.errors.student
              }, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  )
}
