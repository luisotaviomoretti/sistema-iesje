import React from 'react'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Info,
  Target,
  Award
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CapCalculation } from '../../types/discounts'

// ============================================================================
// INTERFACES E TIPOS
// ============================================================================

interface CapIndicatorProps {
  calculation: CapCalculation
  showDetails?: boolean
  variant?: 'default' | 'warning' | 'danger'
  className?: string
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function CapIndicator({
  calculation,
  showDetails = true,
  variant = 'default',
  className
}: CapIndicatorProps) {

  // ========================================================================
  // CÁLCULOS E ESTADOS
  // ========================================================================

  const {
    trilho,
    capMaximo,
    capUtilizado,
    capDisponivel,
    percentualTotal,
    isValid,
    excedeuCap,
    proximoDoLimite,
    warnings,
    errors
  } = calculation

  const percentualProgresso = Math.min((capUtilizado / capMaximo) * 100, 100)
  const isNearLimit = proximoDoLimite && !excedeuCap
  const hasExceeded = excedeuCap
  const isEmpty = capUtilizado === 0

  // ========================================================================
  // FUNÇÕES AUXILIARES
  // ========================================================================

  const getVariantStyles = () => {
    if (hasExceeded || variant === 'danger') {
      return {
        card: 'border-red-200 bg-red-50',
        badge: 'bg-red-100 text-red-800',
        progress: 'bg-red-500',
        icon: 'text-red-600'
      }
    } else if (isNearLimit || variant === 'warning') {
      return {
        card: 'border-amber-200 bg-amber-50',
        badge: 'bg-amber-100 text-amber-800',
        progress: 'bg-amber-500',
        icon: 'text-amber-600'
      }
    } else if (capUtilizado > 0) {
      return {
        card: 'border-green-200 bg-green-50',
        badge: 'bg-green-100 text-green-800',
        progress: 'bg-green-500',
        icon: 'text-green-600'
      }
    } else {
      return {
        card: 'border-gray-200 bg-gray-50',
        badge: 'bg-gray-100 text-gray-800',
        progress: 'bg-gray-400',
        icon: 'text-gray-600'
      }
    }
  }

  const getStatusIcon = () => {
    if (hasExceeded) return AlertTriangle
    if (isNearLimit) return Info
    if (capUtilizado > 0) return CheckCircle
    return Target
  }

  const getStatusMessage = () => {
    if (hasExceeded) {
      return `Limite excedido em ${(capUtilizado - capMaximo).toFixed(1)}%`
    } else if (isNearLimit) {
      return `Próximo do limite (${capDisponivel.toFixed(1)}% restantes)`
    } else if (capUtilizado > 0) {
      return `${capDisponivel.toFixed(1)}% ainda disponível`
    } else {
      return `${capMaximo.toFixed(1)}% disponível para usar`
    }
  }

  const getTrilhoInfo = (trilhoNome: string) => {
    switch (trilhoNome) {
      case 'especial':
        return {
          nome: 'Trilho Especial',
          descricao: 'Descontos especiais exclusivos',
          icone: '⭐'
        }
      case 'combinado':
        return {
          nome: 'Trilho Combinado',
          descricao: 'Regulares + Negociação',
          icone: '🔄'
        }
      case 'comercial':
        return {
          nome: 'Trilho Comercial',
          descricao: 'Apenas negociação',
          icone: '💼'
        }
      default:
        return {
          nome: trilhoNome,
          descricao: 'Trilho personalizado',
          icone: '📋'
        }
    }
  }

  // ========================================================================
  // RENDERIZAÇÃO
  // ========================================================================

  const styles = getVariantStyles()
  const StatusIcon = getStatusIcon()
  const trilhoInfo = getTrilhoInfo(trilho)

  return (
    <Card className={cn("border-2 transition-all", styles.card, className)}>
      <div className="p-4">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={cn("p-2 rounded-full", styles.badge)}>
              <StatusIcon className={cn("w-5 h-5", styles.icon)} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 flex items-center space-x-2">
                <span>CAP de Descontos</span>
                <Badge variant="outline" className={styles.badge}>
                  {trilhoInfo.icone} {trilhoInfo.nome}
                </Badge>
              </h3>
              <p className="text-sm text-gray-600">
                {getStatusMessage()}
              </p>
            </div>
          </div>

          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">
              {capUtilizado.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">
              de {capMaximo.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600">Progresso do CAP:</span>
            <span className={cn(
              "font-medium",
              hasExceeded ? "text-red-700" :
              isNearLimit ? "text-amber-700" :
              capUtilizado > 0 ? "text-green-700" : "text-gray-700"
            )}>
              {percentualProgresso.toFixed(1)}%
            </span>
          </div>
          
          <Progress 
            value={percentualProgresso} 
            className="h-3"
          />
          
          {/* Marcações na barra */}
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0%</span>
            {capMaximo >= 50 && (
              <span className="relative">
                50%
                <div className="absolute top-[-16px] left-1/2 transform -translate-x-1/2 w-px h-3 bg-gray-300" />
              </span>
            )}
            <span>{capMaximo.toFixed(0)}%</span>
          </div>
        </div>

        {/* Detalhes */}
        {showDetails && (
          <div className="space-y-3">
            
            {/* Breakdown de valores */}
            <div className="bg-white bg-opacity-50 rounded border p-3">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <div className="font-semibold text-green-700">
                    {capUtilizado.toFixed(1)}%
                  </div>
                  <div className="text-gray-600">Utilizado</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-blue-700">
                    {capDisponivel.toFixed(1)}%
                  </div>
                  <div className="text-gray-600">Disponível</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-gray-700">
                    {capMaximo.toFixed(1)}%
                  </div>
                  <div className="text-gray-600">Máximo</div>
                </div>
              </div>
            </div>

            {/* Informações do trilho */}
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Award className="w-4 h-4" />
              <span>{trilhoInfo.descricao}</span>
            </div>

            {/* Warnings */}
            {warnings.length > 0 && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <ul className="list-disc list-inside space-y-1">
                    {warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Errors */}
            {errors.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <ul className="list-disc list-inside space-y-1">
                    {errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Status de aprovação */}
            <div className="flex items-center justify-between text-sm pt-2 border-t">
              <span className="text-gray-600">Nível de aprovação necessário:</span>
              <Badge 
                variant="outline" 
                className={cn(
                  capUtilizado > 50 ? "bg-red-100 text-red-800" :
                  capUtilizado > 20 ? "bg-yellow-100 text-yellow-800" :
                  "bg-green-100 text-green-800"
                )}
              >
                {capUtilizado > 50 ? 'Direção' :
                 capUtilizado > 20 ? 'Coordenação' : 'Automática'}
              </Badge>
            </div>

            {/* Dicas */}
            {isEmpty && (
              <div className="text-sm text-gray-500 bg-blue-50 border border-blue-200 p-3 rounded">
                <div className="flex items-start space-x-2">
                  <TrendingUp className="w-4 h-4 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-blue-800 font-medium">Dica:</p>
                    <p className="text-blue-700">
                      Selecione descontos para ver como eles afetam seu CAP total. 
                      O limite de {capMaximo}% pode ser distribuído entre diferentes tipos de desconto.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}

export default CapIndicator