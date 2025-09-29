import React, { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Controller } from 'react-hook-form'
import { GraduationCap, Clock, School } from 'lucide-react'

// Components
import { FormField } from '../ui/FormField'
import { Select } from '../ui/Select'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card'
import { ValidationFeedback } from '../ui/ValidationFeedback'
import { StepNavigation } from '../ui/StepNavigation'
import { TOTAL_STEPS } from '../../constants/steps'
import { PricingCard } from '../ui/PricingCard'
import { getSeriesAnnualValuesConfig } from '@/lib/config/config.service'

// Types
import type { StepProps } from '../../types/forms'

/**
 * Step 4: Dados Acadêmicos
 * 
 * Campos:
 * - Série (obrigatório) - com preço
 * - Trilho de desconto (obrigatório)
 * - Turno (obrigatório)
 */
export default function AcademicFormStep(props: StepProps) {
  console.log('🎯 [AcademicFormStep] Component rendered')
  
  const { 
    form, 
    series = [], 
    tracks = [], 
    nextStep, 
    prevStep, 
    canGoNext, 
    canGoPrev, 
    currentStep,
    isLoadingData
  } = props as any

  // Watch escola selecionada do Step 1
  const studentData = form.watch('student')
  const escolaSelecionada = studentData?.escola

  console.log('📋 [AcademicFormStep] Props recebidas:', {
    seriesLength: series.length,
    tracksLength: tracks.length,
    isLoadingData,
    escolaSelecionada: escolaSelecionada,
    series: series.slice(0, 2), // Primeiras 2 para não poluir o log
    tracks: tracks.slice(0, 2)
  })

  // Opções de turno
  const shiftOptions = [
    { value: 'morning', label: 'Manhã (07:00 - 12:00)' },
    { value: 'afternoon', label: 'Tarde (13:00 - 18:00)' },
    { value: 'night', label: 'Noite (19:00 - 22:30)' }
  ]

  // Feature flag — Séries: Valores Anuais
  const { data: annualCfg } = useQuery({
    queryKey: ['series-annual-values-config'],
    queryFn: async () => getSeriesAnnualValuesConfig(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })
  const annualEnabled = Boolean(annualCfg?.enabled)

  // Helpers para calcular valores anuais a partir dos mensais quando necessário
  const round2 = (n: number) => Math.round((Number(n) + Number.EPSILON) * 100) / 100
  const toNum = (v: unknown): number | null => {
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }

  // Opções de série formatadas com preço (mensal ou anual)
  const seriesOptions = useMemo(() => {
    console.log('🏷️ [AcademicFormStep] Gerando seriesOptions para:', series.length, 'séries')
    
    const options = series.map(s => {
      const sd: any = s as any
      const mensalCom = toNum(sd.valor_mensal_com_material) ?? toNum(sd.value) ?? 0
      const mensalSem = toNum(sd.valor_mensal_sem_material) ?? Math.max(0, mensalCom - (toNum(sd.valor_material) ?? 0))
      const matMensal = toNum(sd.valor_material) ?? Math.max(0, mensalCom - mensalSem)

      // Preferir campos anuais do banco se existirem; fallback = x12
      const anualCom = toNum(sd.valor_anual_com_material)
      const anualSem = toNum(sd.valor_anual_sem_material)
      const anualMat = toNum(sd.valor_anual_material)

      const valorLabel = annualEnabled
        ? (anualCom ?? round2(mensalCom * 12))
        : mensalCom

      console.log('💰 [AcademicFormStep] Série processada:', {
        id: s.id,
        nome: s.nome,
        mensal_com: mensalCom,
        mensal_sem: mensalSem,
        mensal_mat: matMensal,
        anual_com_db: anualCom,
        anual_sem_db: anualSem,
        anual_mat_db: anualMat,
        valor_final_dropdown: valorLabel,
        annualEnabled
      })
      
      return {
        value: s.id,
        label: `${s.nome} - R$ ${valorLabel.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ${annualEnabled ? '(anual c/ material)' : '(c/ material)'}`
      }
    })
    
    console.log('✅ [AcademicFormStep] Options geradas:', options)
    return options
  }, [series, annualEnabled])

  // Removido: seleção de trilho neste passo (feito no próximo passo)

  // Série selecionada para mostrar detalhes
  const selectedSeriesId = form.watch('academic.seriesId')
  const selectedSeries = series.find(s => s.id === selectedSeriesId)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-4">
          <GraduationCap className="w-6 h-6 text-purple-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Dados Acadêmicos
        </h2>
        <p className="text-gray-600">
          Selecione a série, trilho de desconto e turno do aluno
        </p>
        {escolaSelecionada && (
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-purple-100 text-purple-700 text-sm rounded-full">
            <School className="w-4 h-4" />
            <span>
              {escolaSelecionada === 'pelicano' ? 'Colégio Pelicano' : 'Instituto Sete de Setembro'}
            </span>
          </div>
        )}
      </div>

      {/* Aviso se escola não selecionada */}
      {!escolaSelecionada && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
          <div className="flex items-center justify-center gap-2 text-amber-700 mb-2">
            <School className="w-5 h-5" />
            <span className="font-medium">Escola não selecionada</span>
          </div>
          <p className="text-amber-600 text-sm">
            Volte ao passo "Dados do Aluno" para selecionar a escola antes de escolher a série
          </p>
        </div>
      )}

      {/* Form Fields */}
      <div className="space-y-6">
        {/* Série */}
        <Controller
          name="academic.seriesId"
          control={form.control}
          render={({ field, fieldState }) => (
            <FormField
              label="Série"
              error={fieldState.error?.message}
              required
              id="academic-series"
            >
              <Select
                {...field}
                id="academic-series"
                placeholder="Selecione a série"
                error={!!fieldState.error}
                icon={<GraduationCap className="w-4 h-4" />}
                options={seriesOptions}
                disabled={isLoadingData}
              />
              <ValidationFeedback
                isValid={!!field.value && !fieldState.error}
                isInvalid={!!fieldState.error}
                message={fieldState.error?.message}
                showSuccess={true}
              />
            </FormField>
          )}
        />

        {/* Trilho removido deste passo. Será selecionado no passo de Descontos. */}

        {/* Turno */}
        <Controller
          name="academic.shift"
          control={form.control}
          render={({ field, fieldState }) => (
            <FormField
              label="Turno"
              error={fieldState.error?.message}
              required
              id="academic-shift"
            >
              <Select
                {...field}
                id="academic-shift"
                placeholder="Selecione o turno"
                error={!!fieldState.error}
                icon={<Clock className="w-4 h-4" />}
                options={shiftOptions}
              />
              <ValidationFeedback
                isValid={!!field.value && !fieldState.error}
                isInvalid={!!fieldState.error}
                message={fieldState.error?.message}
                showSuccess={true}
              />
            </FormField>
          )}
        />
      </div>

      {/* Preview da Série Selecionada com PricingCard */}
      {selectedSeries && (() => {
        const sd: any = selectedSeries
        const mensalCom = toNum(sd.valor_mensal_com_material) ?? toNum(sd.value) ?? 0
        const mensalSem = toNum(sd.valor_mensal_sem_material) ?? Math.max(0, mensalCom - (toNum(sd.valor_material) ?? 0))
        const matMensal = toNum(sd.valor_material) ?? Math.max(0, mensalCom - mensalSem)

        const anualCom = toNum(sd.valor_anual_com_material) ?? round2(mensalCom * 12)
        const anualSem = toNum(sd.valor_anual_sem_material) ?? round2(mensalSem * 12)
        const anualMat = toNum(sd.valor_anual_material) ?? round2(matMensal * 12)

        return (
          <PricingCard
            valorComMaterial={annualEnabled ? anualCom : mensalCom}
            valorSemMaterial={annualEnabled ? anualSem : mensalSem}
            valorMaterial={annualEnabled ? anualMat : matMensal}
            escola={sd.escola}
            serie={selectedSeries.nome}
            className="mt-6"
            annualMode={annualEnabled}
          />
        )
      })()}

      {/* Loading state para dados */}
      {isLoadingData && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-blue-700">Carregando dados acadêmicos...</p>
        </div>
      )}

      {/* Navegação */}
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
            <summary>Debug Info - Dados Acadêmicos</summary>
            <pre className="mt-2 text-xs">
              {JSON.stringify({
                step: currentStep,
                canGoNext,
                canGoPrev,
                academicData: form.watch('academic'),
                selectedSeries,
                seriesCount: series.length,
                tracksCount: tracks.length,
                errors: form.formState.errors.academic
              }, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  )
}
