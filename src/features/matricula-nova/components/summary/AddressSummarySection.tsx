import React from 'react'
import { MapPin, Star } from 'lucide-react'
import { DataSummaryCard } from './DataSummaryCard'
import { Badge } from '@/components/ui/badge'
import type { StepProps } from '../../types/forms'

interface AddressSummarySectionProps {
  addressData: {
    cep?: string
    street?: string
    number?: string
    complement?: string
    district?: string
    city?: string
    state?: string
  }
  onEdit: () => void
  isEditable?: boolean
  hasSpecialCepDiscount?: boolean
}

export function AddressSummarySection({ 
  addressData, 
  onEdit, 
  isEditable = true,
  hasSpecialCepDiscount = false
}: AddressSummarySectionProps) {
  
  // Validar completude dos dados obrigatórios
  const requiredFields = ['cep', 'street', 'number', 'district', 'city', 'state']
  const missingFields = requiredFields.filter(field => !addressData?.[field])
  const validationErrors = missingFields.map(field => {
    const fieldNames: Record<string, string> = {
      'cep': 'CEP é obrigatório',
      'street': 'Logradouro é obrigatório',
      'number': 'Número é obrigatório', 
      'district': 'Bairro é obrigatório',
      'city': 'Cidade é obrigatória',
      'state': 'Estado é obrigatório'
    }
    return fieldNames[field] || `${field} é obrigatório`
  })

  const isComplete = validationErrors.length === 0

  // Formatar dados para exibição
  const formatAddressData = (data: any) => {
    if (!data) return {}
    
    return {
      cep: data.cep || '',
      street: data.street || '',
      number: data.number || '',
      complement: data.complement || 'Não informado',
      district: data.district || '',
      city: data.city || '',
      state: data.state || ''
    }
  }

  // Formatar endereço completo para exibição especial
  const formatCompleteAddress = () => {
    if (!addressData || !isComplete) return null
    
    const parts = [
      addressData.street,
      addressData.number,
      addressData.complement && `(${addressData.complement})`,
      addressData.district,
      addressData.city,
      addressData.state,
      addressData.cep
    ].filter(Boolean)
    
    return parts.join(', ')
  }

  const completeAddress = formatCompleteAddress()

  return (
    <div className="space-y-3">
      {/* Card Principal */}
      <DataSummaryCard
        title="Endereço Residencial"
        icon={<MapPin className="w-5 h-5" />}
        data={formatAddressData(addressData)}
        onEdit={isEditable ? onEdit : undefined}
        isEditable={isEditable}
        stepNumber={3}
        isComplete={isComplete}
        validationErrors={validationErrors}
        className="w-full"
      />

      {/* Informações Especiais do CEP */}
      {completeAddress && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="p-1.5 bg-blue-100 rounded-full">
              <MapPin className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-blue-900 mb-1">
                Endereço Completo
              </h4>
              <p className="text-sm text-blue-800 font-mono text-xs leading-relaxed">
                {completeAddress}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Badge de Desconto CEP Especial */}
      {hasSpecialCepDiscount && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="p-1.5 bg-yellow-100 rounded-full">
              <Star className="w-4 h-4 text-yellow-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <h4 className="text-sm font-medium text-yellow-900">
                  CEP Especial Identificado
                </h4>
                <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 text-xs">
                  Desconto Automático
                </Badge>
              </div>
              <p className="text-sm text-yellow-800">
                Este CEP é elegível para desconto especial automático baseado na localização.
                O desconto será aplicado automaticamente na seleção de descontos.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Informações Adicionais */}
      {isComplete && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <div className="text-xs text-gray-600 space-y-1">
            <div className="flex items-center justify-between">
              <span>✅ Endereço completo e validado</span>
              <span className="text-blue-600">
                {hasSpecialCepDiscount ? '⭐ CEP especial' : '📍 CEP padrão'}
              </span>
            </div>
            {isEditable && (
              <div className="text-blue-600 text-center pt-1 border-t border-gray-300">
                Clique em "Editar" no card acima para alterar o endereço
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default AddressSummarySection