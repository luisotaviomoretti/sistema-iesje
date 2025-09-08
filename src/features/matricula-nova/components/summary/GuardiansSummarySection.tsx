import React from 'react'
import { Users, User, Crown } from 'lucide-react'
import { DataSummaryCard } from './DataSummaryCard'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import type { StepProps } from '../../types/forms'

interface GuardiansSummarySectionProps {
  guardiansData: {
    guardian1?: any
    guardian2?: any
  }
  onEdit: () => void
  isEditable?: boolean
}

const GuardianCard: React.FC<{
  guardianData: any
  isPrimary: boolean
  isOptional?: boolean
  validationErrors?: string[]
}> = ({ guardianData, isPrimary, isOptional = false, validationErrors = [] }) => {
  
  const formatGuardianData = (data: any) => {
    if (!data) return {}
    
    return {
      name: data.name || '',
      cpf: data.cpf || '',
      phone: data.phone || '',
      email: data.email || '',
      relationship: formatRelationship(data.relationship)
    }
  }

  const formatRelationship = (relationship: string) => {
    const relationshipMap: Record<string, string> = {
      'pai': 'Pai',
      'mae': 'Mãe',
      'avo': 'Avô',
      'ava': 'Avó',
      'tio': 'Tio',
      'tia': 'Tia',
      'irmao': 'Irmão',
      'irma': 'Irmã',
      'tutor': 'Tutor Legal',
      'responsavel': 'Responsável'
    }
    return relationshipMap[relationship] || relationship || ''
  }

  const hasData = guardianData && Object.values(guardianData).some(value => value)
  const isEmpty = !hasData

  if (isEmpty && isOptional) {
    return (
      <Card className="border-gray-200 bg-gray-50">
        <div className="p-4 text-center">
          <User className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500 font-medium">
            Segundo Responsável
          </p>
          <p className="text-xs text-gray-400 mt-1">
            (Opcional - Não informado)
          </p>
        </div>
      </Card>
    )
  }

  const title = isPrimary ? "Responsável Principal" : "Segundo Responsável"
  const icon = isPrimary ? <Crown className="w-5 h-5" /> : <User className="w-5 h-5" />

  return (
    <div className="relative">
      {isPrimary && (
        <div className="absolute -top-2 -right-2 z-10">
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 text-xs">
            Principal
          </Badge>
        </div>
      )}
      <DataSummaryCard
        title={title}
        icon={icon}
        data={formatGuardianData(guardianData)}
        isEditable={false} // Editado através do card principal
        isComplete={!validationErrors.length && hasData}
        validationErrors={validationErrors}
        className="w-full"
      />
    </div>
  )
}

export function GuardiansSummarySection({ 
  guardiansData, 
  onEdit, 
  isEditable = true 
}: GuardiansSummarySectionProps) {
  
  // Validar completude do responsável principal (obrigatório)
  const guardian1 = guardiansData?.guardian1
  const guardian2 = guardiansData?.guardian2
  
  const requiredFieldsGuardian1 = ['name', 'cpf', 'phone', 'email', 'relationship']
  const missingFieldsGuardian1 = requiredFieldsGuardian1.filter(field => !guardian1?.[field])
  
  const validationErrorsGuardian1 = missingFieldsGuardian1.map(field => {
    const fieldNames: Record<string, string> = {
      'name': 'Nome é obrigatório',
      'cpf': 'CPF é obrigatório',
      'phone': 'Telefone é obrigatório',
      'email': 'Email é obrigatório',
      'relationship': 'Parentesco é obrigatório'
    }
    return fieldNames[field] || `${field} é obrigatório`
  })

  // Segundo responsável é opcional, mas se preenchido deve estar completo
  const validationErrorsGuardian2: string[] = []
  if (guardian2 && Object.values(guardian2).some(v => v)) {
    // Se começou a preencher, deve completar os campos obrigatórios
    const missingFieldsGuardian2 = requiredFieldsGuardian1.filter(field => !guardian2[field])
    validationErrorsGuardian2.push(...missingFieldsGuardian2.map(field => {
      const fieldNames: Record<string, string> = {
        'name': 'Nome é obrigatório',
        'cpf': 'CPF é obrigatório', 
        'phone': 'Telefone é obrigatório',
        'email': 'Email é obrigatório',
        'relationship': 'Parentesco é obrigatório'
      }
      return fieldNames[field] || `${field} é obrigatório`
    }))
  }

  const totalErrors = validationErrorsGuardian1.length + validationErrorsGuardian2.length
  const isComplete = totalErrors === 0

  const hasGuardian2Data = guardian2 && Object.values(guardian2).some(value => value)

  return (
    <Card className={`transition-all duration-200 ${
      totalErrors > 0 
        ? 'border-red-200 bg-red-50' 
        : isComplete 
          ? 'border-green-200 bg-green-50'
          : 'border-gray-200'
    }`}>
      <div className="p-6">
        
        {/* Header Principal */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${
              totalErrors > 0
                ? 'bg-red-100 text-red-600'
                : isComplete
                  ? 'bg-green-100 text-green-600'
                  : 'bg-blue-100 text-blue-600'
            }`}>
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                Dados dos Responsáveis
                <Badge variant="outline" className="text-xs">
                  Step 2
                </Badge>
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-500">
                  {hasGuardian2Data ? '2 responsáveis' : '1 responsável'} cadastrado(s)
                </span>
                {totalErrors > 0 && (
                  <span className="text-xs text-red-600">
                    • {totalErrors} erro(s)
                  </span>
                )}
              </div>
            </div>
          </div>
          
          {isEditable && (
            <button
              onClick={onEdit}
              className="px-3 py-1.5 text-sm text-blue-600 border border-blue-200 rounded-md hover:bg-blue-50 transition-colors"
            >
              ✏️ Editar
            </button>
          )}
        </div>

        {/* Cards dos Responsáveis */}
        <div className="space-y-4">
          {/* Responsável Principal */}
          <GuardianCard
            guardianData={guardian1}
            isPrimary={true}
            validationErrors={validationErrorsGuardian1}
          />
          
          {/* Segundo Responsável */}
          <GuardianCard
            guardianData={guardian2}
            isPrimary={false}
            isOptional={true}
            validationErrors={validationErrorsGuardian2}
          />
        </div>

        {/* Resumo de Validação */}
        {totalErrors > 0 && (
          <div className="mt-4 p-3 bg-red-100 border border-red-200 rounded-lg">
            <div className="text-sm text-red-800">
              <div className="font-medium mb-1">Atenção necessária:</div>
              <div className="text-xs space-y-1">
                {validationErrorsGuardian1.length > 0 && (
                  <div>
                    <strong>Responsável Principal:</strong>
                    <ul className="ml-4 mt-1">
                      {validationErrorsGuardian1.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {validationErrorsGuardian2.length > 0 && (
                  <div>
                    <strong>Segundo Responsável:</strong>
                    <ul className="ml-4 mt-1">
                      {validationErrorsGuardian2.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer Info */}
        <div className="mt-4 pt-3 border-t border-gray-200">
          <div className="text-xs text-gray-500 flex items-center justify-between">
            <span>
              Responsável principal é obrigatório
              {hasGuardian2Data && ' • Segundo responsável opcional'}
            </span>
            {isEditable && (
              <span className="text-blue-600">Clique em "Editar" para alterar</span>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}

export default GuardiansSummarySection