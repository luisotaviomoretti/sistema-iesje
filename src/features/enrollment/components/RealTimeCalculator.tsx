import React, { useMemo, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calculator, TrendingDown, DollarSign, Percent } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import type { Desconto } from '@/features/enrollment/types'

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

export interface CalculationResult {
  valorBase: number
  totalDesconto: number
  valorDesconto: number
  valorFinal: number
  economia: number
  isValid: boolean
  warnings: string[]
  breakdown: DiscountBreakdown[]
}

interface DiscountBreakdown {
  codigo: string
  nome: string
  percentual: number
  valorDesconto: number
  categoria: string
}

interface SerieValues {
  valorComMaterial: number
  valorMaterial: number
  valorSemMaterial: number
}

interface RealTimeCalculatorProps {
  baseMensal: number
  selectedDiscounts: Desconto[]
  trilhoSelecionado?: string
  capMaximo?: number
  onCalculationUpdate: (result: CalculationResult) => void
  className?: string
  compact?: boolean
  serieValues?: SerieValues
  serieAno?: string
  escola?: "pelicano" | "sete_setembro"
}

// ============================================================================
// COMPONENTE PRINCIPAL - CALCULADORA EM TEMPO REAL
// ============================================================================

export const RealTimeCalculator: React.FC<RealTimeCalculatorProps> = ({
  baseMensal,
  selectedDiscounts,
  trilhoSelecionado,
  capMaximo,
  onCalculationUpdate,
  className,
  compact = false,
  serieValues,
  serieAno,
  escola
}) => {
  // Calcular resultado em tempo real
  const calculation = useMemo(() => {
    // Validar entrada
    if (baseMensal <= 0) {
      return {
        valorBase: 0,
        totalDesconto: 0,
        valorDesconto: 0,
        valorFinal: 0,
        economia: 0,
        isValid: false,
        warnings: ['Valor base da mensalidade é obrigatório'],
        breakdown: []
      } as CalculationResult
    }

    // Calcular breakdown por desconto
    const breakdown: DiscountBreakdown[] = selectedDiscounts.map(desconto => {
      const percentual = desconto.percentual_aplicado || 0
      const valorDesconto = (baseMensal * percentual) / 100
      
      return {
        codigo: desconto.codigo_desconto,
        nome: desconto.codigo_desconto, // TODO: buscar nome real do tipo
        percentual,
        valorDesconto,
        categoria: 'regular' // TODO: determinar categoria real
      }
    })

    // Calcular totais
    const totalDesconto = breakdown.reduce((sum, item) => sum + item.percentual, 0)
    const valorTotalDesconto = breakdown.reduce((sum, item) => sum + item.valorDesconto, 0)
    const valorFinal = baseMensal - valorTotalDesconto

    // Validações
    const warnings: string[] = []
    let isValid = true

    // Verificar regras específicas do trilho (exclusividade)
    if (trilhoSelecionado === 'especial') {
      const especiais = breakdown.filter(b => b.categoria === 'especial')
      
      if (especiais.length > 1) {
        warnings.push('Trilho Especial permite apenas 1 desconto especial')
        isValid = false
      }
    }
    
    if (trilhoSelecionado === 'combinado') {
      const regulares = breakdown.filter(b => b.categoria === 'regular')
      const negociacoes = breakdown.filter(b => b.categoria === 'negociacao')
      
      if (regulares.length > 1) {
        warnings.push('Trilho Regular + Negociação permite apenas 1 desconto regular')
        isValid = false
      }
      
      if (negociacoes.length > 1) {
        warnings.push('Trilho Regular + Negociação permite apenas 1 desconto de negociação')
        isValid = false
      }
    }

    // Verificar cap máximo
    if (capMaximo && totalDesconto > capMaximo) {
      warnings.push(`Desconto total (${totalDesconto.toFixed(1)}%) excede o cap do trilho (${capMaximo}%)`)
      isValid = false
    }

    // Verificar valor negativo
    if (valorFinal < 0) {
      warnings.push('Valor final não pode ser negativo')
      isValid = false
    }

    // Verificar desconto muito alto
    if (totalDesconto > 100) {
      warnings.push('Desconto total não pode exceder 100%')
      isValid = false
    }

    return {
      valorBase: baseMensal,
      totalDesconto,
      valorDesconto: valorTotalDesconto,
      valorFinal: Math.max(0, valorFinal),
      economia: valorTotalDesconto,
      isValid,
      warnings,
      breakdown
    } as CalculationResult
  }, [baseMensal, selectedDiscounts, capMaximo])

  // Notificar mudanças para o componente pai
  useEffect(() => {
    onCalculationUpdate(calculation)
  }, [calculation, onCalculationUpdate])

  // Formatador de moeda
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  // Renderização compacta (minimalista)
  if (compact) {
    return (
      <Card className={cn('bg-muted/30 border-border', className)}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">
                {serieValues ? 'Valor Total Final' : 'Valor Final'}
              </div>
              <div className={cn(
                'text-xl font-bold',
                calculation.isValid ? 'text-foreground' : 'text-destructive'
              )}>
                {serieValues 
                  ? formatCurrency(calculation.valorFinal + serieValues.valorMaterial)
                  : formatCurrency(calculation.valorFinal)
                }
              </div>
              {serieValues && (
                <div className="text-xs text-muted-foreground">
                  (Sem material: {formatCurrency(calculation.valorFinal)})
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Economia</div>
              <div className="text-lg font-semibold">
                -{formatCurrency(calculation.economia)}
              </div>
            </div>
          </div>
          
          {calculation.totalDesconto > 0 && (
            <div className="mt-2 text-center">
              <Badge variant="secondary">
                {calculation.totalDesconto.toFixed(1)}% de desconto total
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  // Renderização completa (minimalista)
  return (
    <Card className={cn(
      'transition-all duration-300',
      calculation.isValid 
        ? 'bg-background border-border' 
        : 'bg-muted/50 border-destructive/20',
      className
    )}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          Cálculo em Tempo Real
          {trilhoSelecionado && (
            <Badge variant="outline" className="ml-auto">
              Trilho {trilhoSelecionado.toUpperCase()}
            </Badge>
          )}
        </CardTitle>
        
        {/* Informações da série e escola (minimalista) */}
        {(serieAno || escola) && (
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            {escola && (
              <span>
                {escola === "pelicano" ? "Pelicano" : "Sete de Setembro"}
              </span>
            )}
            {serieAno && <span>{serieAno}</span>}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Extrato detalhado com valores da série (minimalista) */}
        {serieValues && (
          <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
            <h4 className="font-semibold text-sm">
              Extrato Detalhado de Cálculo
            </h4>
            
            <div className="space-y-3">
              {/* Linha 1: Mensalidade com Material */}
              <div className="flex items-center justify-between p-2 bg-background rounded border">
                <span className="text-sm font-medium">Mensalidade c/ Material</span>
                <span className="font-semibold">
                  {formatCurrency(serieValues.valorComMaterial)}
                </span>
              </div>
              
              {/* Linha 2: Material (subtração) */}
              <div className="flex items-center justify-between p-2 bg-background rounded border">
                <span className="text-sm font-medium">Valor do Material</span>
                <span className="font-semibold">
                  -{formatCurrency(serieValues.valorMaterial)}
                </span>
              </div>
              
              {/* Linha 3: Base para desconto */}
              <div className="flex items-center justify-between p-2 bg-muted/50 rounded border">
                <span className="text-sm font-medium">Base para Desconto</span>
                <span className="font-semibold">
                  {formatCurrency(serieValues.valorSemMaterial)}
                </span>
              </div>
              
              {/* Linha 4: Desconto aplicado */}
              {calculation.valorDesconto > 0 && (
                <div className="flex items-center justify-between p-2 bg-background rounded border">
                  <span className="text-sm font-medium">
                    Desconto ({calculation.totalDesconto.toFixed(1)}%)
                  </span>
                  <span className="font-semibold">
                    -{formatCurrency(calculation.valorDesconto)}
                  </span>
                </div>
              )}
              
              {/* Separador */}
              <div className="border-t border-border my-2"></div>
              
              {/* Linha 5: Valor final sem material */}
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded border">
                <span className="font-medium">Mensalidade Final (sem material)</span>
                <span className="text-xl font-bold">
                  {formatCurrency(calculation.valorFinal)}
                </span>
              </div>
              
              {/* Linha 6: Adicionar material novamente para valor total final */}
              <div className="flex items-center justify-between p-2 bg-background rounded border">
                <span className="text-sm font-medium">+ Valor do Material</span>
                <span className="font-semibold">
                  +{formatCurrency(serieValues.valorMaterial)}
                </span>
              </div>
              
              {/* Linha 7: Valor total final */}
              <div className="flex items-center justify-between p-3 bg-background rounded border-2">
                <span className="font-bold">Valor Total Final</span>
                <span className="text-xl font-bold">
                  {formatCurrency(calculation.valorFinal + serieValues.valorMaterial)}
                </span>
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-xs text-muted-foreground">
                Desconto aplicado apenas sobre o valor sem material
              </div>
            </div>
          </div>
        )}

        {/* Valores principais (versão compacta quando serieValues não disponível) */}
        {!serieValues && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                Valor Base
              </div>
              <div className="text-lg font-semibold">
                {formatCurrency(calculation.valorBase)}
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Percent className="h-4 w-4" />
                Desconto Total
              </div>
              <div className="text-lg font-semibold">
                {calculation.totalDesconto.toFixed(1)}%
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingDown className="h-4 w-4" />
                Valor Desconto
              </div>
              <div className="text-lg font-semibold">
                -{formatCurrency(calculation.valorDesconto)}
              </div>
            </div>

            <div className="space-y-1 p-3 bg-muted/30 rounded border">
              <div className="text-sm text-muted-foreground">Valor Final</div>
              <div className={cn(
                'text-xl font-bold',
                calculation.isValid ? 'text-foreground' : 'text-destructive'
              )}>
                {formatCurrency(calculation.valorFinal)}
              </div>
            </div>
          </div>
        )}

        {/* Breakdown de descontos */}
        {calculation.breakdown.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Detalhamento dos Descontos</h4>
              <div className="space-y-2">
                {calculation.breakdown.map((item, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-2 bg-muted/30 rounded text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {item.codigo}
                      </Badge>
                      <span className="font-medium">{item.nome}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground">
                        {item.percentual.toFixed(1)}%
                      </span>
                      <span className="font-semibold">
                        -{formatCurrency(item.valorDesconto)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Cap information */}
        {capMaximo && (
          <>
            <Separator />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Cap do Trilho {trilhoSelecionado?.toUpperCase()}:
              </span>
              <div className="flex items-center gap-2">
                <Badge 
                  variant={calculation.totalDesconto <= capMaximo ? "secondary" : "destructive"}
                  className="font-mono"
                >
                  {calculation.totalDesconto.toFixed(1)}% / {capMaximo}%
                </Badge>
              </div>
            </div>
          </>
        )}

        {/* Warnings */}
        {calculation.warnings.length > 0 && (
          <div className="space-y-2">
            {calculation.warnings.map((warning, index) => (
              <div 
                key={index}
                className="flex items-start gap-2 p-2 bg-destructive/10 border border-destructive/20 rounded text-sm"
              >
                <div className="text-destructive mt-0.5">⚠️</div>
                <div className="text-destructive">{warning}</div>
              </div>
            ))}
          </div>
        )}

      </CardContent>
    </Card>
  )
}

// ============================================================================
// COMPONENTE RESUMO RÁPIDO - PARA SIDEBAR OU RESUMOS
// ============================================================================

interface QuickSummaryProps {
  calculation: CalculationResult
  className?: string
}

export const QuickSummary: React.FC<QuickSummaryProps> = ({
  calculation,
  className
}) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Valor Original:</span>
        <span className="font-medium">{formatCurrency(calculation.valorBase)}</span>
      </div>
      
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Desconto:</span>
        <span className="font-medium text-green-600">
          -{formatCurrency(calculation.valorDesconto)} ({calculation.totalDesconto.toFixed(1)}%)
        </span>
      </div>
      
      <Separator />
      
      <div className="flex items-center justify-between">
        <span className="font-medium">Valor Final:</span>
        <span className={cn(
          'text-lg font-bold',
          calculation.isValid ? 'text-primary' : 'text-destructive'
        )}>
          {formatCurrency(calculation.valorFinal)}
        </span>
      </div>
    </div>
  )
}