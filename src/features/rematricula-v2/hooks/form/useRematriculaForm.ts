/**
 * Hook de formulário específico para rematrícula
 * Gerencia apenas os campos editáveis, não todos os campos como useEnrollmentForm
 * Totalmente independente do sistema de nova matrícula
 */

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { rematriculaSchema, type RematriculaFormData } from '../../schemas/rematriculaSchema'
import type { PreviousYearStudent, DiscountSelection } from '../../types/rematricula'
import type { DatabaseSeries } from '../../../matricula-nova/types/api'

// Interface de retorno do hook
export interface UseRematriculaFormResult {
  // Form state (apenas campos editáveis)
  form: ReturnType<typeof useForm<RematriculaFormData>>
  
  // Dados read-only pré-preenchidos
  readOnlyData: PreviousYearStudent
  
  // Estados específicos da rematrícula
  isSubmitting: boolean
  isDirty: boolean
  migrationMode: 'inherit' | 'manual'
  selectedSeries: DatabaseSeries | null
  selectedDiscounts: DiscountSelection[]
  
  // Ações
  setMigrationMode: (mode: 'inherit' | 'manual') => void
  selectSeries: (series: DatabaseSeries | null) => void
  selectDiscounts: (discounts: DiscountSelection[]) => void
  submitRematricula: (onSubmit: (data: RematriculaFormData) => Promise<void>) => Promise<void>
  resetForm: () => void
  saveDraft: () => void
  
  // Validações
  canSubmit: boolean
  validationErrors: Array<{
    field: string
    message: string
  }>
  
  // Progresso do formulário
  completionPercentage: number
  incompleteFields: string[]
}

/**
 * Hook independente para gerenciar o formulário de rematrícula
 * Não depende de useEnrollmentForm ou qualquer hook do sistema de nova matrícula
 */
