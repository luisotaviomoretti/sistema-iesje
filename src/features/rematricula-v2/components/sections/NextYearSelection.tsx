import React, { useMemo, useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Loader2, School, Clock, ArrowRight } from 'lucide-react'
import { useSeriesBySchool, type SerieOption, escolaDbLabelFromStudent } from '../../hooks/data/useSeriesBySchool'

type Shift = 'morning' | 'afternoon' | 'night'

interface NextYearSelectionProps {
  studentEscola?: 'pelicano' | 'sete_setembro' | string | null
  previousSeriesName?: string | null
  previousShift?: Shift | string | null
  onChange?: (selection: { seriesId: string | null; shift: Shift | null; series?: SerieOption | null }) => void
}

export default function NextYearSelection({
  studentEscola,
  previousSeriesName,
  previousShift,
  onChange,
}: NextYearSelectionProps) {
  const escolaDb = escolaDbLabelFromStudent(studentEscola)
  const { data: series, isLoading, isError } = useSeriesBySchool(studentEscola)

  const [seriesId, setSeriesId] = useState<string | null>(null)
  const [shift, setShift] = useState<Shift | null>(null)

  // Sugestão simples de progressão: se detectar número (1..9) no nome da série, sugere +1
  const suggestedSeries = useMemo(() => {
    if (!previousSeriesName || !series) return null
    const match = previousSeriesName.match(/(\d+)/)
    if (!match) return null
    const current = parseInt(match[1], 10)
    if (!Number.isFinite(current)) return null
    const next = current + 1
    const byNumber = series.find(s => s.nome.includes(`${next}º`))
    return byNumber || null
  }, [previousSeriesName, series])

  useEffect(() => {
    const selectedSeries = series?.find(s => s.id === seriesId) || null
    if (onChange) onChange({ seriesId, shift, series: selectedSeries })
  }, [seriesId, shift, series, onChange])

  const formatShift = (value?: string | null) => {
    switch (value) {
      case 'morning': return 'Manhã'
      case 'afternoon': return 'Tarde'
      case 'night': return 'Noite'
      default: return value || ''
    }
  }

  const formatCurrency = (value?: number | null) => {
    if (typeof value !== 'number' || !isFinite(value)) return '-'
    try {
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
    } catch {
      return `R$ ${value.toFixed(2)}`
    }
  }

  const selectedSerie = useMemo(() => {
    return (series || []).find(s => s.id === seriesId) || null
  }, [series, seriesId])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Seleção de Série e Turno</CardTitle>
            <CardDescription>
              Escolha a série e o turno para a matrícula do próximo ano
            </CardDescription>
          </div>
          {escolaDb && (
            <Badge variant="outline" className="whitespace-nowrap">
              <School className="h-3.5 w-3.5 mr-1" /> {escolaDb}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Série */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Série do Próximo Ano</Label>
            {suggestedSeries && suggestedSeries.id !== seriesId && (
              <Badge variant="secondary" className="text-xs">
                Sugestão: {suggestedSeries.nome}
              </Badge>
            )}
          </div>
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando séries...
            </div>
          ) : isError ? (
            <Alert variant="destructive">
              <AlertDescription>
                Não foi possível carregar as séries desta escola.
              </AlertDescription>
            </Alert>
          ) : (
            <Select value={seriesId ?? undefined} onValueChange={(v) => setSeriesId(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a série" />
              </SelectTrigger>
              <SelectContent>
                {(series || []).map((s: SerieOption) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {/* Valores da série selecionada */}
          {selectedSerie && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3 text-sm">
              <div className="rounded-md border p-3">
                <div className="text-muted-foreground">Mensalidade c/ material</div>
                <div className="font-medium">{formatCurrency(selectedSerie.valor_mensal_com_material ?? null)}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-muted-foreground">Apenas material</div>
                <div className="font-medium">{formatCurrency(selectedSerie.valor_material ?? null)}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-muted-foreground">Mensalidade s/ material</div>
                <div className="font-medium">{formatCurrency(selectedSerie.valor_mensal_sem_material ?? null)}</div>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Turno */}
        <div className="space-y-2">
          <Label>Turno</Label>
          <RadioGroup
            className="grid grid-cols-1 md:grid-cols-3 gap-3"
            value={shift ?? undefined}
            onValueChange={(v) => setShift(v as Shift)}
          >
            {(['morning','afternoon','night'] as Shift[]).map((opt) => (
              <div key={opt} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50">
                <RadioGroupItem id={`turno-${opt}`} value={opt} />
                <Label htmlFor={`turno-${opt}`} className="cursor-pointer flex-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{formatShift(opt)}</span>
                    </div>
                    {previousShift === opt && (
                      <Badge variant="outline" className="text-xs">Mesmo turno</Badge>
                    )}
                  </div>
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        {(previousSeriesName || previousShift) && (seriesId && shift) && (
          <>
            <Separator />
            <div className="rounded-lg bg-primary/5 border-2 border-primary/20 p-4 text-sm">
              <div className="flex items-center gap-2 mb-2">
                <ArrowRight className="h-4 w-4 text-primary" />
                <span className="font-medium">Resumo</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {previousSeriesName && (
                  <div>
                    <span className="text-muted-foreground">Série anterior: </span>
                    <span className="font-medium">{previousSeriesName}</span>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Turno selecionado: </span>
                  <span className="font-medium">{formatShift(shift)}</span>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
