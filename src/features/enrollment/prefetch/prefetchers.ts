import { QueryClient } from '@tanstack/react-query'
import { supabase, type TipoDesconto } from '@/lib/supabase'

/**
 * Prefetch de tipos de desconto (dados públicos)
 * - Usa a mesma queryKey do hook usePublicDiscountTypes
 * - TTLs alinhados com o hook (staleTime 10min, gcTime 30min)
 * - Seguro: sempre retorna array vazio em caso de erro
 */
export async function prefetchDiscountTypes(queryClient: QueryClient): Promise<void> {
  try {
    await queryClient.prefetchQuery({
      queryKey: ['public-discount-types-v2'],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('tipos_desconto')
          .select('*')
          .order('codigo')

        if (error) {
          if (import.meta.env.DEV) {
            console.error('[prefetch] tipos_desconto error:', error)
          }
          return [] as TipoDesconto[]
        }

        return (data || []) as TipoDesconto[]
      },
      staleTime: 10 * 60 * 1000, // 10 minutos
      gcTime: 30 * 60 * 1000,    // 30 minutos
    })

    if (import.meta.env.DEV) {
      console.log('[prefetch] public-discount-types-v2 warmed')
    }
  } catch (e) {
    if (import.meta.env.DEV) {
      console.warn('[prefetch] prefetchDiscountTypes failed:', e)
    }
  }
}

/**
 * Prefetch de trilhos (dados públicos)
 * - QueryKey compatível com usePublicTrilhos: ['public-trilhos']
 * - TTLs alinhados ao hook público (staleTime 5s, gcTime 10s — conforme modo atual)
 * - Seguro: retorna [] em caso de erro
 */
export async function prefetchTracks(queryClient: QueryClient): Promise<void> {
  try {
    await queryClient.prefetchQuery({
      queryKey: ['public-trilhos'],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('trilhos_desconto')
          .select('*')
          .eq('ativo', true)
          .order('ordem_exibicao')

        if (error) {
          if (import.meta.env.DEV) {
            console.error('[prefetch] trilhos error:', error)
          }
          return []
        }
        return data || []
      },
      staleTime: 5 * 1000,
      gcTime: 10 * 1000,
    })

    if (import.meta.env.DEV) {
      console.log('[prefetch] public-trilhos warmed')
    }
  } catch (e) {
    if (import.meta.env.DEV) {
      console.warn('[prefetch] prefetchTracks failed:', e)
    }
  }
}

/**
 * Prefetch de séries (dados públicos)
 * - QueryKey compatível com usePublicSeries: ['public-series', escola, includeInactive]
 * - TTLs alinhados ao hook público (staleTime 5min, gcTime 10min)
 * - Seguro: erros não interrompem o fluxo
 */
export async function prefetchSeries(
  queryClient: QueryClient,
  escola?: 'Sete de Setembro' | 'Pelicano',
  includeInactive = false,
): Promise<void> {
  try {
    await queryClient.prefetchQuery({
      queryKey: ['public-series', escola, includeInactive],
      queryFn: async () => {
        let query = supabase
          .from('series')
          .select('*')
          .order('escola', { ascending: true })
          .order('ordem', { ascending: true })

        if (!includeInactive) {
          query = query.eq('ativo', true)
        }

        if (escola) {
          query = query.eq('escola', escola)
        }

        const { data, error } = await query
        if (error) {
          if (import.meta.env.DEV) {
            console.error('[prefetch] series error:', error)
          }
          return []
        }
        return data || []
      },
      staleTime: 5 * 60 * 1000,  // 5 minutos
      gcTime: 10 * 60 * 1000,    // 10 minutos
    })

    if (import.meta.env.DEV) {
      const scope = escola ? `(${escola})` : '(todas)'
      console.log(`[prefetch] public-series warmed ${scope}`)
    }
  } catch (e) {
    if (import.meta.env.DEV) {
      console.warn('[prefetch] prefetchSeries failed:', e)
    }
  }
}
