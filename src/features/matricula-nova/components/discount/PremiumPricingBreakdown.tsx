import React, { useState, useEffect } from 'react'
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
  CheckCircle,
  Sparkles,
  Plus,
  Minus,
  Equal,
  BookOpen,
  CreditCard,
  PiggyBank,
  Crown,
  ArrowDown,
  ArrowRight
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================================================
// INTERFACES E TIPOS
// ============================================================================

interface PricingBreakdownData {
  valorMensalComMaterial: number
  valorMaterial: number
  valorMensalSemMaterial: number
  descontoAplicado: number
  percentualDesconto: number
  mensalidadeFinal: number
  descontosDetalhes: Array<{
    codigo: string
    descricao: string
    percentual: number
    valor: number
  }>
}

interface PremiumPricingBreakdownProps {
  data: PricingBreakdownData
  isLoading?: boolean
  className?: string
  showAnimation?: boolean
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function PremiumPricingBreakdown({
  data,
  isLoading = false,
  className,
  showAnimation = true
}: PremiumPricingBreakdownProps) {

  const [isExpanded, setIsExpanded] = useState(false)
  const [animationStep, setAnimationStep] = useState(0)
  const [showCalculation, setShowCalculation] = useState(true)

  // ========================================================================
  // EFEITOS DE ANIMAÇÃO
  // ========================================================================

  useEffect(() => {
    if (showAnimation && !isLoading) {
      const timer = setInterval(() => {
        setAnimationStep(prev => (prev < 5 ? prev + 1 : prev))
      }, 300)
      return () => clearInterval(timer)
    }
  }, [showAnimation, isLoading])

  // ========================================================================
  // FORMATAÇÃO
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

  // ========================================================================
  // COMPONENTES AUXILIARES
  // ========================================================================

  const AnimatedValue = ({ 
    value, 
    delay = 0, 
    className: itemClassName = "",
    prefix = "",
    suffix = "" 
  }: { 
    value: string
    delay?: number
    className?: string
    prefix?: string
    suffix?: string
  }) => (
    <span 
      className={cn(
        "transition-all duration-500 transform",
        showAnimation && animationStep > delay 
          ? "opacity-100 translate-y-0 scale-100" 
          : "opacity-0 translate-y-2 scale-95",
        itemClassName
      )}
    >
      {prefix}{value}{suffix}
    </span>
  )

  const CalculationStep = ({ 
    icon: Icon, 
    label, 
    value, 
    type = "normal",
    step,
    showOperator = false,
    operator = "+",
    highlight = false
  }: {
    icon: React.ElementType
    label: string
    value: string
    type?: "normal" | "negative" | "positive" | "final"
    step: number
    showOperator?: boolean
    operator?: "+" | "-" | "="
    highlight?: boolean
  }) => (
    <div className={cn(
      "transition-all duration-500 transform",
      showAnimation && animationStep >= step 
        ? "opacity-100 translate-x-0" 
        : "opacity-0 translate-x-4",
      highlight && "ring-2 ring-blue-400 bg-blue-50"
    )}>
      <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center space-x-3">
          {showOperator && (
            <div className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
              operator === "+" ? "bg-blue-100 text-blue-600" :
              operator === "-" ? "bg-red-100 text-red-600" :
              "bg-green-100 text-green-600"
            )}>
              {operator === "+" ? <Plus className="w-3 h-3" /> :
               operator === "-" ? <Minus className="w-3 h-3" /> :
               <Equal className="w-3 h-3" />}
            </div>
          )}
          <div className={cn(
            "p-2 rounded-lg",
            type === "negative" ? "bg-red-100 text-red-600" :
            type === "positive" ? "bg-green-100 text-green-600" :
            type === "final" ? "bg-gradient-to-r from-blue-100 to-purple-100 text-blue-600" :
            "bg-gray-100 text-gray-600"
          )}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <span className={cn(
              "font-medium",
              type === "final" ? "text-lg" : "text-sm"
            )}>
              {label}
            </span>
          </div>
        </div>
        <div className="text-right">
          <AnimatedValue 
            value={value}
            delay={step}
            className={cn(
              "font-bold",
              type === "negative" ? "text-red-600" :
              type === "positive" ? "text-green-600" :
              type === "final" ? "text-2xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent" :
              "text-gray-900"
            )}
          />
        </div>
      </div>
    </div>
  )

  // ========================================================================
  // LOADING STATE
  // ========================================================================

  if (isLoading) {
    return (
      <Card className={cn("overflow-hidden", className)}>
        <div className="p-8">
          <div className="animate-pulse space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                <div>
                  <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-24"></div>
                </div>
              </div>
              <div className="w-16 h-8 bg-gray-200 rounded"></div>
            </div>
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-16 bg-gray-200 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    )
  }

  // ========================================================================
  // RENDERIZAÇÃO PRINCIPAL
  // ========================================================================

  return (
    <Card className={cn(
      "overflow-hidden border-0 shadow-2xl bg-gradient-to-br from-white to-blue-50",
      className
    )}>
      <div className="relative p-8">
        
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-grid-gray-200/50 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]" />
        
        {/* Header Premium */}
        <div className="relative z-10 flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full blur opacity-75"></div>
              <div className="relative p-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full text-white">
                <Calculator className="w-8 h-8" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  Resumo de Valores
                </h3>
                <Crown className="w-6 h-6 text-yellow-500" />
              </div>
              <p className="text-gray-600 font-medium">
                Breakdown detalhado da mensalidade
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCalculation(!showCalculation)}
              className="border-blue-200 hover:bg-blue-50"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {showCalculation ? 'Ocultar Cálculo' : 'Mostrar Cálculo'}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-blue-600 hover:bg-blue-50"
            >
              {isExpanded ? (
                <>
                  <EyeOff className="w-4 h-4 mr-2" />
                  Menos detalhes
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 mr-2" />
                  Mais detalhes
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Cálculo Animado */}
        {showCalculation && (
          <div className="relative z-10 mb-8 p-6 bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200">
            <div className="flex items-center space-x-2 mb-6">
              <FileText className="w-5 h-5 text-blue-600" />
              <h4 className="font-semibold text-gray-900">Demonstração do Cálculo</h4>
            </div>
            
            <div className="space-y-3">
              <CalculationStep
                icon={CreditCard}
                label="Valor mensal com material"
                value={formatCurrency(data.valorMensalComMaterial)}
                step={0}
                showOperator={false}
              />
              
              <CalculationStep
                icon={BookOpen}
                label="Valor do material didático"
                value={formatCurrency(data.valorMaterial)}
                type="negative"
                step={1}
                showOperator={true}
                operator="-"
              />
              
              <div className="pl-6">
                <ArrowDown className="w-4 h-4 text-gray-400 mx-auto" />
              </div>
              
              <CalculationStep
                icon={DollarSign}
                label="Valor mensal sem material"
                value={formatCurrency(data.valorMensalSemMaterial)}
                step={2}
                showOperator={true}
                operator="="
                highlight={true}
              />
              
              <CalculationStep
                icon={PiggyBank}
                label={`Desconto aplicado (${formatPercentage(data.percentualDesconto)})`}
                value={formatCurrency(data.descontoAplicado)}
                type="positive"
                step={3}
                showOperator={true}
                operator="-"
              />
              
              <div className="pl-6">
                <ArrowDown className="w-4 h-4 text-gray-400 mx-auto" />
              </div>
              
              <CalculationStep
                icon={Crown}
                label="Mensalidade final (com material)"
                value={formatCurrency(data.mensalidadeFinal)}
                type="final"
                step={4}
                showOperator={true}
                operator="="
                highlight={true}
              />
            </div>
          </div>
        )}

        {/* Resumo Visual Premium */}
        <div className="relative z-10 space-y-6">
          
          {/* Cards principais */}
          <div className="grid gap-4 md:grid-cols-2">
            
            {/* Valor Original */}
            <Card className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gray-200 rounded-lg">
                    <CreditCard className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Valor Original</p>
                    <p className="text-xs text-gray-500">com material</p>
                  </div>
                </div>
                <AnimatedValue 
                  value={formatCurrency(data.valorMensalComMaterial)}
                  className="text-xl font-bold text-gray-700"
                />
              </div>
            </Card>

            {/* Economia */}
            <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-100 border-green-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-200 rounded-lg">
                    <PiggyBank className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-green-700">Desconto Aplicado</p>
                    <p className="text-xs text-green-600">{formatPercentage(data.percentualDesconto)} de desconto</p>
                  </div>
                </div>
                <AnimatedValue 
                  value={formatCurrency(data.descontoAplicado)}
                  className="text-xl font-bold text-green-600"
                  prefix="-"
                />
              </div>
            </Card>
          </div>

          {/* Valor Final Destacado */}
          <Card className="p-8 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-600 text-white relative overflow-hidden">
            {/* Background effects */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-blue-600/20 animate-pulse"></div>
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
            <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
            
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <Crown className="w-8 h-8 text-white" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-2xl font-bold text-white">Mensalidade Final</h3>
                    <Sparkles className="w-6 h-6 text-yellow-300" />
                  </div>
                  <p className="text-blue-100 font-medium">Valor com desconto + material incluído</p>
                </div>
              </div>
              <div className="text-right">
                <AnimatedValue 
                  value={formatCurrency(data.mensalidadeFinal)}
                  className="text-4xl font-bold text-white drop-shadow-lg"
                />
                <p className="text-blue-100 font-medium mt-1">por mês</p>
              </div>
            </div>

            {/* Indicador de economia */}
            {data.descontoAplicado > 0 && (
              <div className="relative z-10 mt-4 flex items-center justify-center">
                <Badge className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 text-sm font-semibold">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Economia aplicada: {formatCurrency(data.descontoAplicado)} mensais
                </Badge>
              </div>
            )}
          </Card>

          {/* Breakdown detalhado */}
          {isExpanded && (
            <>
              <Separator />
              
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <h4 className="font-semibold text-gray-900">Composição Detalhada</h4>
                </div>

                {/* Breakdown visual */}
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                    <div className="text-center">
                      <div className="p-3 bg-blue-100 rounded-full w-fit mx-auto mb-3">
                        <DollarSign className="w-6 h-6 text-blue-600" />
                      </div>
                      <p className="text-sm text-gray-600 mb-1">Base sem material</p>
                      <p className="text-lg font-bold text-gray-900">
                        {formatCurrency(data.valorMensalSemMaterial)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                    <div className="text-center">
                      <div className="p-3 bg-red-100 rounded-full w-fit mx-auto mb-3">
                        <Minus className="w-6 h-6 text-red-600" />
                      </div>
                      <p className="text-sm text-gray-600 mb-1">Desconto</p>
                      <p className="text-lg font-bold text-red-600">
                        -{formatCurrency(data.descontoAplicado)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                    <div className="text-center">
                      <div className="p-3 bg-yellow-100 rounded-full w-fit mx-auto mb-3">
                        <Plus className="w-6 h-6 text-yellow-600" />
                      </div>
                      <p className="text-sm text-gray-600 mb-1">Material</p>
                      <p className="text-lg font-bold text-yellow-600">
                        +{formatCurrency(data.valorMaterial)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Descontos aplicados */}
                {data.descontosDetalhes.length > 0 && (
                  <div className="mt-6">
                    <h5 className="font-medium text-gray-900 mb-3">Descontos Aplicados</h5>
                    <div className="space-y-2">
                      {data.descontosDetalhes.map((desconto, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                          <div>
                            <p className="font-medium text-green-900">{desconto.codigo}</p>
                            <p className="text-sm text-green-700">{desconto.descricao}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-green-700">
                              -{formatCurrency(desconto.valor)}
                            </p>
                            <p className="text-sm text-green-600">
                              {formatPercentage(desconto.percentual)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

      </div>
    </Card>
  )
}

export default PremiumPricingBreakdown