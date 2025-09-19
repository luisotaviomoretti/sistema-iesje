import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

export interface Serie {
  id: string
  nome: string
  ano_serie: string
  valor_mensal_com_material: number
  valor_material: number
  valor_mensal_sem_material: number
  // Novos campos (F1): valores anuais no banco
  valor_anual_com_material?: number | null
  valor_anual_material?: number | null
  valor_anual_sem_material?: number | null
  ordem: number
  escola: 'Sete de Setembro' | 'Pelicano'
  ativo: boolean
  created_at: string
  updated_at: string
}

// Helpers de normalização (Supabase pode devolver NUMERIC como string)
function toNumOrNull(v: any): number | null {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function normalizeAnnualFields<T extends Record<string, any>>(row: T): T {
  return {
    ...row,
    valor_anual_com_material: toNumOrNull((row as any).valor_anual_com_material),
    valor_anual_material: toNumOrNull((row as any).valor_anual_material),
    valor_anual_sem_material: toNumOrNull((row as any).valor_anual_sem_material),
  }
}

// Hook para buscar todas as séries
export const useSeries = (includeInactive = false) => {
  return useQuery({
    queryKey: ['series', includeInactive],
    queryFn: async (): Promise<Serie[]> => {
      let query = supabase
        .from('series')
        .select('*')
        .order('escola', { ascending: true })
        .order('ordem', { ascending: true })

      if (!includeInactive) {
        query = query.eq('ativo', true)
      }

      const { data, error } = await query

      if (error) {
        console.error('Erro ao buscar séries:', error)
        throw new Error(error.message)
      }

      const rows = (data || []) as any[]
      return rows.map((r) => normalizeAnnualFields(r))
    },
    staleTime: 2 * 60 * 1000, // 2 minutos
  })
}

// Hook para criar nova série
export const useCreateSerie = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (serieData: Omit<Serie, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('series')
        .insert(serieData)
        .select()
        .single()
      
      if (error) {
        console.error('Erro ao criar série:', error)
        throw new Error(error.message)
      }
      
      return data as Serie
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['series'] })
      toast.success('Série criada com sucesso!')
    },
    onError: (error) => {
      console.error('Erro na criação da série:', error)
      toast.error('Erro ao criar série')
    },
  })
}

// Hook para atualizar série
export const useUpdateSerie = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<Omit<Serie, 'id' | 'created_at' | 'updated_at'>>) => {
      const { data, error } = await supabase
        .from('series')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()
      
      if (error) {
        console.error('Erro ao atualizar série:', error)
        throw new Error(error.message)
      }
      
      return data as Serie
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['series'] })
      toast.success('Série atualizada com sucesso!')
    },
    onError: (error) => {
      console.error('Erro na atualização da série:', error)
      toast.error('Erro ao atualizar série')
    },
  })
}

// Hook para excluir série
export const useDeleteSerie = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string) => {
      // Soft delete - marcar como inativo
      const { error } = await supabase
        .from('series')
        .update({ 
          ativo: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
      
      if (error) {
        console.error('Erro ao desativar série:', error)
        throw new Error(error.message)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['series'] })
      toast.success('Série desativada com sucesso!')
    },
    onError: (error) => {
      console.error('Erro ao desativar série:', error)
      toast.error('Erro ao desativar série')
    },
  })
}

// Hook para ativar série
export const useActivateSerie = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('series')
        .update({ 
          ativo: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
      
      if (error) {
        console.error('Erro ao ativar série:', error)
        throw new Error(error.message)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['series'] })
      toast.success('Série ativada com sucesso!')
    },
    onError: (error) => {
      console.error('Erro ao ativar série:', error)
      toast.error('Erro ao ativar série')
    },
  })
}

// Função utilitária para formatar valor monetário
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

// Função utilitária para calcular valor anual
export const calculateAnnualValue = (monthlyValue: number): number => {
  return monthlyValue * 12
}

// Constantes para escolas
export const ESCOLAS = ['Sete de Setembro', 'Pelicano'] as const
export type EscolaType = typeof ESCOLAS[number]

// Função utilitária para obter cor da escola
export const getEscolaColor = (escola: string): string => {
  switch (escola) {
    case 'Sete de Setembro':
      return 'bg-blue-100 text-blue-800'
    case 'Pelicano':
      return 'bg-green-100 text-green-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

// =============================================================================
// HOOKS PÚBLICOS PARA SISTEMA DE MATRÍCULA
// =============================================================================

/**
 * Hook público para buscar séries ativas - otimizado para o sistema de matrícula
 * @param escola - Filtrar por escola específica (opcional)
 * @param includeInactive - Incluir séries inativas (padrão: false)
 */
export const usePublicSeries = (escola?: EscolaType, includeInactive = false) => {
  return useQuery({
    queryKey: ['public-series', escola, includeInactive],
    queryFn: async (): Promise<Serie[]> => {
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
        console.error('Erro ao buscar séries públicas:', error)
        throw new Error(error.message)
      }

      const rows = (data || []) as any[]
      return rows.map((r) => normalizeAnnualFields(r))
    },
    staleTime: 5 * 60 * 1000, // 5 minutos - cache mais longo para uso público
    gcTime: 10 * 60 * 1000, // 10 minutos no cache
  })
}

/**
 * Função utilitária para encontrar série por ano/nome
 */
export const findSerieByYear = (series: Serie[], anoSerie: string): Serie | undefined => {
  return series.find(s => 
    s.ano_serie === anoSerie || 
    s.nome.includes(anoSerie) ||
    anoSerie.includes(s.ano_serie)
  )
}

/**
 * Função utilitária para obter valor base de uma série
 */
export const getSerieBaseValue = (series: Serie[], anoSerie: string): number => {
  const serie = findSerieByYear(series, anoSerie)
  return serie?.valor_mensal_com_material || 0
}

/**
 * Função utilitária para calcular próxima série (progressão)
 */
export const getNextSerie = (series: Serie[], currentAnoSerie: string): Serie | undefined => {
  const currentSerie = findSerieByYear(series, currentAnoSerie)
  if (!currentSerie) return undefined

  // Buscar próxima série na mesma escola com ordem seguinte
  return series.find(s => 
    s.escola === currentSerie.escola && 
    s.ordem === currentSerie.ordem + 1 &&
    s.ativo
  )
}