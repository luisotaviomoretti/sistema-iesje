import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Check, Info, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TrilhoDesconto } from '@/lib/supabase'

// ============================================================================
// COMPONENTE TRACKCARD - CARD DE SELEÇÃO DE TRILHO
// ============================================================================

interface TrackCardProps {
  trilho: TrilhoDesconto & { exemplos_desconto?: string[] }
  selected: boolean
  disabled?: boolean
  recommended?: boolean
  capUsed?: number
  onClick: (trilho: string) => void
  className?: string
}

export const TrackCard: React.FC<TrackCardProps> = ({ 
  trilho, 
  selected, 
  disabled = false,
  recommended = false,
  capUsed = 0,
  onClick,
  className
}) => {
  // Cores minimalistas (neutras)
  const getTrackColor = (nome: string) => {
    return 'bg-background border-border hover:border-muted-foreground/40'
  }
  
  // Determinar status badge
  const getStatusBadge = () => {
    if (selected) return { label: 'Selecionado', variant: 'default' as const }
    if (recommended) return { label: 'Recomendado', variant: 'secondary' as const }
    if (disabled) return { label: 'Indisponível', variant: 'outline' as const }
    return null
  }
  
  const statusBadge = getStatusBadge()
  
  return (
    <Card 
      className={cn(
        'relative cursor-pointer transition-all duration-200',
        getTrackColor(trilho.nome),
        'hover:shadow-md',
        selected && 'ring-2 ring-primary shadow-md',
        disabled && 'opacity-50 cursor-not-allowed',
        recommended && !selected && 'ring-1 ring-border',
        className
      )}
      onClick={() => !disabled && onClick(trilho.nome)}
    >
      {/* Badge de status */}
      {statusBadge && (
        <div className="absolute -top-2 -right-2 z-10">
          <Badge 
            variant={statusBadge.variant}
            className={cn(
              'shadow-md',
              selected && 'bg-primary text-primary-foreground'
            )}
          >
            {statusBadge.label}
          </Badge>
        </div>
      )}
      
      {/* Badge de recomendação (minimalista) */}
      {recommended && !selected && (
        <div className="absolute -top-2 -left-2 z-10">
          <Badge variant="outline">
            Recomendado
          </Badge>
        </div>
      )}
      
      <CardContent className="p-6">
        {/* Header */}
        <div className="text-center mb-4">
          <div className="text-4xl mb-3">
            {trilho.icone}
          </div>
          <h3 className="text-xl font-bold mb-2">
            {trilho.titulo}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {trilho.descricao}
          </p>
        </div>
        
        {/* Cap Information */}
        <div className="mb-4 space-y-2">
          {trilho.cap_maximo ? (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Cap máximo:</span>
              <Badge variant="outline" className="font-mono">
                {trilho.cap_maximo}%
              </Badge>
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <Badge variant="secondary" className="text-xs">
                <AlertCircle className="h-3 w-3 mr-1" />
                Sem limite de cap
              </Badge>
            </div>
          )}
          
          {/* Progress bar para cap usado */}
          {trilho.cap_maximo && capUsed > 0 && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Uso atual</span>
                <span>{capUsed.toFixed(1)}% / {trilho.cap_maximo}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div 
                  className="h-full transition-all duration-300 bg-foreground"
                  style={{ width: `${Math.min((capUsed / trilho.cap_maximo) * 100, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
        
        {/* Exemplos de descontos */}
        {trilho.exemplos_desconto && trilho.exemplos_desconto.length > 0 && (
          <div className="border-t pt-3">
            <div className="flex items-center gap-1 mb-2">
              <Info className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">
                Exemplos de descontos:
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {trilho.exemplos_desconto.slice(0, 4).map((exemplo, idx) => (
                <Badge 
                  key={idx} 
                  variant="secondary" 
                  className="text-xs py-0 px-2"
                >
                  {exemplo}
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        {/* Selected indicator (minimalista) */}
        {selected && (
          <div className="mt-4 flex items-center justify-center">
            <div className="flex items-center gap-2 font-medium">
              <Check className="h-4 w-4" />
              <span>Selecionado</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// COMPONENTE TRACKCARD SKELETON - LOADING STATE
// ============================================================================

export const TrackCardSkeleton: React.FC = () => {
  return (
    <Card className="animate-pulse">
      <CardContent className="p-6">
        <div className="text-center mb-4">
          <div className="w-12 h-12 bg-muted rounded-full mx-auto mb-3" />
          <div className="h-6 bg-muted rounded w-3/4 mx-auto mb-2" />
          <div className="h-4 bg-muted rounded w-full" />
        </div>
        
        <div className="space-y-2 mb-4">
          <div className="h-8 bg-muted rounded" />
          <div className="h-2 bg-muted rounded-full" />
        </div>
        
        <div className="border-t pt-3">
          <div className="h-3 bg-muted rounded w-1/2 mb-2" />
          <div className="flex gap-1">
            <div className="h-5 bg-muted rounded w-16" />
            <div className="h-5 bg-muted rounded w-16" />
            <div className="h-5 bg-muted rounded w-16" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// COMPONENTE TRACK SELECTOR - CONTAINER DE CARDS
// ============================================================================

interface TrackSelectorProps {
  trilhos: (TrilhoDesconto & { exemplos_desconto?: string[] })[]
  selectedTrack: string | null
  recommendedTrack?: string | null
  onSelectTrack: (trilho: string) => void
  isLoading?: boolean
  className?: string
  capUsage?: Record<string, number> // Cap usado por cada trilho
}

export const TrackSelector: React.FC<TrackSelectorProps> = ({
  trilhos,
  selectedTrack,
  recommendedTrack,
  onSelectTrack,
  isLoading = false,
  className,
  capUsage = {}
}) => {
  if (isLoading) {
    return (
      <div className={cn('grid gap-4 md:grid-cols-2', className)}>
        {[1, 2].map(i => (
          <TrackCardSkeleton key={i} />
        ))}
      </div>
    )
  }
  
  return (
    <div className={cn('grid gap-4 md:grid-cols-2', className)}>
      {trilhos.map(trilho => (
        <TrackCard
          key={trilho.id}
          trilho={trilho}
          selected={selectedTrack === trilho.nome}
          recommended={recommendedTrack === trilho.nome}
          capUsed={capUsage[trilho.nome] || 0}
          onClick={onSelectTrack}
        />
      ))}
    </div>
  )
}