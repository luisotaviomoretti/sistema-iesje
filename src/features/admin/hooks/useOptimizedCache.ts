import { useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

// =============================================================================
// SISTEMA DE CACHE OTIMIZADO PARA ENROLLMENT
// =============================================================================

/**
 * Interface para configurações de cache
 */
interface CacheConfig {
  staleTime?: number
  gcTime?: number
  refetchOnWindowFocus?: boolean
  refetchOnMount?: boolean
  retry?: boolean | number
}

/**
 * Configurações de cache otimizadas para diferentes tipos de dados
 */
export const CACHE_CONFIGS = {
  // Dados que mudam raramente (configurações, tipos de desconto)
  STATIC_DATA: {
    staleTime: 15 * 60 * 1000, // 15 minutos
    gcTime: 60 * 60 * 1000,    // 1 hora
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 3,
  } as CacheConfig,

  // Dados que mudam ocasionalmente (séries, CEP ranges)
  SEMI_STATIC_DATA: {
    staleTime: 10 * 60 * 1000, // 10 minutos
    gcTime: 30 * 60 * 1000,    // 30 minutos
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 2,
  } as CacheConfig,

  // Dados dinâmicos (classificação de CEP, configurações do sistema)
  DYNAMIC_DATA: {
    staleTime: 5 * 60 * 1000,  // 5 minutos
    gcTime: 15 * 60 * 1000,    // 15 minutos
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    retry: 1,
  } as CacheConfig,

  // Dados em tempo real (statísticas, dashboards)
  REALTIME_DATA: {
    staleTime: 1 * 60 * 1000,  // 1 minuto
    gcTime: 5 * 60 * 1000,     // 5 minutos
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    retry: 1,
  } as CacheConfig,
} as const

/**
 * Hook para pré-carregar dados críticos do enrollment
 */
export const usePreloadEnrollmentData = () => {
  const queryClient = useQueryClient()
  const [isPreloading, setIsPreloading] = useState(false)
  const [preloadStatus, setPreloadStatus] = useState<{
    discountTypes: boolean
    series: boolean
    cepClassification: boolean
    systemConfig: boolean
  }>({
    discountTypes: false,
    series: false,
    cepClassification: false,
    systemConfig: false,
  })

  const preloadData = async () => {
    setIsPreloading(true)
    try {
      // Pré-carregamento paralelo de dados críticos
      await Promise.allSettled([
        // Tipos de desconto
        queryClient.prefetchQuery({
          queryKey: ['public-discount-types'],
          queryFn: async () => {
            // Import dinâmico para evitar circular dependency
            const { usePublicDiscountTypes } = await import('./useDiscountTypes')
            // Simular função de fetch - será substituída pela implementação real
            return []
          },
          ...CACHE_CONFIGS.STATIC_DATA,
        }).then(() => setPreloadStatus(prev => ({ ...prev, discountTypes: true }))),

        // Séries ativas
        queryClient.prefetchQuery({
          queryKey: ['public-series'],
          queryFn: async () => {
            const { usePublicSeries } = await import('./useSeries')
            return []
          },
          ...CACHE_CONFIGS.SEMI_STATIC_DATA,
        }).then(() => setPreloadStatus(prev => ({ ...prev, series: true }))),

        // Configurações do sistema
        queryClient.prefetchQuery({
          queryKey: ['enrollment-config'],
          queryFn: async () => {
            const { useEnrollmentConfig } = await import('./useEnrollmentConfig')
            return {}
          },
          ...CACHE_CONFIGS.DYNAMIC_DATA,
        }).then(() => setPreloadStatus(prev => ({ ...prev, systemConfig: true }))),
      ])
    } catch (error) {
      console.error('Erro no pré-carregamento:', error)
    } finally {
      setIsPreloading(false)
    }
  }

  return {
    isPreloading,
    preloadStatus,
    preloadData,
    totalPreloaded: Object.values(preloadStatus).filter(Boolean).length,
    totalItems: Object.keys(preloadStatus).length,
    preloadProgress: (Object.values(preloadStatus).filter(Boolean).length / Object.keys(preloadStatus).length) * 100,
  }
}

/**
 * Hook para loading states inteligentes
 */
export const useSmartLoading = (queries: UseQueryResult[]) => {
  const [loadingStates, setLoadingStates] = useState({
    initialLoading: true,
    dataLoading: false,
    backgroundRefetch: false,
    error: false,
  })

  useEffect(() => {
    const hasError = queries.some(q => q.error)
    const isInitialLoading = queries.some(q => q.isLoading && !q.data)
    const isBackgroundRefetch = queries.some(q => q.isFetching && q.data)
    const isDataLoading = queries.some(q => q.isLoading)

    setLoadingStates({
      initialLoading: isInitialLoading,
      dataLoading: isDataLoading,
      backgroundRefetch: isBackgroundRefetch,
      error: hasError,
    })
  }, [queries])

  return loadingStates
}

/**
 * Hook para cache warming (aquecimento de cache)
 */
export const useCacheWarming = () => {
  const queryClient = useQueryClient()

  const warmCache = async (routes: string[]) => {
    const warmingPromises = routes.map(route => {
      switch (route) {
        case 'discount-types':
          return queryClient.prefetchQuery({
            queryKey: ['public-discount-types'],
            queryFn: () => import('./useDiscountTypes').then(m => m.usePublicDiscountTypes),
            ...CACHE_CONFIGS.STATIC_DATA,
          })
          
        case 'series':
          return queryClient.prefetchQuery({
            queryKey: ['public-series'],
            queryFn: () => import('./useSeries').then(m => m.usePublicSeries),
            ...CACHE_CONFIGS.SEMI_STATIC_DATA,
          })

        case 'enrollment-config':
          return queryClient.prefetchQuery({
            queryKey: ['enrollment-config'],
            queryFn: () => import('./useEnrollmentConfig').then(m => m.useEnrollmentConfig),
            ...CACHE_CONFIGS.DYNAMIC_DATA,
          })

        default:
          return Promise.resolve()
      }
    })

    try {
      await Promise.allSettled(warmingPromises)
      console.log(`Cache warmed for routes: ${routes.join(', ')}`)
    } catch (error) {
      console.error('Cache warming failed:', error)
    }
  }

  const clearCache = (patterns: string[]) => {
    patterns.forEach(pattern => {
      queryClient.invalidateQueries({ 
        queryKey: [pattern],
        exact: false
      })
    })
  }

  const getCacheStats = () => {
    const cache = queryClient.getQueryCache()
    const queries = cache.getAll()
    
    return {
      totalQueries: queries.length,
      activeQueries: queries.filter(q => q.getObserversCount() > 0).length,
      staleQueries: queries.filter(q => q.isStale()).length,
      errorQueries: queries.filter(q => q.state.status === 'error').length,
      cacheSize: queries.reduce((size, q) => size + JSON.stringify(q.state.data || {}).length, 0),
    }
  }

  return {
    warmCache,
    clearCache,
    getCacheStats,
  }
}

/**
 * Hook para otimização automática de performance
 */
export const usePerformanceOptimization = () => {
  const queryClient = useQueryClient()
  const [performanceMetrics, setPerformanceMetrics] = useState({
    avgQueryTime: 0,
    cacheHitRate: 0,
    errorRate: 0,
  })

  useEffect(() => {
    const cache = queryClient.getQueryCache()
    const queries = cache.getAll()

    // Calcular métricas básicas
    const totalQueries = queries.length
    const errorQueries = queries.filter(q => q.state.status === 'error').length
    const successQueries = queries.filter(q => q.state.status === 'success').length

    setPerformanceMetrics({
      avgQueryTime: 0, // TODO: implementar medição de tempo
      cacheHitRate: totalQueries > 0 ? (successQueries / totalQueries) * 100 : 0,
      errorRate: totalQueries > 0 ? (errorQueries / totalQueries) * 100 : 0,
    })
  }, [queryClient])

  const optimizeCache = () => {
    // Remover queries antigas e não utilizadas
    queryClient.getQueryCache().clear()
    
    // Configurar garbage collection mais agressivo para dados antigos
    const cache = queryClient.getQueryCache()
    cache.getAll().forEach(query => {
      if (query.getObserversCount() === 0 && query.isStale()) {
        cache.remove(query)
      }
    })
  }

  return {
    performanceMetrics,
    optimizeCache,
    recommendOptimizations: () => {
      const recommendations = []
      
      if (performanceMetrics.cacheHitRate < 60) {
        recommendations.push('Considere aumentar staleTime para dados estáticos')
      }
      
      if (performanceMetrics.errorRate > 10) {
        recommendations.push('Verifique conectividade e tratamento de erros')
      }

      return recommendations
    },
  }
}

/**
 * Loading component inteligente
 */
export interface SmartLoadingProps {
  queries: UseQueryResult[]
  fallback?: React.ReactNode
  showProgress?: boolean
  showBackground?: boolean
}

export const SmartLoadingProvider: React.FC<SmartLoadingProps & { children: React.ReactNode }> = ({
  queries,
  fallback,
  showProgress = true,
  showBackground = false,
  children
}) => {
  const loadingStates = useSmartLoading(queries)
  
  if (loadingStates.initialLoading && fallback) {
    return <>{fallback}</>
  }

  if (loadingStates.backgroundRefetch && showBackground) {
    return (
      <div className="relative">
        {children}
        <div className="absolute top-2 right-2 z-50">
          <div className="animate-pulse bg-blue-500 text-white text-xs px-2 py-1 rounded">
            Atualizando...
          </div>
        </div>
      </div>
    )
  }

  if (loadingStates.error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md">
        <div className="text-red-800 text-sm">
          Erro ao carregar dados. Tentando reconectar...
        </div>
      </div>
    )
  }

  return <>{children}</>
}

/**
 * Hook para sincronização de dados entre admin e enrollment
 */
export const useDataSynchronization = () => {
  const queryClient = useQueryClient()

  const syncData = (dataType: 'discount-types' | 'series' | 'cep-ranges' | 'system-config') => {
    const keysToInvalidate = {
      'discount-types': ['discount-types', 'public-discount-types'],
      'series': ['series', 'public-series'],
      'cep-ranges': ['cep-ranges', 'cep-classification', 'public-cep-classification'],
      'system-config': ['system-configs', 'enrollment-config'],
    }

    const keys = keysToInvalidate[dataType] || []
    keys.forEach(key => {
      queryClient.invalidateQueries({ 
        queryKey: [key],
        exact: false 
      })
    })

    console.log(`Dados sincronizados: ${dataType}`)
  }

  const syncAllData = () => {
    queryClient.clear()
    console.log('Todos os dados foram sincronizados')
  }

  return {
    syncData,
    syncAllData,
  }
}