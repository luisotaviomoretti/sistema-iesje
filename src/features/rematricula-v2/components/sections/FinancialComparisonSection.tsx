/**
 * Seção de comparação financeira
 * Exibe comparativo entre valores do ano anterior e ano atual
 */

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  DollarSign,
  Calculator,
  Percent,
  Info,
  CheckCircle
} from 'lucide-react'
import type { RematriculaPricing, PricingComparison } from '../../types/rematricula-pricing'
import type { PreviousYearFinance } from '../../types/rematricula-pricing'

interface FinancialComparisonSectionProps {
  currentPricing: RematriculaPricing | null
  previousYearFinance: PreviousYearFinance | null
  comparison: PricingComparison | null
  className?: string
}

export function FinancialComparisonSection({ 
  currentPricing,
  previousYearFinance,
  comparison,
  className = '' 
}: FinancialComparisonSectionProps) {
  
  // Formatador de moeda
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }
  
  // Formatador de porcentagem
  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
  }
  
  // Determinar ícone e cor baseado na mudança
  const getTrendInfo = () => {
    if (!comparison) return { icon: Minus, color: 'text-gray-500', label: 'Sem dados' }
    
    if (comparison.difference > 0) {
      return { 
        icon: TrendingUp, 
        color: 'text-red-500', 
        label: 'Aumento',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200'
      }
    } else if (comparison.difference < 0) {
      return { 
        icon: TrendingDown, 
        color: 'text-green-500', 
        label: 'Redução',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200'
      }
    } else {
      return { 
        icon: Minus, 
        color: 'text-blue-500', 
        label: 'Sem alteração',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200'
      }
    }
  }
  
  const trend = getTrendInfo()
  const TrendIcon = trend.icon
  
  // Calcular porcentagem de desconto para barra de progresso
  const getDiscountProgress = (percentage: number) => {
    return Math.min(percentage, 100)
  }
  
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Card Principal de Comparação */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Comparação Financeira
            </CardTitle>
            {comparison && (
              <Badge 
                variant="outline" 
                className={`${trend.bgColor} ${trend.borderColor} ${trend.color}`}
              >
                <TrendIcon className="h-3 w-3 mr-1" />
                {trend.label}
              </Badge>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Valores lado a lado */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Ano Anterior */}
            <div className="space-y-3 p-4 rounded-lg bg-muted/50">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">Ano Anterior ({new Date().getFullYear() - 1})</h4>
                <Badge variant="secondary">Histórico</Badge>
              </div>
              
              {previousYearFinance ? (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Valor Base:</span>
                    <span>{formatCurrency(previousYearFinance.base_value)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Material:</span>
                    <span>{formatCurrency(previousYearFinance.material_cost)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Descontos:</span>
                    <span className="text-green-600">
                      -{formatCurrency(previousYearFinance.total_discounts)}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-medium">
                    <span>Mensalidade Final:</span>
                    <span className="text-lg">{formatCurrency(previousYearFinance.final_monthly_value)}</span>
                  </div>
                  
                  {/* Barra de desconto */}
                  <div className="space-y-1 pt-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Desconto aplicado</span>
                      <span>
                        {formatPercentage(
                          (previousYearFinance.total_discounts / previousYearFinance.base_value) * 100
                        )}
                      </span>
                    </div>
                    <Progress 
                      value={getDiscountProgress(
                        (previousYearFinance.total_discounts / previousYearFinance.base_value) * 100
                      )} 
                      className="h-2"
                    />
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Sem dados do ano anterior</p>
              )}
            </div>
            
            {/* Ano Atual */}
            <div className="space-y-3 p-4 rounded-lg border-2 border-primary/20 bg-primary/5">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">Ano Atual ({new Date().getFullYear()})</h4>
                <Badge>Nova Proposta</Badge>
              </div>
              
              {currentPricing ? (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Valor Base:</span>
                    <span>{formatCurrency(currentPricing.baseValue)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Material:</span>
                    <span>{formatCurrency(currentPricing.materialCost)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Descontos:</span>
                    <span className="text-green-600">
                      -{formatCurrency(currentPricing.totalDiscountValue)}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-medium">
                    <span>Mensalidade Final:</span>
                    <span className="text-lg text-primary">
                      {formatCurrency(currentPricing.finalMonthlyValue)}
                    </span>
                  </div>
                  
                  {/* Barra de desconto */}
                  <div className="space-y-1 pt-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Desconto aplicado</span>
                      <span>{formatPercentage(currentPricing.totalDiscountPercentage)}</span>
                    </div>
                    <Progress 
                      value={getDiscountProgress(currentPricing.totalDiscountPercentage)} 
                      className="h-2"
                    />
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Selecione uma série para ver os valores</p>
              )}
            </div>
          </div>
          
          {/* Análise da Diferença */}
          {comparison && (
            <>
              <Separator />
              
              <div className={`p-4 rounded-lg ${trend.bgColor} ${trend.borderColor} border`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className={`p-2 rounded-full ${trend.bgColor}`}>
                    <TrendIcon className={`h-5 w-5 ${trend.color}`} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">Análise da Mudança</h4>
                    <p className="text-sm text-muted-foreground">
                      Comparação entre os anos letivos
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Diferença em Reais */}
                  <div className="text-center p-3 bg-white rounded-lg">
                    <DollarSign className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground mb-1">Diferença</p>
                    <p className={`text-lg font-bold ${trend.color}`}>
                      {comparison.difference > 0 ? '+' : ''}
                      {formatCurrency(Math.abs(comparison.difference))}
                    </p>
                  </div>
                  
                  {/* Diferença em Porcentagem */}
                  <div className="text-center p-3 bg-white rounded-lg">
                    <Percent className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground mb-1">Variação</p>
                    <p className={`text-lg font-bold ${trend.color}`}>
                      {comparison.percentageChange > 0 ? '+' : ''}
                      {formatPercentage(comparison.percentageChange)}
                    </p>
                  </div>
                  
                  {/* Status */}
                  <div className="text-center p-3 bg-white rounded-lg">
                    <CheckCircle className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground mb-1">Status</p>
                    <p className="text-sm font-medium">
                      {comparison.status === 'increase' ? 'Aumento' :
                       comparison.status === 'decrease' ? 'Economia' : 
                       'Estável'}
                    </p>
                  </div>
                </div>
                
                {/* Mensagem contextual */}
                <div className="mt-4">
                  {comparison.difference < 0 && (
                    <Alert className="bg-green-50 border-green-200">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800">
                        Ótima notícia! Você terá uma economia de {formatCurrency(Math.abs(comparison.difference))} 
                        por mês em relação ao ano anterior.
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {comparison.difference > 0 && (
                    <Alert className="bg-yellow-50 border-yellow-200">
                      <Info className="h-4 w-4 text-yellow-600" />
                      <AlertDescription className="text-yellow-800">
                        A mensalidade terá um aumento de {formatCurrency(comparison.difference)} 
                        em relação ao ano anterior. Isso pode ser devido a reajustes ou mudança nos descontos aplicados.
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {comparison.difference === 0 && (
                    <Alert className="bg-blue-50 border-blue-200">
                      <Info className="h-4 w-4 text-blue-600" />
                      <AlertDescription className="text-blue-800">
                        A mensalidade permanece a mesma do ano anterior. Sem alterações no valor.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>
            </>
          )}
          
          {/* Informação quando não há dados suficientes */}
          {!currentPricing && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Selecione uma série e configure os descontos para ver a comparação financeira completa.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
      
      {/* Card de Resumo Anual */}
      {currentPricing && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Projeção Anual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Mensalidade</p>
                <p className="font-medium">{formatCurrency(currentPricing.finalMonthlyValue)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Anual (12x)</p>
                <p className="font-medium">{formatCurrency(currentPricing.finalMonthlyValue * 12)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Material</p>
                <p className="font-medium">{formatCurrency(currentPricing.materialCost)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Economia Anual</p>
                <p className="font-medium text-green-600">
                  {formatCurrency(currentPricing.totalDiscountValue * 12)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}