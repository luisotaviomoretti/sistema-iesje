import { useQueries } from '@tanstack/react-query'
import { supabase, type TipoDesconto, type TrilhoDesconto, type RegraTrilho } from '@/lib/supabase'

export interface DiscountConfigResult {
  trilhos: TrilhoDesconto[]
  regras: RegraTrilho[]
  tipos: TipoDesconto[]
  isLoading: boolean
  isError: boolean
}

export function useDiscountConfig(): DiscountConfigResult {
  const results = useQueries({
    queries: [
      {
        queryKey: ['rematricula-discount-trilhos'],
        queryFn: async () => {
          const { data, error } = await supabase
            .from('trilhos_desconto')
            .select('*')
            .eq('ativo', true)
            .in('nome', ['especial', 'combinado'])
            .order('ordem_exibicao', { ascending: true })
          if (error) throw new Error(error.message)
          return (data || []) as TrilhoDesconto[]
        },
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
      },
      {
        queryKey: ['rematricula-discount-regras'],
        queryFn: async () => {
          const { data, error } = await supabase
            .from('regras_trilhos')
            .select('*')
          if (error) throw new Error(error.message)
          return (data || []) as RegraTrilho[]
        },
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
      },
      {
        queryKey: ['rematricula-discount-tipos'],
        queryFn: async () => {
          const { data, error } = await supabase
            .from('tipos_desconto')
            .select('*')
            .eq('ativo', true)
          if (error) throw new Error(error.message)
          return (data || []) as TipoDesconto[]
        },
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
      },
    ]
  })

  const trilhos = results[0].data as TrilhoDesconto[] | undefined
  const regras = results[1].data as RegraTrilho[] | undefined
  const tipos = results[2].data as TipoDesconto[] | undefined

  const isLoading = results.some(r => r.isLoading)
  const isError = results.some(r => r.isError)

  return {
    trilhos: trilhos || [],
    regras: regras || [],
    tipos: tipos || [],
    isLoading,
    isError,
  }
}

