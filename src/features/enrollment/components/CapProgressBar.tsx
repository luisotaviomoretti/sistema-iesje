import React from 'react'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, TrendingUp, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================================================
// COMPONENTE CAP PROGRESS BAR - BARRA DE PROGRESSO DO CAP
// ============================================================================

interface CapProgressBarProps {
  current: number
  maximum: number
  trackType: string
  trackName?: string
  className?: string
}

export const CapProgressBar: React.FC<CapProgressBarProps> = ({ 
  current, 
  maximum, 
  trackType,
  trackName,
  className 
}) => {
  // Calcular percentual de uso
  const percentage = maximum > 0 ? (current / maximum) * 100 : 0
  const isNearLimit = percentage > 80
  const isOverLimit = percentage > 100
  const remainingCap = Math.max(0, maximum - current)
  
  // Determinar cor baseado no status
  const getProgressColor = () => {
    if (isOverLimit) return 'bg-destructive'
    if (isNearLimit) return 'bg-warning'
    return 'bg-primary'
  }
  
  // Determinar cor do texto
  const getTextColor = () => {
    if (isOverLimit) return 'text-destructive'
    if (isNearLimit) return 'text-warning'
    return 'text-primary'
  }
  
  // Determinar ícone
  const getIcon = () => {
    if (isOverLimit) return AlertCircle
    if (isNearLimit) return TrendingUp
    return CheckCircle
  }
  
  const Icon = getIcon()
  
  return (
    <div className={cn('space-y-3', className)}>
      {/* Header com informações do cap */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={cn('h-4 w-4', getTextColor())} />
          <span className="font-medium text-sm">
            Cap de Desconto
            {trackName && (
              <span className="text-muted-foreground ml-1">
                ({trackName})
              </span>
            )}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge 
            variant={isOverLimit ? 'destructive' : isNearLimit ? 'secondary' : 'default'}
            className="font-mono"
          >
            {current.toFixed(1)}% / {maximum}%
          </Badge>
        </div>
      </div>
      
      {/* Barra de progresso */}
      <div className="space-y-2">
        <Progress 
          value={Math.min(percentage, 100)} 
          className={cn(
            'h-3 transition-all duration-300',
            `[&>div]:${getProgressColor()}`
          )}
        />
        
        {/* Indicadores visuais */}
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>0%</span>
          {maximum > 0 && (
            <>
              {maximum >= 25 && <span>25%</span>}
              {maximum >= 50 && <span>50%</span>}
              {maximum >= 75 && <span>75%</span>}
              <span>{maximum}%</span>
            </>
          )}
        </div>
      </div>
      
      {/* Informações adicionais */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-muted-foreground">Restante:</span>
            <span className={cn('ml-1 font-medium', getTextColor())}>
              {remainingCap.toFixed(1)}%
            </span>
          </div>
          
          <div>
            <span className="text-muted-foreground">Uso:</span>
            <span className={cn('ml-1 font-medium', getTextColor())}>
              {percentage.toFixed(1)}%
            </span>
          </div>
        </div>
        
        {/* Status badge */}
        <Badge 
          variant="outline" 
          className={cn(
            isOverLimit && 'border-destructive text-destructive',
            isNearLimit && !isOverLimit && 'border-warning text-warning',
            !isNearLimit && 'border-primary text-primary'
          )}
        >
          {isOverLimit ? 'Excedido' : isNearLimit ? 'Próximo ao limite' : 'Dentro do limite'}
        </Badge>
      </div>
      
      {/* Alertas */}
      {isOverLimit && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Cap de desconto excedido!</strong>
            <br />
            Remova alguns descontos para continuar. 
            Excesso: {(current - maximum).toFixed(1)}%
          </AlertDescription>
        </Alert>
      )}
      
      {isNearLimit && !isOverLimit && (
        <Alert className="border-warning text-warning">
          <TrendingUp className="h-4 w-4" />
          <AlertDescription>
            <strong>Atenção:</strong> Você está próximo do limite do cap.
            <br />
            Restam apenas {remainingCap.toFixed(1)}% de desconto disponível.
          </AlertDescription>
        </Alert>
      )}
      
      {!isNearLimit && current > 0 && (
        <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
          💡 Dica: Você ainda pode adicionar até {remainingCap.toFixed(1)}% em descontos adicionais neste trilho.
        </div>
      )}
    </div>
  )
}

// ============================================================================
// COMPONENTE CAP COMPARISON - COMPARAÇÃO ENTRE TRILHOS
// ============================================================================

interface CapComparisonProps {
  tracks: Array<{
    name: string
    title: string
    cap: number
    current: number
    color: string
  }>
  className?: string
}

export const CapComparison: React.FC<CapComparisonProps> = ({ 
  tracks, 
  className 
}) => {
  return (
    <div className={cn('space-y-4', className)}>
      <h4 className="font-medium text-sm">Comparação de Caps por Trilho</h4>
      
      <div className="grid gap-3">
        {tracks.map((track, index) => {
          const percentage = track.cap > 0 ? (track.current / track.cap) * 100 : 0
          const isNearLimit = percentage > 80
          const isOverLimit = percentage > 100
          
          return (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: track.color }}
                  />
                  <span className="text-sm font-medium">{track.title}</span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {track.current.toFixed(1)}% / {track.cap}%
                </Badge>
              </div>
              
              <Progress 
                value={Math.min(percentage, 100)} 
                className="h-2"
                style={{ '--progress-foreground': track.color } as React.CSSProperties}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================================
// COMPONENTE CAP SUMMARY - RESUMO DO CAP USADO
// ============================================================================

interface CapSummaryProps {
  trilho: string
  trilhoTitle: string
  capMaximo: number
  capUsado: number
  descontosAplicados: Array<{
    codigo: string
    percentual: number
    nome: string
  }>
  className?: string
}

export const CapSummary: React.FC<CapSummaryProps> = ({
  trilho,
  trilhoTitle,
  capMaximo,
  capUsado,
  descontosAplicados,
  className
}) => {
  const percentage = capMaximo > 0 ? (capUsado / capMaximo) * 100 : 0
  const isValid = capUsado <= capMaximo
  
  return (
    <div className={cn('space-y-4 p-4 border rounded-lg bg-muted/20', className)}>
      <div className="flex items-center justify-between">
        <h4 className="font-semibold">Resumo do Trilho {trilho.toUpperCase()}</h4>
        <Badge variant={isValid ? 'default' : 'destructive'}>
          {trilhoTitle}
        </Badge>
      </div>
      
      {/* Progresso visual */}
      <CapProgressBar
        current={capUsado}
        maximum={capMaximo}
        trackType={trilho}
        trackName={trilhoTitle}
      />
      
      {/* Lista de descontos aplicados */}
      {descontosAplicados.length > 0 && (
        <div className="space-y-2">
          <h5 className="text-sm font-medium">Descontos Aplicados:</h5>
          <div className="space-y-1">
            {descontosAplicados.map((desconto, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <span>{desconto.codigo} - {desconto.nome}</span>
                <Badge variant="outline" className="text-xs">
                  {desconto.percentual.toFixed(1)}%
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Total */}
      <div className="border-t pt-3">
        <div className="flex items-center justify-between font-medium">
          <span>Total de Desconto:</span>
          <span className={isValid ? 'text-primary' : 'text-destructive'}>
            {capUsado.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  )
}