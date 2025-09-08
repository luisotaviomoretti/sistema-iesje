import React, { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Switch } from '@/components/ui/switch'
import { 
  Check, 
  AlertTriangle, 
  FileText, 
  Upload,
  Percent,
  Info
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DiscountForEnrollment } from '../../types/discounts'
import { CategoriasDesconto } from '../../types/discounts'

// ============================================================================
// INTERFACES E TIPOS
// ============================================================================

interface DiscountCardProps {
  desconto: DiscountForEnrollment
  isSelected: boolean
  percentualAtual: number
  maxPercentual?: number
  onToggle: () => void
  onPercentualChange: (valor: number) => void
  onDocumentUpload?: (file: File) => void
  error?: string
  disabled?: boolean
  showDetails?: boolean
  isIneligible?: boolean
  isInactive?: boolean // Novo prop para descontos inativos
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function DiscountCard({
  desconto,
  isSelected,
  percentualAtual,
  maxPercentual = 100,
  onToggle,
  onPercentualChange,
  onDocumentUpload,
  error,
  disabled = false,
  showDetails = true,
  isIneligible = false,
  isInactive = false
}: DiscountCardProps) {
  
  const [isExpanded, setIsExpanded] = useState(false)
  const [localPercentual, setLocalPercentual] = useState(percentualAtual.toString())

  // ========================================================================
  // FUNÇÕES AUXILIARES
  // ========================================================================

  const getCategoryColor = (categoria: string) => {
    switch (categoria) {
      case CategoriasDesconto.ESPECIAL: 
        return {
          card: 'border-purple-200 bg-purple-50',
          badge: 'bg-purple-100 text-purple-800 border-purple-200',
          icon: '⭐',
          name: 'Especial'
        }
      case CategoriasDesconto.REGULAR: 
        return {
          card: 'border-blue-200 bg-blue-50',
          badge: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: '📋',
          name: 'Regular'
        }
      case CategoriasDesconto.NEGOCIACAO: 
        return {
          card: 'border-green-200 bg-green-50',
          badge: 'bg-green-100 text-green-800 border-green-200',
          icon: '🤝',
          name: 'Negociação'
        }
      default: 
        return {
          card: 'border-gray-200 bg-gray-50',
          badge: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: '📄',
          name: 'Outro'
        }
    }
  }

  const getNivelAprovacaoColor = (nivel: string) => {
    switch (nivel) {
      case 'AUTOMATICA':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'COORDENACAO':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'DIRECAO':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const handlePercentualChange = (value: string) => {
    setLocalPercentual(value)
    const numValue = parseFloat(value)
    if (!isNaN(numValue) && numValue >= 0 && numValue <= maxPercentual) {
      onPercentualChange(numValue)
    }
  }

  const handlePercentualBlur = () => {
    const numValue = parseFloat(localPercentual)
    if (isNaN(numValue) || numValue < 0) {
      setLocalPercentual('0')
      onPercentualChange(0)
    } else if (numValue > maxPercentual) {
      setLocalPercentual(maxPercentual.toString())
      onPercentualChange(maxPercentual)
    }
  }

  // ========================================================================
  // RENDERIZAÇÃO
  // ========================================================================

  const categoryStyle = getCategoryColor(desconto.categoria)
  const isVariavel = desconto.eh_variavel
  const hasDocuments = desconto.documentosRequeridos && desconto.documentosRequeridos.length > 0
  const percentualDisplay = isVariavel ? percentualAtual : (desconto.percentual_fixo || 0)
  const showPercentualInput = isSelected && isVariavel

  return (
    <Card 
      className={cn(
        'relative transition-all duration-200 border-2',
        isSelected 
          ? `${categoryStyle.card} shadow-md ring-2 ring-offset-2 ring-${categoryStyle.badge.split('-')[1]}-300` 
          : 'border-gray-200 bg-white hover:border-gray-300',
        disabled && !isIneligible && !isInactive && 'opacity-50 cursor-not-allowed',
        isIneligible && 'opacity-60 bg-gray-50 border-gray-300 cursor-not-allowed',
        isInactive && 'opacity-75 bg-yellow-50 border-yellow-200',
        error && 'border-red-300 bg-red-50'
      )}
    >
      {/* Badge de Inelegibilidade */}
      {isIneligible && (
        <div className="absolute top-2 right-2 z-10">
          <Badge className="bg-red-100 text-red-700 border-red-300">
            Não disponível para seu CEP
          </Badge>
        </div>
      )}
      
      {/* Badge de Inativo */}
      {isInactive && !isIneligible && (
        <div className="absolute top-2 right-2 z-10">
          <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300">
            Temporariamente indisponível
          </Badge>
        </div>
      )}
      
      <div className="p-4">
        {/* Header com Toggle */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            <Switch
              checked={isSelected}
              onCheckedChange={onToggle}
              disabled={disabled || isIneligible || isInactive}
              className="data-[state=checked]:bg-primary"
            />
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-lg">{categoryStyle.icon}</span>
                <h3 className="font-semibold text-gray-900 text-sm">
                  {desconto.codigo}
                </h3>
                <Badge variant="outline" className={cn("text-xs", categoryStyle.badge)}>
                  {categoryStyle.name}
                </Badge>
              </div>
              <p className="text-gray-600 text-sm line-clamp-1">
                {desconto.descricao}
              </p>
            </div>
          </div>

          {/* Percentual Display */}
          <div className="text-right">
            {!showPercentualInput ? (
              <div className="flex items-center space-x-1">
                <Percent className="w-4 h-4 text-gray-500" />
                <span className="font-bold text-lg text-gray-900">
                  {percentualDisplay.toFixed(desconto.eh_variavel ? 1 : 0)}%
                </span>
              </div>
            ) : (
              <div className="flex items-center space-x-1">
                <Input
                  type="number"
                  min="0"
                  max={maxPercentual}
                  step="0.1"
                  value={localPercentual}
                  onChange={(e) => handlePercentualChange(e.target.value)}
                  onBlur={handlePercentualBlur}
                  className="w-20 h-8 text-center text-sm"
                />
                <span className="text-sm text-gray-500">%</span>
              </div>
            )}
            
            {/* Tipo do desconto */}
            <div className="mt-1">
              <Badge 
                variant="secondary" 
                className="text-xs"
              >
                {isVariavel ? 'Variável' : 'Fixo'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Nível de Aprovação */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Info className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-600">Aprovação:</span>
            <Badge 
              variant="outline" 
              className={cn("text-xs", getNivelAprovacaoColor(desconto.nivelAprovacao))}
            >
              {desconto.nivelAprovacao === 'AUTOMATICA' ? 'Automática' :
               desconto.nivelAprovacao === 'COORDENACAO' ? 'Coordenação' :
               desconto.nivelAprovacao === 'DIRECAO' ? 'Direção' : desconto.nivelAprovacao}
            </Badge>
          </div>

          {/* Documentos Requeridos */}
          {hasDocuments && (
            <div className="flex items-center space-x-1">
              <FileText className="w-4 h-4 text-amber-600" />
              <span className="text-xs text-amber-700">
                {desconto.documentosRequeridos.length} doc(s)
              </span>
            </div>
          )}
        </div>

        {/* Detalhes Expandidos */}
        {isSelected && showDetails && (
          <div className="border-t border-gray-200 pt-3 mt-3">
            
            {/* Documentos Necessários */}
            {hasDocuments && (
              <div className="mb-3">
                <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <FileText className="w-4 h-4 mr-2" />
                  Documentos Necessários
                </h4>
                <div className="space-y-1">
                  {desconto.documentosRequeridos.map((doc, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between text-xs bg-gray-50 p-2 rounded border"
                    >
                      <span className="text-gray-700">{doc}</span>
                      {onDocumentUpload && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            // TODO: Implementar upload de documento
                            console.log(`Upload document: ${doc}`)
                          }}
                        >
                          <Upload className="w-3 h-3 mr-1" />
                          Upload
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Informações Variáveis */}
            {isVariavel && isSelected && (
              <div className="bg-blue-50 border border-blue-200 p-3 rounded">
                <div className="flex items-start space-x-2">
                  <Info className="w-4 h-4 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm text-blue-800 font-medium">
                      Desconto Variável
                    </p>
                    <p className="text-xs text-blue-700">
                      O percentual pode ser ajustado até {maxPercentual}% conforme sua situação.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Toggle de Detalhes */}
            {!isExpanded && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(true)}
                className="w-full mt-2"
              >
                Ver mais detalhes
              </Button>
            )}

            {/* Detalhes Expandidos Completos */}
            {isExpanded && (
              <div className="space-y-2 mt-2">
                <div className="text-xs text-gray-600">
                  <strong>ID:</strong> {desconto.id}
                </div>
                <div className="text-xs text-gray-600">
                  <strong>Categoria:</strong> {categoryStyle.name}
                </div>
                <div className="text-xs text-gray-600">
                  <strong>Status:</strong> {desconto.ativo ? 'Ativo' : 'Inativo'}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(false)}
                  className="w-full"
                >
                  Ocultar detalhes
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Estado de Validação */}
        {desconto.validation && !desconto.validation.isValid && (
          <Alert className="mt-3">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              {desconto.validation.errors.join(', ')}
            </AlertDescription>
          </Alert>
        )}

        {/* Warnings */}
        {desconto.validation && desconto.validation.warnings.length > 0 && (
          <Alert className="mt-3">
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm text-amber-700">
              {desconto.validation.warnings.join(', ')}
            </AlertDescription>
          </Alert>
        )}

        {/* Error Message */}
        {error && (
          <Alert variant="destructive" className="mt-3">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Sucesso na Seleção */}
        {isSelected && !error && (
          <div className="mt-3 flex items-center space-x-2 text-green-700">
            <Check className="w-4 h-4" />
            <span className="text-sm">Desconto selecionado</span>
          </div>
        )}
      </div>

      {/* Indicador Visual de Status */}
      <div className={cn(
        "absolute top-2 right-2 w-3 h-3 rounded-full",
        isSelected 
          ? categoryStyle.badge.includes('purple') ? 'bg-purple-500' :
            categoryStyle.badge.includes('blue') ? 'bg-blue-500' :
            categoryStyle.badge.includes('green') ? 'bg-green-500' : 'bg-gray-500'
          : 'bg-gray-300'
      )} />
    </Card>
  )
}

export default DiscountCard