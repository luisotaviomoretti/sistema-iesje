import React, { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getSeriesAnnualValuesConfig } from '@/lib/config/config.service'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Calculator,
  DollarSign,
  TrendingDown,
  TrendingUp,
  Minus,
  CheckCircle,
  BookOpen,
  Package,
  Info,
  AlertCircle,
  Percent
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { RematriculaPricingService } from '../../services/rematriculaPricingService'
import type { DatabaseSeries } from '../../../matricula-nova/types/api'

interface FinancialBreakdownCardProps {
  series: DatabaseSeries | null
  discounts: Array<{ trilho: string; tipoDescontoId: string; percentual: number }> | null
  suggestedPercentage?: number | null
  previousYearData?: {
    valor_mensalidade?: number
    desconto_percentual?: number
  } | null
  isLoading?: boolean
  className?: string
  capInfo?: { capped: boolean; previousPercent: number; capPercent?: number } | null
}

export default function FinancialBreakdownCard({
  series,
  discounts,
  suggestedPercentage,
  previousYearData,
  isLoading = false,
  className,
  capInfo
}: FinancialBreakdownCardProps) {
  // Feature flag — Séries: Valores Anuais
  const { data: annualCfg } = useQuery({
    queryKey: ['series-annual-values-config'],
    queryFn: async () => getSeriesAnnualValuesConfig(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })
  const annualEnabled = Boolean(annualCfg?.enabled)
  
  const formatCurrency = (value: number | null | undefined) => {
    if (value == null) return 'R$ 0,00'
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatPercentage = (value: number | null | undefined) => {
    if (value == null) return '0%'
    return `${value.toFixed(1)}%`
  }

  // Calcular pricing usando o serviço independente
  const pricing = useMemo(() => {
    // Debug logging
    if (import.meta.env.DEV) {
      console.log('[FinancialBreakdownCard] Debug:', {
        series,
        discounts,
        suggestedPercentage,
        hasSeries: !!series,
        seriesType: typeof series,
        seriesKeys: series ? Object.keys(series) : null
      })
    }
    
    if (!series) return null
    
    // Se não houver descontos manuais mas houver desconto sugerido, usar o sugerido
    let effectiveDiscounts = discounts || []
    
    if (effectiveDiscounts.length === 0 && suggestedPercentage && suggestedPercentage > 0) {
      // Criar um desconto genérico com o percentual sugerido
      effectiveDiscounts = [{
        id: 'suggested',
        codigo: 'SUGERIDO',
        nome: 'Desconto do ano anterior',
        percentual: suggestedPercentage,
        trilho: 'especial' // Assumindo trilho especial para desconto sugerido
      }] as any
    }
    
    // Converter formato dos descontos para o esperado pelo serviço
    const formattedDiscounts = effectiveDiscounts?.map(d => ({
      id: d.tipoDescontoId || d.id,
      codigo: d.tipoDescontoId || d.codigo || 'SUGERIDO',
      nome: d.nome || 'Desconto',
      percentual: d.percentual,
      trilho: d.trilho
    })) || []
    
    try {
      const result = RematriculaPricingService.calculate(series, formattedDiscounts as any)
      if (import.meta.env.DEV) {
        console.log('[FinancialBreakdownCard] Pricing calculated:', result)
      }
      return result
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[FinancialBreakdownCard] Error calculating pricing:', error)
      }
      return null
    }
  }, [series, discounts, suggestedPercentage])

  // Desconto nominal para exibição deve ser calculado sobre a base ANUAL (sem material)
  const annualDiscountValue = useMemo(() => {
    if (!series || !pricing) return 0
    const annual = RematriculaPricingService.getAnnualValues(series)
    const pct = Number(pricing.totalDiscountPercentage) || 0
    const value = (annual.annualBase * pct) / 100
    return Math.round((value + Number.EPSILON) * 100) / 100
  }, [series, pricing])

  // Calcular comparação com ano anterior
  const comparison = useMemo(() => {
    if (!pricing || !previousYearData?.valor_mensalidade) return null
    
    const currentTotal = pricing.finalMonthlyValue
    const previousTotal = previousYearData.valor_mensalidade
    const difference = currentTotal - previousTotal
    const percentageChange = ((difference / previousTotal) * 100)
    
    return {
      previousValue: previousTotal,
      currentValue: currentTotal,
      difference,
      percentageChange,
      isIncrease: difference > 0,
      isDecrease: difference < 0,
      isSame: Math.abs(difference) < 0.01
    }
  }, [pricing, previousYearData])

  // Flag local para exibição da comparação com ano anterior.
  // Mantemos a lógica intacta, apenas ocultando a renderização para não impactar UX.
  const SHOW_COMPARISON_SECTION = false

  if (isLoading) {
    return (
      <Card className={cn("", className)}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 animate-pulse" />
            <CardTitle>Detalhamento Financeiro</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-12 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!series || !pricing) {
    return (
      <Card className={cn("", className)}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            <CardTitle>Detalhamento Financeiro</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Selecione uma série e configure os descontos para visualizar o detalhamento financeiro.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  const hasDiscount = pricing.totalDiscountPercentage > 0
  const showCapAlert = Boolean(capInfo?.capped && (!discounts || discounts.length === 0) && typeof suggestedPercentage === 'number')

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Detalhamento Financeiro</CardTitle>
              <CardDescription>
                Valores calculados para a série {series.nome}
              </CardDescription>
            </div>
          </div>
          {hasDiscount && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Percent className="h-3.5 w-3.5" />
              {formatPercentage(pricing.totalDiscountPercentage)} de desconto
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {showCapAlert && (
          <Alert className="border-amber-200 bg-amber-50">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-900 text-xs">
              O Desconto Sugerido foi ajustado para {Number(suggestedPercentage).toFixed(1)}% devido a regras administrativas (CAP). O desconto do ano anterior era {Number(capInfo?.previousPercent || 0).toFixed(1)}%.
            </AlertDescription>
          </Alert>
        )}
        {/* Valores Base (exibir apenas no modo mensal) */}
        {!annualEnabled && (
          <div className="space-y-3">
            <div className="text-sm font-medium text-muted-foreground">Valores Base</div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Mensalidade (sem material)</span>
                </div>
                <span className="font-medium">{formatCurrency(pricing.baseValue)}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Material didático</span>
                </div>
                <span className="font-medium">{formatCurrency(pricing.materialValue)}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-lg border-2 border-muted">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-sm font-medium">Total sem desconto</span>
                </div>
                <span className="font-semibold">{formatCurrency(pricing.totalValue)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Descontos Aplicados */}
        {hasDiscount && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="text-sm font-medium text-muted-foreground">Descontos Aplicados</div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-900">Total de descontos</span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-green-900">
                      {formatCurrency(annualDiscountValue)}
                    </div>
                    <div className="text-xs text-green-700">
                      {formatPercentage(pricing.totalDiscountPercentage)}
                    </div>
                  </div>
                </div>
                
                {pricing.totalDiscountPercentage >= 100 && (
                  <Alert className="border-amber-200 bg-amber-50">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-amber-900">
                      Bolsa integral aplicada - 100% de desconto na mensalidade
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          </>
        )}

        {/* Valor Final (somente no modo mensal) */}
        {!annualEnabled && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="text-sm font-medium text-muted-foreground">Valor Final</div>
              
              <div className="p-4 rounded-lg bg-primary/5 border-2 border-primary/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    <span className="font-medium">Mensalidade com desconto</span>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary">
                      {formatCurrency(pricing.finalMonthlyValue)}
                    </div>
                    {hasDiscount && (
                      <div className="text-xs text-muted-foreground">
                        Economia de {formatCurrency(annualDiscountValue)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Totais Anuais (sem desconto) */}
        <Separator />
        <div className="space-y-3">
          <div className="text-sm font-medium text-muted-foreground">Totais Anuais (sem desconto)</div>
          {(() => {
            const annual = RematriculaPricingService.getAnnualValues(series)
            return (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="text-xs text-muted-foreground mb-1">Anual sem material</div>
                  <div className="font-medium">{formatCurrency(annual.annualBase)}</div>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="text-xs text-muted-foreground mb-1">Anual material</div>
                  <div className="font-medium">{formatCurrency(annual.annualMaterial)}</div>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 border-2 border-muted">
                  <div className="text-xs text-muted-foreground mb-1">Anual com material</div>
                  <div className="font-semibold">{formatCurrency(annual.annualTotal)}</div>
                </div>
              </div>
            )
          })()}
          <div className="text-[10px] text-muted-foreground">Fonte: {RematriculaPricingService.getAnnualValues(series).source === 'db' ? 'banco' : 'x12 (derivado)'}</div>
        </div>

        {/* Comparação com Ano Anterior */}
        {comparison && SHOW_COMPARISON_SECTION && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="text-sm font-medium text-muted-foreground">
                Comparação com Ano Anterior
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="text-xs text-muted-foreground mb-1">Ano anterior</div>
                  <div className="font-medium">{formatCurrency(comparison.previousValue)}</div>
                </div>
                
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="text-xs text-muted-foreground mb-1">Este ano</div>
                  <div className="font-medium">{formatCurrency(comparison.currentValue)}</div>
                </div>
              </div>
              
              <div className={cn(
                "p-3 rounded-lg border",
                comparison.isIncrease && "bg-red-50 border-red-200",
                comparison.isDecrease && "bg-green-50 border-green-200",
                comparison.isSame && "bg-gray-50 border-gray-200"
              )}>
                <div className="flex items-center justify-between">
                  {comparison.isIncrease && <TrendingUp className="h-4 w-4 text-red-600" />}
                  {comparison.isDecrease && <TrendingDown className="h-4 w-4 text-green-600" />}
                  {comparison.isSame && <Minus className="h-4 w-4 text-gray-600" />}
                  <span className={cn(
                    "text-sm",
                    comparison.isIncrease && "text-red-900",
                    comparison.isDecrease && "text-green-900",
                    comparison.isSame && "text-gray-900"
                  )}>
                    {comparison.isIncrease && "Aumento"}
                    {comparison.isDecrease && "Redução"}
                    {comparison.isSame && "Sem alteração"}
                  </span>
                  <div className="text-right">
                    <div className={cn(
                      "font-semibold",
                      comparison.isIncrease && "text-red-900",
                      comparison.isDecrease && "text-green-900",
                      comparison.isSame && "text-gray-900"
                    )}>
                      {comparison.isSame ? "-" : formatCurrency(Math.abs(comparison.difference))}
                    </div>
                    {!comparison.isSame && (
                      <div className={cn(
                        "text-xs",
                        comparison.isIncrease && "text-red-700",
                        comparison.isDecrease && "text-green-700"
                      )}>
                        {formatPercentage(Math.abs(comparison.percentageChange))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}