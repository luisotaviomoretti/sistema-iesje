import React from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { 
  Calculator,
  DollarSign,
  TrendingDown,
  CheckCircle,
  BookOpen,
  CreditCard,
  Package,
  Info,
  FileText,
  Download
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PricingCalculation } from '../../types/business'

interface FinancialBreakdownCardProps {
  pricing: PricingCalculation | null
  seriesData?: {
    valor_material?: number
    valor_mensal_sem_material?: number
    valor_mensal_com_material?: number
  } | null
  isLoading?: boolean
  className?: string
  showPdfButton?: boolean
  onGeneratePdf?: () => void
  isGeneratingPdf?: boolean
  readOnlyMode?: boolean
}

export function FinancialBreakdownCard({
  pricing,
  seriesData,
  isLoading = false,
  className,
  showPdfButton = false,
  onGeneratePdf,
  isGeneratingPdf = false,
  readOnlyMode = true
}: FinancialBreakdownCardProps) {
  
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
              Aguardando cálculo financeiro
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Complete os steps anteriores para ver o resumo de valores
            </p>
          </div>
        </div>
      </Card>
    )
  }

  // Usar valores reais da série ou estimativas baseadas no pricing
  const valorMaterial = seriesData?.valor_material || (pricing.baseValue * 0.15)
  const valorMensalSemMaterial = seriesData?.valor_mensal_sem_material || (pricing.baseValue - valorMaterial)
  const valorMensalComMaterial = seriesData?.valor_mensal_com_material || pricing.baseValue
  
  // Calcular valores finais
  const descontoSobreSemMaterial = (valorMensalSemMaterial * pricing.totalDiscountPercentage) / 100
  const mensalidadeFinalSemMaterial = valorMensalSemMaterial - descontoSobreSemMaterial
  const mensalidadeFinalComMaterial = mensalidadeFinalSemMaterial + valorMaterial

  // Economia anual
  const economiaAnual = descontoSobreSemMaterial * 12

  return (
    <Card className={cn(
      "border-2 overflow-hidden",
      pricing.totalDiscountPercentage > 0
        ? "border-green-200 bg-gradient-to-br from-green-50 to-blue-50"
        : "border-blue-200 bg-blue-50",
      className
    )}>
      <div className="p-6">
        
        {/* Header Premium */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-green-400 rounded-full blur opacity-50"></div>
              <div className="relative p-2 rounded-full bg-gradient-to-r from-blue-500 to-green-500">
                <Calculator className="w-6 h-6 text-white" />
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-lg">
                💰 Resumo Financeiro Final
              </h3>
              <p className="text-sm text-gray-600">
                Valores definitivos para a matrícula
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {pricing.totalDiscountPercentage > 0 && (
              <Badge className="bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border-green-300">
                <TrendingDown className="w-3 h-3 mr-1" />
                {formatPercentage(pricing.totalDiscountPercentage)} OFF
              </Badge>
            )}
            {readOnlyMode && (
              <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                <FileText className="w-3 h-3 mr-1" />
                Somente Leitura
              </Badge>
            )}
          </div>
        </div>

        {/* Valores Base */}
        <div className="space-y-3 mb-4">
          <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Info className="w-4 h-4" />
            Valores Base da Série
          </h4>
          
          {/* Valor com Material */}
          <div className="flex items-center justify-between p-4 bg-white rounded-lg border shadow-sm">
            <div className="flex items-center space-x-2">
              <Package className="w-5 h-5 text-blue-600" />
              <div>
                <span className="font-medium text-gray-900">Mensalidade com material</span>
                <p className="text-xs text-gray-600">Valor completo da série</p>
              </div>
            </div>
            <span className="font-bold text-lg text-gray-900">
              {formatCurrency(valorMensalComMaterial)}
            </span>
          </div>

          {/* Breakdown: Mensalidade + Material */}
          <div className="ml-4 space-y-2">
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded border border-blue-200">
              <div className="flex items-center space-x-2">
                <BookOpen className="w-4 h-4 text-blue-500" />
                <span className="text-sm text-blue-700">Material didático</span>
              </div>
              <span className="text-sm font-semibold text-blue-700">
                {formatCurrency(valorMaterial)}
              </span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-white rounded border">
              <div className="flex items-center space-x-2">
                <DollarSign className="w-4 h-4 text-gray-600" />
                <span className="text-sm text-gray-700">Mensalidade sem material</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">
                {formatCurrency(valorMensalSemMaterial)}
              </span>
            </div>
          </div>
        </div>

        {/* Desconto Aplicado */}
        {pricing.totalDiscountValue > 0 && (
          <>
            <Separator className="my-4" />
            
            <div className="space-y-3 mb-4">
              <h4 className="text-sm font-semibold text-gray-700">Descontos Aplicados</h4>
              
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                <div className="flex items-center space-x-2">
                  <TrendingDown className="w-5 h-5 text-green-600" />
                  <div>
                    <span className="font-semibold text-green-800">
                      Desconto total ({formatPercentage(pricing.totalDiscountPercentage)})
                    </span>
                    <p className="text-xs text-green-600">
                      Aplicado sobre a mensalidade sem material
                    </p>
                  </div>
                </div>
                <span className="font-bold text-xl text-green-700">
                  -{formatCurrency(descontoSobreSemMaterial)}
                </span>
              </div>

              {/* Lista de descontos individuais */}
              {pricing.discounts && pricing.discounts.length > 0 && (
                <div className="ml-4 space-y-2">
                  {pricing.discounts.map((discount, index) => {
                    const descontoIndividual = (valorMensalSemMaterial * discount.percentage) / 100
                    
                    return (
                      <div key={index} className="flex items-center justify-between p-2 bg-white rounded border border-green-100">
                        <span className="text-sm text-gray-700">
                          • {discount.name} ({formatPercentage(discount.percentage)})
                        </span>
                        <span className="font-medium text-green-600 text-sm">
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
        <div className="space-y-3 mb-4">
          <h4 className="text-sm font-semibold text-gray-700">💳 Valores Finais</h4>
          
          {/* Mensalidade sem material */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg border border-orange-200">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <BookOpen className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <span className="font-semibold text-orange-900">
                  Opção sem material
                </span>
                <p className="text-xs text-orange-700">
                  Mensalidade com desconto aplicado
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

          {/* Mensalidade com material - PRINCIPAL */}
          <div className="flex items-center justify-between p-6 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-xl border-2 border-blue-300 shadow-lg">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl">
                <CreditCard className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="font-bold text-blue-900 text-xl">
                  Mensalidade Final
                </span>
                <p className="text-sm text-blue-700 font-medium">
                  Inclui material didático completo
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  ⭐ Valor para pagamento mensal
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                {formatCurrency(mensalidadeFinalComMaterial)}
              </div>
              <div className="text-sm text-blue-700 font-medium">mensais</div>
            </div>
          </div>
        </div>

        {/* Economia Destacada */}
        {pricing.totalDiscountValue > 0 && (
          <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="text-green-800 flex-1">
                <p className="font-semibold text-sm mb-1">🎉 Economia Aplicada com Sucesso!</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="font-medium">Por mês:</span> {formatCurrency(descontoSobreSemMaterial)}
                  </div>
                  <div>
                    <span className="font-medium">Por ano:</span> {formatCurrency(economiaAnual)}
                  </div>
                </div>
                <p className="text-xs text-green-700 mt-1">
                  <strong>Percentual aplicado:</strong> {formatPercentage(pricing.totalDiscountPercentage)} de desconto
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Botão de PDF */}
        {showPdfButton && onGeneratePdf && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <Button
              onClick={onGeneratePdf}
              disabled={isGeneratingPdf}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium"
              size="lg"
            >
              {isGeneratingPdf ? (
                <>
                  <div className="w-4 h-4 mr-2 animate-spin border-2 border-white border-t-transparent rounded-full" />
                  Gerando Proposta...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  📄 Gerar Proposta em PDF
                </>
              )}
            </Button>
          </div>
        )}

        {/* Nota sobre aplicação do desconto */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-xs">
          <p className="text-blue-700">
            <Info className="w-3 h-3 inline mr-1" />
            <strong>Importante:</strong> Os descontos são aplicados exclusivamente sobre o valor da mensalidade 
            sem material ({formatCurrency(valorMensalSemMaterial)}). 
            O valor do material didático ({formatCurrency(valorMaterial)}) permanece fixo e não sofre desconto.
          </p>
        </div>

        {/* Footer com timestamp */}
        {readOnlyMode && (
          <div className="mt-4 pt-3 border-t border-gray-200">
            <div className="text-xs text-gray-500 text-center">
              Cálculo realizado em {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}

export default FinancialBreakdownCard