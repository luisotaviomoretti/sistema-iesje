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
  CreditCard,
  Package,
  Info
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PricingCalculation } from '../../types/business'

interface EnhancedPricingSummaryProps {
  pricing: PricingCalculation | null
  seriesData?: {
    valor_material?: number
    valor_mensal_sem_material?: number
    valor_mensal_com_material?: number
  } | null
  isLoading?: boolean
  className?: string
}

export function EnhancedPricingSummary({
  pricing,
  seriesData,
  isLoading = false,
  className
}: EnhancedPricingSummaryProps) {
  
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
              {[1, 2, 3, 4].map(i => (
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
              Selecione uma série e descontos para ver o resumo de valores
            </p>
          </div>
        </div>
      </Card>
    )
  }

  // Usar valores reais da série ou estimativas
  const valorMaterial = seriesData?.valor_material || (pricing.baseValue * 0.15)
  const valorMensalSemMaterial = seriesData?.valor_mensal_sem_material || (pricing.baseValue - valorMaterial)
  const valorMensalComMaterial = seriesData?.valor_mensal_com_material || pricing.baseValue
  
  // Calcular valores finais
  const descontoSobreSemMaterial = (valorMensalSemMaterial * pricing.totalDiscountPercentage) / 100
  const mensalidadeFinalSemMaterial = valorMensalSemMaterial - descontoSobreSemMaterial
  const mensalidadeFinalComMaterial = mensalidadeFinalSemMaterial + valorMaterial

  // Debug logs para verificar cálculos
  if (process.env.NODE_ENV === 'development' && pricing.discounts.length > 0) {
    console.log('💰 EnhancedPricingSummary - Cálculos:')
    console.log('  📊 Valor sem material:', valorMensalSemMaterial)
    console.log('  📊 Percentual total:', pricing.totalDiscountPercentage, '%')
    console.log('  📊 Desconto total sobre sem material:', descontoSobreSemMaterial)
    console.log('  📊 Mensalidade final sem material:', mensalidadeFinalSemMaterial)
    console.log('  📊 Material:', valorMaterial)
    console.log('  📊 Mensalidade final com material:', mensalidadeFinalComMaterial)
  }

  return (
    <Card className={cn("border-2 border-blue-200 bg-blue-50 overflow-hidden", className)}>
      <div className="p-6">
        
        {/* Header Premium */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full blur opacity-50"></div>
              <div className="relative p-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500">
                <Calculator className="w-6 h-6 text-white" />
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">
                Resumo de Valores Detalhado
              </h3>
              <p className="text-sm text-gray-600">
                Breakdown completo da mensalidade
              </p>
            </div>
          </div>
          
          {pricing.totalDiscountPercentage > 0 && (
            <Badge className="bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border-green-300">
              <TrendingDown className="w-3 h-3 mr-1" />
              {formatPercentage(pricing.totalDiscountPercentage)} OFF
            </Badge>
          )}
        </div>

        {/* Valores Base */}
        <div className="space-y-3 mb-4">
          <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Info className="w-4 h-4" />
            Valores Base da Série
          </h4>
          
          {/* Valor com Material */}
          <div className="flex items-center justify-between p-3 bg-white rounded border">
            <div className="flex items-center space-x-2">
              <Package className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-900">Mensalidade com material</span>
            </div>
            <span className="font-semibold text-gray-900">
              {formatCurrency(valorMensalComMaterial)}
            </span>
          </div>

          {/* Valor do Material */}
          <div className="flex items-center justify-between p-2 bg-blue-50 rounded border border-blue-200">
            <div className="flex items-center space-x-2 ml-4">
              <BookOpen className="w-3 h-3 text-blue-500" />
              <span className="text-xs text-blue-700">Material didático incluso</span>
            </div>
            <span className="text-sm font-medium text-blue-700">
              {formatCurrency(valorMaterial)}
            </span>
          </div>

          {/* Valor sem Material */}
          <div className="flex items-center justify-between p-3 bg-white rounded border">
            <div className="flex items-center space-x-2">
              <DollarSign className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-900">Mensalidade sem material</span>
            </div>
            <span className="font-semibold text-gray-900">
              {formatCurrency(valorMensalSemMaterial)}
            </span>
          </div>
        </div>

        {/* Desconto Aplicado */}
        {pricing.totalDiscountValue > 0 && (
          <>
            <Separator className="my-3" />
            
            <div className="space-y-3 mb-4">
              <h4 className="text-sm font-semibold text-gray-700">Descontos Aplicados</h4>
              
              <div className="flex items-center justify-between p-3 bg-green-50 rounded border border-green-200">
                <div className="flex items-center space-x-2">
                  <TrendingDown className="w-4 h-4 text-green-600" />
                  <div>
                    <span className="font-medium text-green-800">
                      Desconto total ({formatPercentage(pricing.totalDiscountPercentage)})
                    </span>
                    <p className="text-xs text-green-600">
                      Aplicado sobre o valor sem material
                    </p>
                  </div>
                </div>
                <span className="font-semibold text-green-700">
                  -{formatCurrency(descontoSobreSemMaterial)}
                </span>
              </div>

              {/* Lista de descontos individuais */}
              {pricing.discounts && pricing.discounts.length > 0 && (
                <div className="ml-4 space-y-1">
                  {pricing.discounts.map((discount, index) => {
                    // CORREÇÃO: Calcular desconto sobre valor SEM material ao invés de usar discount.value
                    const descontoIndividual = (valorMensalSemMaterial * discount.percentage) / 100
                    
                    return (
                      <div key={index} className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">
                          • {discount.name} ({formatPercentage(discount.percentage)})
                        </span>
                        <span className="font-medium text-green-600">
                          -{formatCurrency(descontoIndividual)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}

        <Separator className="my-4" />

        {/* Valores Finais */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-700">Valores Finais</h4>
          
          {/* Mensalidade sem material */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg border border-orange-200">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <BookOpen className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <span className="font-semibold text-orange-900">
                  Mensalidade final (sem material)
                </span>
                <p className="text-xs text-orange-700">
                  Opção sem material didático
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-orange-900">
                {formatCurrency(mensalidadeFinalSemMaterial)}
              </div>
              <div className="text-xs text-orange-700">por mês</div>
            </div>
          </div>

          {/* Mensalidade com material */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-lg border-2 border-blue-300 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg">
                <CreditCard className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="font-semibold text-blue-900 text-lg">
                  Mensalidade final (com material)
                </span>
                <p className="text-xs text-blue-700">
                  Inclui material didático completo
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                {formatCurrency(mensalidadeFinalComMaterial)}
              </div>
              <div className="text-sm text-blue-700">por mês</div>
            </div>
          </div>
        </div>

        {/* Informação de economia */}
        {pricing.totalDiscountValue > 0 && (
          <div className="mt-4 p-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="text-green-800">
                <p className="font-medium text-sm">Economia aplicada com sucesso!</p>
                <p className="text-xs text-green-700 mt-1">
                  Você economiza <strong>{formatCurrency(descontoSobreSemMaterial)}</strong> por mês
                  ({formatPercentage(pricing.totalDiscountPercentage)} de desconto).
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Nota sobre o material */}
        <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
          <p className="text-blue-700">
            <Info className="w-3 h-3 inline mr-1" />
            <strong>Nota:</strong> Os descontos são aplicados sobre o valor da mensalidade sem material. 
            O valor do material didático ({formatCurrency(valorMaterial)}) é fixo.
          </p>
        </div>
      </div>
    </Card>
  )
}

export default EnhancedPricingSummary