import React from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Calculator,
  DollarSign,
  TrendingDown,
  CheckCircle,
  BookOpen,
  CreditCard
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PricingCalculation } from '../../types/business'

interface SimpleValuesSummaryProps {
  pricing: PricingCalculation | null
  isLoading?: boolean
  className?: string
}

export function SimpleValuesSummary({
  pricing,
  isLoading = false,
  className
}: SimpleValuesSummaryProps) {
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  if (isLoading) {
    return (
      <Card className={cn("border-2 border-blue-200 bg-blue-50", className)}>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                <div>
                  <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-24"></div>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    )
  }

  if (!pricing) {
    return (
      <Card className={cn("border-2 border-gray-200 bg-gray-50", className)}>
        <div className="p-6">
          <div className="text-center text-gray-500">
            <Calculator className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm">
              Selecione descontos para ver o resumo de valores
            </p>
          </div>
        </div>
      </Card>
    )
  }

  // Calcular valores sem material (estimativa baseada em 20% do valor total)
  const valorMaterial = pricing.baseValue * 0.20 // Estimativa de 20% para material
  const valorSemMaterial = pricing.baseValue - valorMaterial
  const mensalidadeFinalSemMaterial = pricing.finalValue - valorMaterial

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
                Mensalidades finais com desconto aplicado
              </p>
            </div>
          </div>
          
          {pricing.totalDiscountPercentage > 0 && (
            <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
              <TrendingDown className="w-3 h-3 mr-1" />
              {formatPercentage(pricing.totalDiscountPercentage)} OFF
            </Badge>
          )}
        </div>

        {/* Valores Principais */}
        <div className="space-y-4">
          
          {/* Valor Base */}
          <div className="flex items-center justify-between p-3 bg-white rounded border">
            <div className="flex items-center space-x-2">
              <DollarSign className="w-4 h-4 text-gray-600" />
              <span className="font-medium text-gray-900">Valor base (com material)</span>
            </div>
            <span className="font-semibold text-gray-900">
              {formatCurrency(pricing.baseValue)}
            </span>
          </div>

          {/* Desconto Total */}
          {pricing.totalDiscountValue > 0 && (
            <div className="flex items-center justify-between p-3 bg-green-50 rounded border border-green-200">
              <div className="flex items-center space-x-2">
                <TrendingDown className="w-4 h-4 text-green-600" />
                <span className="font-medium text-green-800">
                  Desconto total ({formatPercentage(pricing.totalDiscountPercentage)})
                </span>
              </div>
              <span className="font-semibold text-green-700">
                -{formatCurrency(pricing.totalDiscountValue)}
              </span>
            </div>
          )}

          <Separator />

          {/* Valores Finais */}
          <div className="space-y-3">
            
            {/* Mensalidade sem material */}
            <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg border border-orange-200">
              <div className="flex items-center space-x-3">
                <BookOpen className="w-5 h-5 text-orange-600" />
                <div>
                  <span className="font-semibold text-orange-900">
                    Mensalidade final (sem material)
                  </span>
                  <p className="text-xs text-orange-700">
                    Não inclui material didático
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-orange-900">
                  {formatCurrency(mensalidadeFinalSemMaterial)}
                </div>
                <div className="text-sm text-orange-700">por mês</div>
              </div>
            </div>

            {/* Mensalidade com material */}
            <div className="flex items-center justify-between p-4 bg-blue-100 rounded-lg border border-blue-300">
              <div className="flex items-center space-x-3">
                <CreditCard className="w-5 h-5 text-blue-600" />
                <div>
                  <span className="font-semibold text-blue-900">
                    Mensalidade final (com material)
                  </span>
                  <p className="text-xs text-blue-700">
                    Inclui material didático
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-900">
                  {formatCurrency(pricing.finalValue)}
                </div>
                <div className="text-sm text-blue-700">por mês</div>
              </div>
            </div>
          </div>

          {/* Informação de economia */}
          {pricing.totalDiscountValue > 0 && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded text-sm">
              <div className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                <div className="text-green-800">
                  <p className="font-medium">Desconto aplicado com sucesso!</p>
                  <p className="text-green-700 mt-1">
                    Economia mensal de <strong>{formatCurrency(pricing.totalDiscountValue)}</strong>
                    {' '}({formatPercentage(pricing.totalDiscountPercentage)}) aplicada nos valores.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Detalhamento de descontos aplicados */}
          {pricing.discounts && pricing.discounts.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Descontos aplicados:
              </h4>
              <div className="space-y-1">
                {pricing.discounts.map((discount: any, index: number) => (
                  <div key={index} className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">
                      {discount.name} ({formatPercentage(discount.percentage)})
                    </span>
                    <span className="font-medium text-green-600">
                      -{formatCurrency(discount.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

export default SimpleValuesSummary