import React, { useEffect, useMemo } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { 
  AlertCircle, 
  CheckCircle, 
  Info, 
  TrendingUp,
  Calculator,
  FileText,
  Sparkles,
  ChevronRight
} from 'lucide-react'
import { TrackSelector } from './TrackCard'
import { useEnrollment } from '../context/EnrollmentContext'
import { useTracksWithExamples } from '../hooks/useDiscountTracks'
import { useTrackValidation } from '../hooks/useTrackValidation'
import { useCapLimits } from '../hooks/useDiscountTracks'
import { TrilhoCalculationService } from '../services/trilhoCalculationService'
import { determinarTrilhoOptimo } from '../utils/trilhos'
import type { TrilhoNome, TipoDesconto } from '@/lib/supabase'

// ============================================================================
// COMPONENTE DE SELEÇÃO DE TRILHO INTEGRADO
// ============================================================================

interface TrackSelectionProps {
  selectedTrack?: string | null  // NEW: Track ID from new system
  descontos: TipoDesconto[]
  valorBase?: number
  onTrackSelect?: (trilho: string) => void  // NEW: Accept track ID
  className?: string
}

export const TrackSelection: React.FC<TrackSelectionProps> = ({
  selectedTrack,
  descontos,
  valorBase = 0,
  onTrackSelect,
  className
}) => {
  const {
    trilhos,
    responsaveis,
    setTrilhoEscolhido,
    setTrilhoSugerido,
    setCalculoAtual,
    setDescontosAplicados
  } = useEnrollment()
  
  const { data: tracks, isLoading: isLoadingTracks } = useTracksWithExamples()
  const { data: capConfig, isLoading: isLoadingCaps } = useCapLimits()
  
  const temResponsavelSecundario = !!responsaveis?.secundario?.nome_completo
  
  // Determinar trilho sugerido
  const trilhoSugerido = useMemo(() => {
    if (!descontos.length) return null
    return determinarTrilhoOptimo(descontos)
  }, [descontos])
  
  // Validação do trilho atual
  const validation = useTrackValidation({
    trilho: trilhos?.trilho_escolhido,
    descontos,
    valorBase,
    temResponsavelSecundario,
    autoSuggest: true
  })
  
  // Atualizar estado quando trilho sugerido mudar
  useEffect(() => {
    setTrilhoSugerido(trilhoSugerido)
  }, [trilhoSugerido, setTrilhoSugerido])
  
  // Atualizar descontos aplicados
  useEffect(() => {
    setDescontosAplicados(descontos)
  }, [descontos, setDescontosAplicados])
  
  // Atualizar cálculo atual
  useEffect(() => {
    if (validation && !validation.isLoading) {
      setCalculoAtual({
        trilho: trilhos?.trilho_escolhido || trilhoSugerido || 'comercial',
        descontos_aplicados: descontos,
        cap_calculado: validation.capApplied,
        cap_disponivel: validation.remainingCap + validation.capApplied,
        valor_total_desconto: validation.totalDiscount,
        valor_final: validation.finalValue,
        eh_valido: validation.isValid,
        restricoes: validation.errors
      })
    }
  }, [validation, trilhos?.trilho_escolhido, trilhoSugerido, descontos, setCalculoAtual])
  
  // Handler para seleção de trilho
  const handleTrackSelect = (trilho: string) => {
    // Convert new system (A, B, C) to old system (especial, combinado, comercial)
    const trackMapping: Record<string, TrilhoNome> = {
      'A': 'especial',
      'B': 'combinado', 
      'C': 'comercial'
    };
    
    const trilhoNome = trackMapping[trilho] || trilho as TrilhoNome;
    setTrilhoEscolhido(trilhoNome);
    onTrackSelect?.(trilho); // Pass original ID to new system
  }
  
  // Calcular uso de cap para cada trilho
  const capUsage = useMemo(() => {
    if (!capConfig || !descontos.length) return {}
    
    const usage: Record<string, number> = {}
    const trilhosDisponiveis: TrilhoNome[] = ['especial', 'combinado', 'comercial']
    
    trilhosDisponiveis.forEach(trilho => {
      try {
        const result = TrilhoCalculationService.calculateDiscount({
          trilho,
          descontos,
          valorBase,
          temResponsavelSecundario,
          configCap: capConfig
        })
        usage[trilho] = result.capApplied
      } catch {
        usage[trilho] = 0
      }
    })
    
    return usage
  }, [capConfig, descontos, valorBase, temResponsavelSecundario])
  
  const isLoading = isLoadingTracks || isLoadingCaps || validation.isLoading
  
  return (
    <div className={className}>
      {/* Header */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle>Seleção de Trilho de Desconto</CardTitle>
          </div>
          <CardDescription>
            Escolha o trilho mais adequado para os descontos selecionados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Resumo dos descontos */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Descontos selecionados:</span>
              <Badge variant="secondary">{descontos.length}</Badge>
            </div>
            
            {descontos.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {descontos.map((desc, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {desc.codigo} - {desc.percentual_fixo}%
                  </Badge>
                ))}
              </div>
            )}
            
            <Separator />
            
            {/* Informações do cálculo */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Valor base:</span>
                <p className="font-mono font-medium">
                  {TrilhoCalculationService.formatters.currency(valorBase)}
                </p>
              </div>
              
              {validation && !validation.isLoading && (
                <>
                  <div>
                    <span className="text-muted-foreground">Desconto total:</span>
                    <p className="font-mono font-medium text-primary">
                      {validation.totalDiscount.toFixed(1)}%
                    </p>
                  </div>
                  
                  <div>
                    <span className="text-muted-foreground">Valor final:</span>
                    <p className="font-mono font-medium text-green-600">
                      {TrilhoCalculationService.formatters.currency(validation.finalValue)}
                    </p>
                  </div>
                  
                  <div>
                    <span className="text-muted-foreground">Economia:</span>
                    <p className="font-mono font-medium">
                      {TrilhoCalculationService.formatters.currency(validation.savings)}
                    </p>
                  </div>
                </>
              )}
            </div>
            
            {/* Responsável secundário */}
            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
              <Info className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                Responsável secundário: {' '}
                <strong>{temResponsavelSecundario ? 'Sim' : 'Não'}</strong>
                {temResponsavelSecundario && ' (cap ampliado disponível)'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Alertas e sugestões */}
      {validation && !validation.isLoading && (
        <div className="space-y-3 mb-6">
          {/* Erros */}
          {validation.hasErrors && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Atenção</AlertTitle>
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1 mt-2">
                  {validation.errors.map((error, idx) => (
                    <li key={idx}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
          
          {/* Avisos */}
          {validation.hasWarnings && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Aviso</AlertTitle>
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1 mt-2">
                  {validation.warnings.map((warning, idx) => (
                    <li key={idx}>{warning}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
          
          {/* Sugestões */}
          {validation.suggestions.length > 0 && (
            <Alert className="border-blue-200 bg-blue-50">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <AlertTitle className="text-blue-900">Sugestões</AlertTitle>
              <AlertDescription className="text-blue-800">
                <ul className="list-disc list-inside space-y-1 mt-2">
                  {validation.suggestions.map((suggestion, idx) => (
                    <li key={idx}>{suggestion}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
          
          {/* Aprovação necessária */}
          {validation.isValid && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-900">
                {validation.approvalMessage}
              </AlertTitle>
              <AlertDescription className="text-green-800">
                {validation.approvalLevel === 'AUTOMATICA' 
                  ? 'Este desconto será aprovado automaticamente.'
                  : `Este desconto requer aprovação da ${
                      validation.approvalLevel === 'COORDENACAO' ? 'coordenação' : 'direção'
                    }.`
                }
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}
      
      {/* Seletor de trilhos */}
      {tracks && (
        <TrackSelector
          trilhos={tracks}
          selectedTrack={selectedTrack ? 
            // Convert new system ID to old system for display
            ({ 'A': 'especial', 'B': 'combinado', 'C': 'comercial' }[selectedTrack] || selectedTrack) :
            trilhos?.trilho_escolhido || null
          }
          recommendedTrack={trilhoSugerido}
          onSelectTrack={handleTrackSelect}
          isLoading={isLoading}
          capUsage={capUsage}
        />
      )}
      
      {/* Documentação necessária */}
      {validation && !validation.documentationComplete && (
        <Card className="mt-6 border-orange-200 bg-orange-50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-orange-600" />
              <CardTitle className="text-orange-900">
                Documentação Necessária
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {validation.requiredDocuments.map((req, idx) => (
                <div key={idx} className="border-l-2 border-orange-300 pl-3">
                  <p className="font-medium text-orange-900">{req.desconto}</p>
                  <ul className="list-disc list-inside text-sm text-orange-800 mt-1">
                    {req.documentos.map((doc, docIdx) => (
                      <li key={docIdx}>{doc}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            
            <Alert className="mt-4 border-orange-300">
              <Info className="h-4 w-4" />
              <AlertDescription>
                Todos os documentos devem ser apresentados para validação do desconto.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
      
      {/* Botão de confirmação */}
      {trilhos?.trilho_escolhido && validation?.isValid && (
        <div className="mt-6 flex justify-end">
          <Button 
            size="lg"
            className="gap-2"
            onClick={() => console.log('Confirmar trilho:', trilhos.trilho_escolhido)}
          >
            Confirmar Trilho e Continuar
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}

export default TrackSelection;