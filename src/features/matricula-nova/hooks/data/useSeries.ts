import { useQuery } from '@tanstack/react-query'
import { SeriesApiService } from '../../services/api/series'
import type { DatabaseSeries } from '../../types/api'
import type { SelectOption } from '../../types/forms'
// Emergency fix: Importar hooks do admin para dados reais
import { usePublicSeries } from '@/features/admin/hooks/useSeries'

/**
 * Hook para buscar todas as séries ativas
 * EMERGENCY FIX: Tenta usar dados reais do admin, fallback para mock
 * FASE 2.2B: Filtro por escola
 */
export function useSeries(escola?: 'pelicano' | 'sete_setembro') {
  console.log('🔍 [useSeries] Hook chamado com escola:', escola)
  
  // Tenta usar dados reais primeiro
  const adminData = usePublicSeries()
  console.log('📊 [useSeries] Admin data:', {
    isLoading: adminData.isLoading,
    error: adminData.error,
    dataLength: adminData.data?.length || 0,
    escola: escola
  })
  
  // Fallback para dados mockados se admin não funcionar
  const mockData = useQuery({
    queryKey: ['series', 'active', escola], // Incluir escola na query key
    queryFn: SeriesApiService.getActiveSeries,
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: 3,
    refetchOnWindowFocus: false,
    enabled: !adminData.data, // Só usa mock se admin falhar
    meta: {
      errorMessage: 'Erro ao carregar séries'
    }
  })
  console.log('🎭 [useSeries] Mock data:', {
    isLoading: mockData.isLoading,
    error: mockData.error,
    dataLength: mockData.data?.length || 0,
    enabled: !adminData.data
  })
  
  // Emergency fix: Retorna dados do admin se disponíveis, senão mock
  if (adminData.data) {
    console.log('✅ [useSeries] Usando dados do ADMIN')
    
    // Filtrar por escola se especificada
    let filteredData = adminData.data
    if (escola) {
      console.log('🏫 [useSeries] Filtrando por escola:', escola)
      
      filteredData = adminData.data.filter(serie => {
        // Mapear escola do admin para enum
        const serieEscola = serie.escola?.toLowerCase()
        console.log('🔎 [useSeries] Comparando:', {
          serieId: serie.id,
          serieNome: serie.nome,
          serieEscola: serieEscola,
          escolaSelecionada: escola
        })
        
        if (escola === 'pelicano') {
          return serieEscola?.includes('pelicano')
        } else if (escola === 'sete_setembro') {
          return serieEscola?.includes('sete de setembro') || serieEscola?.includes('instituto')
        }
        return false
      })
      
      console.log(`📚 [useSeries] ${filteredData.length} séries encontradas para ${escola}`)
    }
    
    // Adaptar dados filtrados do admin para formato esperado
    const adaptedData = filteredData.map(serie => {
      console.log('🔄 [useSeries] Adaptando série:', {
        id: serie.id,
        nome: serie.nome,
        valor_mensal_com_material: serie.valor_mensal_com_material,
        escola: serie.escola,
        ativo: serie.ativo
      })
      
      return {
        id: serie.id,
        nome: serie.nome,
        nivel: serie.ano_serie,
        value: serie.valor_mensal_com_material, // Campo crítico mapeado
        is_active: serie.ativo,
        // Campos extras do admin disponíveis via cast
        escola: serie.escola,
        valor_material: serie.valor_material,
        valor_mensal_sem_material: serie.valor_mensal_sem_material,
        valor_mensal_com_material: serie.valor_mensal_com_material
      } as any
    })
    
    console.log('✨ [useSeries] Dados adaptados e filtrados:', adaptedData)
    
    return {
      ...adminData,
      data: adaptedData
    }
  }
  
  console.log('🎭 [useSeries] Usando dados MOCK')
  return mockData
}

/**
 * Hook para buscar séries por nível educacional
 */
export function useSeriesByLevel(nivel: string) {
  return useQuery({
    queryKey: ['series', 'level', nivel],
    queryFn: () => SeriesApiService.getSeriesByLevel(nivel),
    enabled: !!nivel,
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: 3,
    meta: {
      errorMessage: `Erro ao carregar séries do nível ${nivel}`
    }
  })
}