export function useRematriculaForm(
  previousData: PreviousYearStudent
): UseRematriculaFormResult {
  
  // Estados específicos da rematrícula
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [migrationMode, setMigrationMode] = useState<'inherit' | 'manual'>('inherit')
  const [selectedSeries, setSelectedSeries] = useState<DatabaseSeries | null>(null)
  const [selectedDiscounts, setSelectedDiscounts] = useState<DiscountSelection[]>([])
  const [draftSavedAt, setDraftSavedAt] = useState<Date | null>(null)
  
  // Inicializar o formulário com dados do ano anterior (campos editáveis)
  const form = useForm<RematriculaFormData>({
    resolver: zodResolver(rematriculaSchema),
    defaultValues: {
      // Responsáveis - pré-preenchido mas editável
      guardians: {
        guardian1: {
          name: previousData.guardians.guardian1.name,
          cpf: previousData.guardians.guardian1.cpf,
          phone: previousData.guardians.guardian1.phone,
          email: previousData.guardians.guardian1.email,
          relationship: previousData.guardians.guardian1.relationship,
          is_financial_responsible: previousData.guardians.guardian1.is_financial_responsible || true
        },
        guardian2: previousData.guardians.guardian2 ? {
          name: previousData.guardians.guardian2.name,
          cpf: previousData.guardians.guardian2.cpf,
          phone: previousData.guardians.guardian2.phone,
          email: previousData.guardians.guardian2.email,
          relationship: previousData.guardians.guardian2.relationship,
          is_financial_responsible: previousData.guardians.guardian2.is_financial_responsible || false
        } : undefined
      },
      
      // Endereço - pré-preenchido mas editável
      address: {
        cep: previousData.address.cep,
        street: previousData.address.street,
        number: previousData.address.number,
        complement: previousData.address.complement,
        district: previousData.address.district,
        city: previousData.address.city,
        state: previousData.address.state
      },
      
      // Acadêmico - nova seleção
      academic: {
        selectedSeriesId: '', // Usuário deve selecionar nova série
        selectedTrackId: previousData.academic.track_id, // Mantém trilho anterior como default
        shift: previousData.academic.shift // Mantém turno anterior como default
      },
      
      // Migração de descontos - default é herdar
      discountMigration: {
        strategy: 'inherit',
        selectedDiscounts: undefined
      }
    },
    mode: 'onChange' // Validação em tempo real
  })
  
  // Atualizar descontos no formulário quando a estratégia mudar
  useEffect(() => {
    if (migrationMode === 'inherit') {
      // Herdar descontos do ano anterior
      setSelectedDiscounts(previousData.financial.applied_discounts)
      form.setValue('discountMigration.selectedDiscounts', previousData.financial.applied_discounts)
    } else {
      // Limpar descontos para seleção manual
      form.setValue('discountMigration.selectedDiscounts', selectedDiscounts)
    }
  }, [migrationMode, previousData.financial.applied_discounts, selectedDiscounts, form])
  
  // Atualizar série no formulário quando selecionada
  useEffect(() => {
    if (selectedSeries) {
      form.setValue('academic.selectedSeriesId', selectedSeries.id)
    }
  }, [selectedSeries, form])
  
  // Calcular se o formulário pode ser submetido
  const canSubmit = useMemo(() => {
    const hasSelectedSeries = selectedSeries !== null && form.getValues('academic.selectedSeriesId') !== ''
    const hasSelectedTrack = form.getValues('academic.selectedTrackId') !== ''
    const isFormValid = form.formState.isValid
    const notSubmitting = !isSubmitting
    
    // Se estratégia é manual, deve ter pelo menos um desconto selecionado ou explicitamente nenhum
    const hasValidDiscountStrategy = migrationMode === 'inherit' || 
      (migrationMode === 'manual' && selectedDiscounts !== undefined)
    
    return hasSelectedSeries && hasSelectedTrack && isFormValid && notSubmitting && hasValidDiscountStrategy
  }, [selectedSeries, form, form.formState.isValid, isSubmitting, migrationMode, selectedDiscounts])
  
  // Extrair erros de validação em formato amigável
  const validationErrors = useMemo(() => {
    const errors: Array<{ field: string; message: string }> = []
    const formErrors = form.formState.errors
    
    // Processar erros recursivamente
    const processErrors = (obj: any, prefix = '') => {
      Object.keys(obj).forEach(key => {
        const error = obj[key]
        const fieldName = prefix ? `${prefix}.${key}` : key
        
        if (error?.message) {
          errors.push({
            field: fieldName,
            message: error.message
          })
        } else if (typeof error === 'object') {
          processErrors(error, fieldName)
        }
      })
    }
    
    processErrors(formErrors)
    return errors
  }, [form.formState.errors])
  
  // Calcular porcentagem de conclusão do formulário
  const completionPercentage = useMemo(() => {
    const totalFields = 14 // Ajuste: Bairro não é mais obrigatório
    const filledFields = [
      // Responsável 1
      form.getValues('guardians.guardian1.name'),
      form.getValues('guardians.guardian1.cpf'),
      form.getValues('guardians.guardian1.phone'),
      form.getValues('guardians.guardian1.email'),
      // Endereço
      form.getValues('address.cep'),
      form.getValues('address.street'),
      form.getValues('address.number'),
      form.getValues('address.city'),
      form.getValues('address.state'),
      // Acadêmico
      form.getValues('academic.selectedSeriesId'),
      form.getValues('academic.selectedTrackId'),
      form.getValues('academic.shift'),
      // Descontos
      form.getValues('discountMigration.strategy')
    ].filter(Boolean).length
    
    return Math.round((filledFields / totalFields) * 100)
  }, [form])
  
  // Identificar campos incompletos
  const incompleteFields = useMemo(() => {
    const fields: string[] = []
    
    if (!form.getValues('academic.selectedSeriesId')) {
      fields.push('Nova série')
    }
    if (!form.getValues('academic.selectedTrackId')) {
      fields.push('Trilho')
    }
    
    // Verificar campos de responsável
    const guardian1 = form.getValues('guardians.guardian1')
    if (!guardian1?.name) fields.push('Nome do responsável 1')
    if (!guardian1?.cpf) fields.push('CPF do responsável 1')
    if (!guardian1?.phone) fields.push('Telefone do responsável 1')
    if (!guardian1?.email) fields.push('E-mail do responsável 1')
    
    // Verificar campos de endereço
    const address = form.getValues('address')
    if (!address?.cep) fields.push('CEP')
    if (!address?.street) fields.push('Rua')
    if (!address?.number) fields.push('Número')
    // Bairro agora é opcional

    if (!address?.city) fields.push('Cidade')
    if (!address?.state) fields.push('Estado')
    
    return fields
  }, [form])
  
  // Função para submeter o formulário
  const submitRematricula = useCallback(async (
    onSubmit: (data: RematriculaFormData) => Promise<void>
  ) => {
    try {
      setIsSubmitting(true)
      
      // Executar validação final
      const isValid = await form.trigger()
      if (!isValid) {
        throw new Error('Formulário contém erros de validação')
      }
      
      // Obter dados do formulário
      const formData = form.getValues()
      
      // Adicionar descontos selecionados baseado na estratégia
      if (migrationMode === 'manual') {
        formData.discountMigration.selectedDiscounts = selectedDiscounts
      } else {
        formData.discountMigration.selectedDiscounts = previousData.financial.applied_discounts
      }
      
      // Chamar função de submissão fornecida
      await onSubmit(formData)
      
    } catch (error) {
      console.error('Erro ao submeter rematrícula:', error)
      throw error
    } finally {
      setIsSubmitting(false)
    }
  }, [form, migrationMode, selectedDiscounts, previousData.financial.applied_discounts])
  
  // Função para resetar o formulário
  const resetForm = useCallback(() => {
    form.reset()
    setSelectedSeries(null)
    setSelectedDiscounts([])
    setMigrationMode('inherit')
  }, [form])
  
  // Função para salvar rascunho
  const saveDraft = useCallback(() => {
    const formData = form.getValues()
    
    // Salvar no localStorage
    const draft = {
      formData,
      selectedSeries,
      selectedDiscounts,
      migrationMode,
      savedAt: new Date().toISOString()
    }
    
    localStorage.setItem(`rematricula_draft_${previousData.student.cpf}`, JSON.stringify(draft))
    setDraftSavedAt(new Date())
    
    console.log('Rascunho salvo com sucesso')
  }, [form, selectedSeries, selectedDiscounts, migrationMode, previousData.student.cpf])
  
  // Carregar rascunho ao inicializar (se existir)
  useEffect(() => {
    const draftKey = `rematricula_draft_${previousData.student.cpf}`
    const savedDraft = localStorage.getItem(draftKey)
    
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft)
        
        // Restaurar dados do formulário
        Object.keys(draft.formData).forEach(key => {
          form.setValue(key as any, draft.formData[key])
        })
        
        // Restaurar estados
        if (draft.selectedSeries) setSelectedSeries(draft.selectedSeries)
        if (draft.selectedDiscounts) setSelectedDiscounts(draft.selectedDiscounts)
        if (draft.migrationMode) setMigrationMode(draft.migrationMode)
        if (draft.savedAt) setDraftSavedAt(new Date(draft.savedAt))
        
        console.log('Rascunho carregado:', draft.savedAt)
      } catch (error) {
        console.error('Erro ao carregar rascunho:', error)
      }
    }
  }, [previousData.student.cpf]) // Executar apenas uma vez na montagem
  
  // Retornar interface completa do hook
  return {
    // Form state
    form,
    
    // Dados read-only
    readOnlyData: previousData,
    
    // Estados específicos
    isSubmitting,
    isDirty: form.formState.isDirty,
    migrationMode,
    selectedSeries,
    selectedDiscounts,
    
    // Ações
    setMigrationMode,
    selectSeries: setSelectedSeries,
    selectDiscounts: setSelectedDiscounts,
    submitRematricula,
    resetForm,
    saveDraft,
    
    // Validações
    canSubmit,
    validationErrors,
    
    // Progresso
    completionPercentage,
    incompleteFields
  }
}