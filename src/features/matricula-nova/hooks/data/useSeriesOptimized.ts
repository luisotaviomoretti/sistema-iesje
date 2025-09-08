import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { usePublicSeries } from '@/features/admin/hooks/useSeries'
import { SeriesApiService } from '../../services/api/series'
import type { DatabaseSeries } from '../../types/api'
import type { SelectOption } from '../../types/forms'

export function useSeries(escola?: 'pelicano' | 'sete_setembro') {
  const adminData = usePublicSeries()

  const mockData = useQuery({
    queryKey: ['series', 'active', escola],
    queryFn: SeriesApiService.getActiveSeries,
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: 3,
    refetchOnWindowFocus: false,
    enabled: !adminData.data,
    meta: { errorMessage: 'Erro ao carregar séries' }
  })

  const rawData = adminData.data
  const filteredData = useMemo(() => {
    if (!rawData) return undefined as any[] | undefined
    if (!escola) return rawData as any[]
    const target = escola === 'pelicano' ? 'pelicano' : 'sete de setembro'
    return (rawData as any[]).filter(serie => (serie.escola || '').toLowerCase().includes(target))
  }, [rawData, escola])

  const adaptedData = useMemo(() => {
    const source = filteredData || []
    return source.map((serie: any) => ({
      id: serie.id,
      nome: serie.nome,
      nivel: serie.ano_serie,
      value: serie.valor_mensal_com_material,
      is_active: serie.ativo,
      escola: serie.escola,
      valor_material: serie.valor_material,
      valor_mensal_sem_material: serie.valor_mensal_sem_material,
      valor_mensal_com_material: serie.valor_mensal_com_material
    } as any))
  }, [filteredData])

  if (rawData) {
    return { ...adminData, data: adaptedData }
  }
  return mockData
}

export function useSeriesByLevel(nivel: string) {
  return useQuery({
    queryKey: ['series', 'level', nivel],
    queryFn: () => SeriesApiService.getSeriesByLevel(nivel),
    enabled: !!nivel,
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: 3,
    meta: { errorMessage: `Erro ao carregar séries do nível ${nivel}` }
  })
}

export function useSeriesById(id: string) {
  return useQuery({
    queryKey: ['series', id],
    queryFn: () => SeriesApiService.getSeriesById(id),
    enabled: !!id,
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: 2,
    meta: { errorMessage: 'Erro ao carregar série' }
  })
}

export function useAvailableLevels() {
  return useQuery({
    queryKey: ['series', 'levels'],
    queryFn: SeriesApiService.getAvailableLevels,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 3,
    meta: { errorMessage: 'Erro ao carregar níveis educacionais' }
  })
}

export function useSeriesFormatted() {
  const { data: allSeries, ...queryProps } = useSeries()

  const seriesByLevel = allSeries?.reduce((acc, serie) => {
    const nivel = (serie as any).nivel
    if (!acc[nivel]) acc[nivel] = []
    acc[nivel].push(serie as any)
    return acc
  }, {} as Record<string, DatabaseSeries[]>)

  const seriesOptions: SelectOption[] = (allSeries || []).map((serie: any) => ({
    value: serie.id,
    label: `${serie.nome} - R$ ${Number(serie.value).toFixed(2)}`,
    disabled: false
  }))

  const seriesOptionsByLevel = Object.entries(seriesByLevel || {}).map(([nivel, series]) => ({
    level: nivel,
    options: (series as any[]).map((serie: any) => ({
      value: serie.id,
      label: `${serie.nome} - R$ ${Number(serie.value).toFixed(2)}`,
      disabled: false
    }))
  }))

  return { ...queryProps, data: allSeries, seriesByLevel, seriesOptions, seriesOptionsByLevel }
}

export function useSeriesByPriceRange(minPrice: number, maxPrice: number) {
  const { data: allSeries, ...queryProps } = useSeries()
  const seriesInRange = (allSeries || []).filter((serie: any) => 
    Number(serie.value) >= minPrice && Number(serie.value) <= maxPrice
  )
  return { ...queryProps, data: seriesInRange, count: seriesInRange.length }
}

export function useSeriesInfo(seriesId: string) {
  const { data: series } = useSeriesById(seriesId)
  if (!series) {
    return { series: null, price: 0, formattedPrice: 'R$ 0,00', level: '', name: '' }
  }
  const price = (series as any).value
  return {
    series,
    price,
    formattedPrice: `R$ ${Number(price).toFixed(2).replace('.', ',')}`,
    level: (series as any).nivel,
    name: (series as any).nome
  }
}

export function useRecommendedSeries(birthDate: string) {
  const { data: allSeries } = useSeries()
  if (!birthDate || !allSeries) {
    return { data: [], recommendedLevel: null, age: 0 }
  }
  const today = new Date()
  const birth = new Date(birthDate)
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--

  let recommendedLevel: string | null = null
  if (age >= 2 && age <= 5) recommendedLevel = 'Infantil'
  else if (age >= 6 && age <= 10) recommendedLevel = 'Fundamental I'
  else if (age >= 11 && age <= 14) recommendedLevel = 'Fundamental II'
  else if (age >= 15 && age <= 18) recommendedLevel = 'Médio'

  const recommendedSeries = recommendedLevel ? (allSeries as any[]).filter(s => (s as any).nivel === recommendedLevel) : []
  return { data: recommendedSeries, recommendedLevel, age }
}
