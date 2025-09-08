import React from 'react'
import { Percent } from 'lucide-react'
import { DataSummaryCard } from './DataSummaryCard'

interface DiscountsSummarySectionProps {
  selectedDiscounts: Array<{
    id: string
    percentual: number
  }>
  discountsData?: Array<{
    id: string
    codigo: string
    nome: string
    percentual_maximo: number
    categoria: string
    ativo: boolean
  }>
  capData?: {
    capMaximo: number
    capUtilizado: number
    capDisponivel: number
    excedeuCap: boolean
    trilho: string
  }
  approvalInfo?: {
    level: string
    description: string
    maxPercentage?: number
  }
  onEdit: () => void
  isEditable?: boolean
}

export function DiscountsSummarySection({ 
  selectedDiscounts = [],
  discountsData = [],
  capData,
  approvalInfo,
  onEdit, 
  isEditable = true 
}: DiscountsSummarySectionProps) {
  
  // Enriquecer descontos selecionados com dados completos
  const enrichedDiscounts = selectedDiscounts.map(selected => {
    const discountInfo = discountsData.find(d => d.id === selected.id)
    return {
      ...selected,
      discountInfo
    }
  })

  const totalPercentage = selectedDiscounts.reduce((sum, d) => sum + d.percentual, 0)
  const hasDiscounts = selectedDiscounts.length > 0
  const isComplete = hasDiscounts && (!capData?.excedeuCap || false)

  // Validações
  const validationErrors: string[] = []
  if (capData?.excedeuCap) {
    validationErrors.push(`CAP excedido: ${capData.capUtilizado.toFixed(1)}% > ${capData.capMaximo}%`)
  }
  if (hasDiscounts && totalPercentage === 0) {
    validationErrors.push('Descontos selecionados mas sem percentual aplicado')
  }

  // Formatar dados para o card principal
  const formatDiscountsData = () => {
    if (!hasDiscounts) {
      return {
        'Status': 'Nenhum desconto aplicado'
      }
    }

    const discountsList: Record<string, any> = {}
    
    // Adicionar cada desconto como um item
    enrichedDiscounts.forEach((item, index) => {
      const label = item.discountInfo?.codigo || `Desconto ${index + 1}`
      const value = `${item.percentual.toFixed(1)}%`
      discountsList[label] = value
    })

    // Adicionar total e aprovação
    discountsList['Total'] = `${totalPercentage.toFixed(1)}%`
    
    if (approvalInfo?.level && approvalInfo.level !== 'automatic') {
      discountsList['Aprovação'] = approvalInfo.level === 'coordinator' ? 'Coordenação' : 
                                   approvalInfo.level === 'director' ? 'Direção' : 
                                   'Especial'
    }

    return discountsList
  }

  return (
    <DataSummaryCard
      title="Descontos"
      icon={<Percent className="w-5 h-5" />}
      data={formatDiscountsData()}
      onEdit={isEditable ? onEdit : undefined}
      isEditable={isEditable}
      stepNumber={5}
      isComplete={isComplete}
      validationErrors={validationErrors}
      className="w-full"
    />
  )
}

export default DiscountsSummarySection