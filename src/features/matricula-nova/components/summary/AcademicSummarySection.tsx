import React from 'react'
import { GraduationCap } from 'lucide-react'
import { DataSummaryCard } from './DataSummaryCard'

interface AcademicSummarySectionProps {
  academicData: {
    seriesId?: string
    trackId?: string  
    shift?: string
  }
  seriesData?: Array<{
    id: string
    nome: string
    valor_material?: number
    valor_mensal_sem_material?: number
    valor_mensal_com_material?: number
  }>
  tracksData?: Array<{
    id: string
    nome: string
    cap_maximo?: number
    tipo?: string
  }>
  onEdit: () => void
  isEditable?: boolean
}

export function AcademicSummarySection({ 
  academicData, 
  seriesData = [],
  tracksData = [],
  onEdit, 
  isEditable = true 
}: AcademicSummarySectionProps) {
  
  // Buscar informações completas baseadas nos IDs
  const selectedSeries = seriesData.find(s => s.id === academicData?.seriesId)
  
  // Validar completude dos dados obrigatórios
  const requiredFields = ['seriesId', 'shift']
  const missingFields = requiredFields.filter(field => {
    if (field === 'seriesId') return !academicData?.seriesId
    if (field === 'shift') return !academicData?.shift
    return false
  })
  
  const validationErrors = missingFields.map(field => {
    const fieldNames: Record<string, string> = {
      'seriesId': 'Série deve ser selecionada',
      'shift': 'Turno deve ser selecionado'
    }
    return fieldNames[field] || `${field} é obrigatório`
  })

  const isComplete = validationErrors.length === 0

  // Formatadores
  const formatShift = (shift: string) => {
    const shiftMap: Record<string, string> = {
      'morning': 'Matutino',
      'afternoon': 'Vespertino', 
      'night': 'Noturno'
    }
    return shiftMap[shift] || shift || ''
  }

  const formatCurrency = (value: number | undefined) => {
    if (!value) return '-'
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  // Formatar dados para exibição
  const formatAcademicData = () => {
    if (!academicData) return {}
    
    const data: Record<string, any> = {
      'Série': selectedSeries?.nome || 'Não selecionada',
      'Turno': formatShift(academicData.shift || '')
    }

    // Adicionar valores da série se disponíveis
    if (selectedSeries) {
      if (selectedSeries.valor_mensal_com_material) {
        data['Mensalidade'] = formatCurrency(selectedSeries.valor_mensal_com_material)
      }
      if (selectedSeries.valor_material) {
        data['Material'] = formatCurrency(selectedSeries.valor_material)
      }
    }
    
    return data
  }

  return (
    <DataSummaryCard
      title="Informações Acadêmicas"
      icon={<GraduationCap className="w-5 h-5" />}
      data={formatAcademicData()}
      onEdit={isEditable ? onEdit : undefined}
      isEditable={isEditable}
      stepNumber={4}
      isComplete={isComplete}
      validationErrors={validationErrors}
      className="w-full"
    />
  )
}

export default AcademicSummarySection