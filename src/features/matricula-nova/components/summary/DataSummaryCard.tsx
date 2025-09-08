import React, { memo } from 'react'
import { Edit2, Check, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DataSummaryCardProps {
  title: string
  icon?: React.ReactNode
  data: Record<string, any>
  onEdit?: () => void
  isEditable?: boolean
  className?: string
  stepNumber?: number
  isComplete?: boolean
  validationErrors?: string[]
}

// Helper functions
const formatCPF = (cpf: string) => {
  const cleaned = cpf.replace(/\D/g, '')
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

const formatPhone = (phone: string) => {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  }
  return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
}

const formatDate = (date: string | Date) => {
  if (date instanceof Date) {
    return date.toLocaleDateString('pt-BR')
  }
  try {
    return new Date(date).toLocaleDateString('pt-BR')
  } catch {
    return date
  }
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

// Auto-format labels
const formatLabel = (key: string): string => {
  const labelMap: Record<string, string> = {
    'name': 'Nome',
    'cpf': 'CPF',
    'rg': 'RG',
    'birthDate': 'Nascimento',
    'gender': 'Gênero',
    'escola': 'Escola',
    'phone': 'Telefone',
    'email': 'Email',
    'relationship': 'Parentesco',
    'cep': 'CEP',
    'street': 'Logradouro',
    'number': 'Número',
    'complement': 'Complemento',
    'district': 'Bairro',
    'city': 'Cidade',
    'state': 'Estado',
    'series': 'Série',
    'track': 'Trilho',
    'shift': 'Turno'
  }
  
  return labelMap[key] || key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1').trim()
}

// Auto-detect and format values
const formatValue = (key: string, value: any): string => {
  if (!value || value === 'undefined' || value === 'null') return '-'
  
  const keyLower = key.toLowerCase()
  const strVal = String(value)
  
  // CPF
  if (keyLower.includes('cpf') && /^\d{11}$/.test(strVal.replace(/\D/g, ''))) {
    return formatCPF(strVal)
  }
  
  // Phone
  if ((keyLower.includes('phone') || keyLower.includes('telefone')) && 
      /^\d{10,11}$/.test(strVal.replace(/\D/g, ''))) {
    return formatPhone(strVal)
  }
  
  // Email
  if (strVal.includes('@')) {
    return strVal.toLowerCase()
  }
  
  // Date
  if (keyLower.includes('date') || keyLower.includes('data') || /\d{4}-\d{2}-\d{2}/.test(strVal)) {
    return formatDate(strVal)
  }
  
  // Currency
  if (keyLower.includes('valor') || keyLower.includes('preco') || keyLower.includes('mensalidade')) {
    const num = parseFloat(strVal.replace(/[^\d.-]/g, ''))
    if (!isNaN(num)) {
      return formatCurrency(num)
    }
  }
  
  // Percentage
  if (keyLower.includes('percentual') || keyLower.includes('desconto')) {
    const num = parseFloat(strVal)
    if (!isNaN(num)) {
      return `${num.toFixed(1)}%`
    }
  }
  
  return strVal
}

export const DataSummaryCard = memo(function DataSummaryCard({
  title,
  icon,
  data,
  onEdit,
  isEditable = true,
  className,
  stepNumber,
  isComplete = true,
  validationErrors = []
}: DataSummaryCardProps) {
  
  const hasErrors = validationErrors.length > 0
  const dataEntries = Object.entries(data).filter(([_, value]) => value !== undefined && value !== null && value !== '')
  
  return (
    <div className={cn(
      "bg-white border border-gray-200 rounded-lg",
      className
    )}>
      {/* Minimal Header */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {icon && (
              <div className="text-gray-400">
                {React.cloneElement(icon as React.ReactElement, { className: 'w-4 h-4' })}
              </div>
            )}
            <h3 className="text-sm font-medium text-gray-700">
              {title}
              {stepNumber && (
                <span className="ml-2 text-xs text-gray-400">
                  ({stepNumber})
                </span>
              )}
            </h3>
          </div>
          
          <div className="flex items-center space-x-3">
            {hasErrors && (
              <AlertCircle className="w-3 h-3 text-gray-400" />
            )}
            {isComplete && !hasErrors && (
              <Check className="w-3 h-3 text-gray-400" />
            )}
            {isEditable && onEdit && (
              <button
                onClick={onEdit}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                Editar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Minimal Content */}
      <div className="px-4 py-3">
        {/* Subtle validation notice */}
        {hasErrors && (
          <div className="text-xs text-gray-500 mb-3">
            ⚠ {validationErrors.join(' • ')}
          </div>
        )}
        
        {/* Compact data grid */}
        {dataEntries.length > 0 ? (
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            {dataEntries.map(([key, value]) => (
              <div key={key} className="flex items-baseline">
                <span className="text-gray-500">
                  {formatLabel(key)}:
                </span>
                <span className="ml-2 text-gray-700">
                  {formatValue(key, value)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-gray-400">
            Nenhum dado disponível
          </div>
        )}
      </div>
    </div>
  )
})

export default DataSummaryCard