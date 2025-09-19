/**
 * Seção de progressão acadêmica
 * Permite seleção livre de série, trilho e turno para o novo ano letivo
 */

import React, { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  GraduationCap, 
  ArrowRight, 
  Info, 
  AlertCircle,
  School,
  Clock,
  MapPin,
  CheckCircle,
  XCircle
} from 'lucide-react'
import type { DatabaseSeries } from '../../../matricula-nova/types/api'
import type { ShiftType } from '../../types'

interface Track {
  id: string
  name: string
  description?: string
  available_shifts: ShiftType[]
}

interface AcademicProgressionSectionProps {
  previousSeriesName: string
  previousTrackName: string
  previousShift: ShiftType
  availableSeries: DatabaseSeries[]
  availableTracks: Track[]
  selectedSeriesId: string
  selectedTrackId: string
  selectedShift: ShiftType
  onSeriesChange: (seriesId: string) => void
  onTrackChange: (trackId: string) => void
  onShiftChange: (shift: ShiftType) => void
  errors?: {
    series?: string
    track?: string
    shift?: string
  }
  className?: string
}

export function AcademicProgressionSection({
  previousSeriesName,
  previousTrackName,
  previousShift,
  availableSeries,
  availableTracks,
  selectedSeriesId,
  selectedTrackId,
  selectedShift,
  onSeriesChange,
  onTrackChange,
  onShiftChange,
  errors,
  className = ''
}: AcademicProgressionSectionProps) {
  
  // Agrupar séries por nível
  const groupedSeries = useMemo(() => {
    const groups: Record<string, DatabaseSeries[]> = {
      'Educação Infantil': [],
      'Ensino Fundamental I': [],
      'Ensino Fundamental II': [],
      'Ensino Médio': []
    }
    
    availableSeries.forEach(series => {
      const name = series.nome.toLowerCase()
      
      if (name.includes('infantil') || name.includes('maternal')) {
        groups['Educação Infantil'].push(series)
      } else if (name.includes('1º ano') || name.includes('2º ano') || 
                 name.includes('3º ano') || name.includes('4º ano') || 
                 name.includes('5º ano')) {
        groups['Ensino Fundamental I'].push(series)
      } else if (name.includes('6º ano') || name.includes('7º ano') || 
                 name.includes('8º ano') || name.includes('9º ano')) {
        groups['Ensino Fundamental II'].push(series)
      } else if (name.includes('médio') || name.includes('em')) {
        groups['Ensino Médio'].push(series)
      }
    })
    
    // Remover grupos vazios
    Object.keys(groups).forEach(key => {
      if (groups[key].length === 0) {
        delete groups[key]
      }
    })
    
    return groups
  }, [availableSeries])
  
  // Sugerir progressão natural
  const suggestedSeries = useMemo(() => {
    const currentYear = parseInt(previousSeriesName.match(/\d+/)?.[0] || '0')
    
    if (currentYear > 0 && currentYear < 9) {
      // Fundamental - próximo ano
      const nextYear = currentYear + 1
      return availableSeries.find(s => 
        s.nome.includes(`${nextYear}º`) || s.nome.includes(`${nextYear}º ano`)
      )
    } else if (previousSeriesName.includes('9º')) {
      // 9º ano → 1º médio
      return availableSeries.find(s => 
        s.nome.toLowerCase().includes('1º') && s.nome.toLowerCase().includes('médio')
      )
    }
    
    return null
  }, [previousSeriesName, availableSeries])
  
  // Formatador de turno
  const formatShift = (shift: string): string => {
    const shifts: Record<string, string> = {
      'morning': 'Manhã',
      'afternoon': 'Tarde',
      'evening': 'Noite'
    }
    return shifts[shift] || shift
  }
  
  // Obter série selecionada
  const selectedSeries = availableSeries.find(s => s.id === selectedSeriesId)
  
  // Filtrar trilhos disponíveis para a série selecionada
  const availableTracksForSeries = useMemo(() => {
    if (!selectedSeries) return []
    // Por enquanto retornar todos os trilhos
    // Futuramente pode filtrar baseado na série
    return availableTracks
  }, [selectedSeries, availableTracks])
  
  // Obter trilho selecionado
  const selectedTrack = availableTracksForSeries.find(t => t.id === selectedTrackId)
  
  // Turnos disponíveis para o trilho selecionado
  const availableShifts = selectedTrack?.available_shifts || ['morning', 'afternoon', 'evening']
  
  // UI flag: ocultar badge de sugestão de série (não disruptivo)
  const SHOW_SERIES_SUGGESTION = false
  
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Progressão Acadêmica
          </CardTitle>
          <Badge variant="outline">Novo Ano Letivo</Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Informação do ano anterior */}
        <div className="rounded-lg bg-muted/50 p-4">
          <p className="text-sm font-medium mb-2">Dados do Ano Anterior:</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <School className="h-4 w-4 text-muted-foreground" />
              <span>{previousSeriesName}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{previousTrackName}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{formatShift(previousShift)}</span>
            </div>
          </div>
        </div>
        
        <Separator />
        
        {/* Seleção de Nova Série */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="series-select" className="text-base">
              Nova Série *
            </Label>
            {suggestedSeries && suggestedSeries.id !== selectedSeriesId && SHOW_SERIES_SUGGESTION && (
              <Badge variant="secondary" className="text-xs">
                Sugestão: {suggestedSeries.nome}
              </Badge>
            )}
          </div>
          
          <Select value={selectedSeriesId} onValueChange={onSeriesChange}>
            <SelectTrigger 
              id="series-select"
              className={errors?.series ? 'border-red-500' : ''}
            >
              <SelectValue placeholder="Selecione a série para o novo ano" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(groupedSeries).map(([group, series]) => (
                <div key={group}>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                    {group}
                  </div>
                  {series.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{s.nome}</span>
                        {s.id === suggestedSeries?.id && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            Progressão natural
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </div>
              ))}
            </SelectContent>
          </Select>
          
          {errors?.series && (
            <p className="text-sm text-red-500 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors.series}
            </p>
          )}
          
          {/* Informação sobre repetência */}
          {selectedSeries && selectedSeries.nome === previousSeriesName && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Você selecionou a mesma série do ano anterior. 
                Isso indica repetência. Certifique-se de que esta é a opção correta.
              </AlertDescription>
            </Alert>
          )}
        </div>
        
        {/* Seleção de Trilho */}
        {selectedSeries && (
          <>
            <Separator />
            
            <div className="space-y-3">
              <Label htmlFor="track-select" className="text-base">
                Trilho *
              </Label>
              
              <Select 
                value={selectedTrackId} 
                onValueChange={onTrackChange}
                disabled={availableTracksForSeries.length === 0}
              >
                <SelectTrigger 
                  id="track-select"
                  className={errors?.track ? 'border-red-500' : ''}
                >
                  <SelectValue placeholder="Selecione o trilho" />
                </SelectTrigger>
                <SelectContent>
                  {availableTracksForSeries.map((track) => (
                    <SelectItem key={track.id} value={track.id}>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span>{track.name}</span>
                          {track.name === previousTrackName && (
                            <Badge variant="outline" className="text-xs">
                              Mesmo do ano anterior
                            </Badge>
                          )}
                        </div>
                        {track.description && (
                          <p className="text-xs text-muted-foreground">
                            {track.description}
                          </p>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {errors?.track && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.track}
                </p>
              )}
            </div>
          </>
        )}
        
        {/* Seleção de Turno */}
        {selectedTrack && (
          <>
            <Separator />
            
            <div className="space-y-3">
              <Label className="text-base">
                Turno *
              </Label>
              
              <RadioGroup 
                value={selectedShift} 
                onValueChange={(value) => onShiftChange(value as ShiftType)}
                className="grid grid-cols-1 md:grid-cols-3 gap-3"
              >
                {availableShifts.map((shift) => {
                  const isAvailable = availableShifts.includes(shift)
                  const isSameAsPrevious = shift === previousShift
                  
                  return (
                    <div key={shift} className="relative">
                      <div className={`flex items-center space-x-3 p-3 border rounded-lg ${
                        !isAvailable ? 'opacity-50 cursor-not-allowed' : 'hover:bg-muted/50'
                      }`}>
                        <RadioGroupItem 
                          value={shift} 
                          id={shift}
                          disabled={!isAvailable}
                        />
                        <Label 
                          htmlFor={shift} 
                          className={`flex-1 cursor-pointer ${!isAvailable ? 'cursor-not-allowed' : ''}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span>{formatShift(shift)}</span>
                            </div>
                            {isSameAsPrevious && (
                              <Badge variant="outline" className="text-xs">
                                Atual
                              </Badge>
                            )}
                          </div>
                        </Label>
                        {isAvailable ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    </div>
                  )
                })}
              </RadioGroup>
              
              {errors?.shift && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.shift}
                </p>
              )}
            </div>
          </>
        )}
        
        {/* Resumo da Seleção */}
        {selectedSeries && selectedTrack && selectedShift && (
          <>
            <Separator />
            
            <div className="rounded-lg bg-primary/5 border-2 border-primary/20 p-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="h-5 w-5 text-primary" />
                <h4 className="font-medium">Resumo da Progressão</h4>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="secondary">{previousSeriesName}</Badge>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <Badge>{selectedSeries.nome}</Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Trilho: </span>
                  <span className="font-medium">{selectedTrack.name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Turno: </span>
                  <span className="font-medium">{formatShift(selectedShift)}</span>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}