import { useEffect, useMemo, useRef, useState } from 'react'
import { useSeries } from '@/features/matricula-nova/hooks/data/useSeriesOptimized'
import { useTracks } from '@/features/matricula-nova/hooks/data/useTracks'
import type { UseFormReturn } from 'react-hook-form'
import type { EnrollmentFormData } from '@/features/matricula-nova/types/forms'
import { getNextSeriesRecommendation } from '../utils/progression'

interface PreviousAcademicInfo {
  previousSeriesId: string
  previousSeriesName: string
  previousTrackId: string
  previousTrackName: string
  shift: 'morning' | 'afternoon' | 'night'
}

export function useAcademicProgression(
  form: UseFormReturn<EnrollmentFormData>,
  previous: PreviousAcademicInfo | null | undefined,
  escola?: 'pelicano' | 'sete_setembro'
) {
  const [warnings, setWarnings] = useState<string[]>([])
  const { data: seriesList } = useSeries(escola)
  const { data: tracksList } = useTracks()
  const initializedRef = useRef(false)

  const recommended = useMemo(() => {
    if (!seriesList?.length || !previous?.previousSeriesName) return { recommendedId: null, recommendedName: null, reason: 'Sem séries', confidence: 0 }
    return getNextSeriesRecommendation(previous.previousSeriesName, seriesList as any)
  }, [seriesList, previous?.previousSeriesName])

  // Initialize defaults once when data is available
  useEffect(() => {
    if (initializedRef.current) return
    if (!previous) return
    const seriesCount = Array.isArray(seriesList) ? seriesList.length : 0
    if (seriesCount === 0) return
    // Fase 1A: contenção — não aplicar valores automaticamente; apenas recomendar
    const w: string[] = []
    if (!recommended.recommendedId) {
      w.push('Não foi possível sugerir automaticamente a série. Selecione manualmente.')
    }
    setWarnings(w)
    initializedRef.current = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previous?.previousSeriesName, Array.isArray(seriesList) ? seriesList.length : 0, recommended.recommendedId])

  return {
    recommended,
    seriesList,
    tracksList,
    warnings,
  }
}
