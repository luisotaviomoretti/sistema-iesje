import React, { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Calculator,
  DollarSign,
  TrendingDown,
  Eye,
  EyeOff,
  FileText,
  CheckCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ValuePreview } from '../../types/discounts'

// ============================================================================
// INTERFACES E TIPOS
// ============================================================================

interface PricingPreviewProps {
  preview: ValuePreview
  isLoading?: boolean
  showBreakdown?: boolean
  className?: string
  variant?: 'default' | 'compact' | 'detailed'
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function PricingPreview({
  preview,
  isLoading = false,
  showBreakdown = false,
  className,
  variant = 'default'
}: PricingPreviewProps) {

  const [isExpanded, setIsExpanded] = useState(showBreakdown)
  
  // ========================================================================
  // CÁLCULOS E FORMATAÇÃO
  // ========================================================================

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  const getEconomia = () => {
    return preview.valorBase - preview.valorFinal
  }

  const getPercentualEconomia = () => {
    return ((getEconomia() / preview.valorBase) * 100)
  }

  // ========================================================================
  // RENDERIZAÇÃO BASEADA NA VARIANTE
  // ========================================================================

  if (variant === 'compact') {
    return (
      <Card className={cn("border", className)}>
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Calculator className="w-4 h-4 text-gray-600" />
              <span className="text-sm text-gray-600">Valor final:</span>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-green-700">
                {formatCurrency(preview.valorFinal)}
              </div>
              {preview.percentualTotal > 0 && (
                <div className="text-sm text-gray-600">
                  {formatPercentage(preview.percentualTotal)} de desconto
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    )
  }

  // ========================================================================
  // RENDERIZAÇÃO PRINCIPAL (DEFAULT E DETAILED)
  // ========================================================================

  return (
    <Card className={cn("border-2 border-blue-200 bg-blue-50", className)}>
      <div className="p-6">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-full bg-blue-100">
              <Calculator className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">
                Resumo de Valores
              </h3>
              <p className="text-sm text-gray-600">
                Calculado com {preview.descontosDetalhes.length} desconto(s)
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-blue-600"
          >
            {isExpanded ? (
              <>
                <EyeOff className="w-4 h-4 mr-2" />
                Ocultar detalhes
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 mr-2" />
                Ver detalhes
              </>
            )}
          </Button>
        </div>

        {/* Valores Principais */}
        <div className="space-y-4">
          
          {/* Valor Base */}
          <div className="flex items-center justify-between p-3 bg-white rounded border">
            <div className="flex items-center space-x-2">
              <DollarSign className="w-4 h-4 text-gray-600" />
              <span className="font-medium text-gray-900">Valor base da mensalidade</span>
            </div>
            <span className="font-semibold text-gray-900">
              {formatCurrency(preview.valorBase)}
            </span>
          </div>

          {/* Desconto Total */}
          {preview.valorTotalDesconto > 0 && (
            <div className="flex items-center justify-between p-3 bg-green-50 rounded border border-green-200">
              <div className="flex items-center space-x-2">
                <TrendingDown className="w-4 h-4 text-green-600" />
                <span className="font-medium text-green-800">
                  Desconto total ({formatPercentage(preview.percentualTotal)})
                </span>
              </div>
              <span className="font-semibold text-green-700">
                -{formatCurrency(preview.valorTotalDesconto)}
              </span>
            </div>
          )}

          <Separator />

          {/* Valor Final */}
          <div className="flex items-center justify-between p-4 bg-blue-100 rounded-lg border border-blue-300">
            <div>
              <span className="text-lg font-semibold text-blue-900">
                Valor final da mensalidade
              </span>
              {preview.valorTotalDesconto > 0 && (
                <div className="flex items-center space-x-2 mt-1">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-700 font-medium">
                    Economia de {formatCurrency(getEconomia())} ({formatPercentage(getPercentualEconomia())})
                  </span>
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-900">
                {formatCurrency(preview.valorFinal)}
              </div>
              <div className="text-sm text-blue-700">por mês</div>
            </div>
          </div>
        </div>

        {/* Breakdown Detalhado */}
        {isExpanded && preview.descontosDetalhes.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center space-x-2 mb-4">
              <FileText className="w-4 h-4 text-gray-600" />
              <h4 className="font-medium text-gray-900">Detalhamento dos Descontos</h4>
            </div>
            
            <div className="space-y-2">
              {preview.descontosDetalhes.map((desconto, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-3 bg-white rounded border"
                >
                  <div>
                    <div className="font-medium text-gray-900">
                      {desconto.codigo}
                    </div>
                    <div className="text-sm text-gray-600">
                      {desconto.descricao}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-green-700">
                      -{formatCurrency(desconto.valor)}
                    </div>
                    <div className="text-sm text-gray-600">
                      {formatPercentage(desconto.percentual)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Breakdown Visual */}
            {variant === 'detailed' && preview.breakdown && (
              <div className="mt-4 pt-4 border-t">
                <h5 className="font-medium text-gray-900 mb-3">Composição do Valor</h5>
                <div className="space-y-2">
                  {preview.breakdown.map((item, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span className={cn(
                        "font-medium",
                        item.type === 'base' ? "text-gray-700" :
                        item.type === 'discount' ? "text-green-700" :
                        item.type === 'final' ? "text-blue-700 font-bold" : "text-gray-700"
                      )}>
                        {item.label}
                      </span>
                      <span className={cn(
                        "font-semibold",
                        item.type === 'base' ? "text-gray-900" :
                        item.type === 'discount' ? "text-green-700" :
                        item.type === 'final' ? "text-blue-900 text-lg" : "text-gray-900"
                      )}>
                        {item.type === 'discount' ? '-' : ''}{formatCurrency(item.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
            <div className="flex items-center space-x-2 text-blue-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-sm font-medium">Calculando valores...</span>
            </div>
          </div>
        )}

        {/* Empty State */}
        {preview.descontosDetalhes.length === 0 && !isLoading && (
          <div className="text-center py-6 text-gray-500">
            <Calculator className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm">
              Selecione descontos para ver o cálculo de valores
            </p>
          </div>
        )}

        {/* Info adicional */}
        {preview.valorTotalDesconto > 0 && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
            <div className="flex items-start space-x-2">
              <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5" />
              <div className="text-blue-800">
                <p className="font-medium">Valores aplicados com sucesso!</p>
                <p className="text-blue-700 mt-1">
                  Os descontos selecionados resultam em uma economia mensal de{' '}
                  <strong>{formatCurrency(getEconomia())}</strong>, 
                  o que representa <strong>{formatPercentage(getPercentualEconomia())}</strong> do valor original.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}

export default PricingPreview