/**
 * Hook para buscar uma série específica por ID
 */
export function useSeriesById(id: string) {
  return useQuery({
    queryKey: ['series', id],
    queryFn: () => SeriesApiService.getSeriesById(id),
    enabled: !!id,
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: 2,
    meta: {
      errorMessage: 'Erro ao carregar série'
    }
  })
}

/**
 * Hook para buscar níveis educacionais disponíveis
 */
export function useAvailableLevels() {
  return useQuery({
    queryKey: ['series', 'levels'],
    queryFn: SeriesApiService.getAvailableLevels,
    staleTime: 30 * 60 * 1000, // 30 minutos - níveis mudam muito raramente
    gcTime: 60 * 60 * 1000, // 1 hora
    retry: 3,
    meta: {
      errorMessage: 'Erro ao carregar níveis educacionais'
    }
  })
}

/**
 * Hook personalizado para séries organizadas e formatadas
 */
export function useSeriesFormatted() {
  const { data: allSeries, ...queryProps } = useSeries()

  // Agrupar séries por nível
  const seriesByLevel = allSeries?.reduce((acc, serie) => {
    const nivel = serie.nivel
    if (!acc[nivel]) {
      acc[nivel] = []
    }
    acc[nivel].push(serie)
    return acc
  }, {} as Record<string, DatabaseSeries[]>)

  // Converter para opções de select
  const seriesOptions: SelectOption[] = allSeries?.map(serie => ({
    value: serie.id,
    label: `${serie.nome} - R$ ${serie.value.toFixed(2)}`,
    disabled: false
  })) || []

  // Opções agrupadas por nível
  const seriesOptionsByLevel = Object.entries(seriesByLevel || {}).map(([nivel, series]) => ({
    level: nivel,
    options: series.map(serie => ({
      value: serie.id,
      label: `${serie.nome} - R$ ${serie.value.toFixed(2)}`,
      disabled: false
    }))
  }))

  return {
    ...queryProps,
    data: allSeries,
    seriesByLevel,
    seriesOptions,
    seriesOptionsByLevel
  }
}

/**
 * Hook para buscar séries com preço na faixa especificada
 */
export function useSeriesByPriceRange(minPrice: number, maxPrice: number) {
  const { data: allSeries, ...queryProps } = useSeries()

  const seriesInRange = allSeries?.filter(serie => 
    serie.value >= minPrice && serie.value <= maxPrice
  ) || []

  return {
    ...queryProps,
    data: seriesInRange,
    count: seriesInRange.length
  }
}

/**
 * Hook utilitário para informações de uma série específica
 */
export function useSeriesInfo(seriesId: string) {
  const { data: series } = useSeriesById(seriesId)
  
  if (!series) {
    return {
      series: null,
      price: 0,
      formattedPrice: 'R$ 0,00',
      level: '',
      name: ''
    }
  }

  return {
    series,
    price: series.value,
    formattedPrice: `R$ ${series.value.toFixed(2).replace('.', ',')}`,
    level: series.nivel,
    name: series.nome
  }
}

/**
 * Hook para buscar séries recomendadas baseado em idade
 */
export function useRecommendedSeries(birthDate: string) {
  const { data: allSeries } = useSeries()
  
  if (!birthDate || !allSeries) {
    return {
      data: [],
      recommendedLevel: null,
      age: 0
    }
  }

  // Calcular idade
  const today = new Date()
  const birth = new Date(birthDate)
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }

  // Determinar nível recomendado baseado na idade
  let recommendedLevel: string | null = null
  
  if (age >= 2 && age <= 5) {
    recommendedLevel = 'Infantil'
  } else if (age >= 6 && age <= 10) {
    recommendedLevel = 'Fundamental I'
  } else if (age >= 11 && age <= 14) {
    recommendedLevel = 'Fundamental II'
  } else if (age >= 15 && age <= 18) {
    recommendedLevel = 'Médio'
  }

  // Filtrar séries do nível recomendado
  const recommendedSeries = recommendedLevel 
    ? allSeries.filter(serie => serie.nivel === recommendedLevel)
    : []

  return {
    data: recommendedSeries,
    recommendedLevel,
    age
  }
}