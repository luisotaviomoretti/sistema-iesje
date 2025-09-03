import { useQuery } from '@tanstack/react-query'
import { supabase, type TrilhoComRegras } from '@/lib/supabase'

// ============================================================================
// HOOKS PARA TRILHOS DE DESCONTO (PÚBLICO)
// ============================================================================

/**
 * Hook para buscar trilhos disponíveis para o sistema de matrícula
 * Baseado no design document - seção 2.1
 */
export const useDiscountTracks = () => {
  return useQuery({
    queryKey: ['discount-tracks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trilhos_desconto')
        .select(`
          *,
          regras:regras_trilhos(
            categoria_permitida,
            pode_combinar_com,
            prioridade,
            restricao_especial
          )
        `)
        .eq('ativo', true)
        .order('ordem_exibicao')
      
      if (error) {
        console.error('Erro ao buscar trilhos de desconto:', error)
        throw new Error(error.message)
      }
      
      return data as TrilhoComRegras[]
    },
    staleTime: 10 * 60 * 1000, // 10 minutos
    gcTime: 30 * 60 * 1000, // 30 minutos
  })
}

/**
 * Hook para buscar compatibilidade de um trilho específico
 * Baseado no design document - seção 2.1
 */
export const useTrackCompatibility = (trackId: string | undefined) => {
  return useQuery({
    queryKey: ['track-compatibility', trackId],
    queryFn: async () => {
      if (!trackId) return []
      
      const { data, error } = await supabase
        .from('regras_trilhos')
        .select('*')
        .eq('trilho_id', trackId)
        .order('prioridade')
      
      if (error) {
        console.error('Erro ao buscar compatibilidade do trilho:', error)
        throw new Error(error.message)
      }
      
      return data
    },
    enabled: !!trackId,
    staleTime: 15 * 60 * 1000, // 15 minutos
  })
}

/**
 * Hook para buscar configurações de caps vigentes
 * Baseado no design document - seção 2.1
 */
export const useCapLimits = () => {
  return useQuery({
    queryKey: ['cap-limits'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('config_caps')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single()
      
      if (error) {
        console.error('Erro ao buscar limites de cap:', error)
        throw new Error(error.message)
      }
      
      return data
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  })
}

/**
 * Hook para buscar trilho por nome
 */
export const useDiscountTrack = (trackName: string | undefined) => {
  return useQuery({
    queryKey: ['discount-track', trackName],
    queryFn: async () => {
      if (!trackName) return null
      
      const { data, error } = await supabase
        .from('trilhos_desconto')
        .select(`
          *,
          regras:regras_trilhos(
            categoria_permitida,
            pode_combinar_com,
            prioridade,
            restricao_especial
          )
        `)
        .eq('nome', trackName)
        .eq('ativo', true)
        .single()
      
      if (error) {
        if (error.code === 'PGRST116') { // Not found
          return null
        }
        console.error('Erro ao buscar trilho específico:', error)
        throw new Error(error.message)
      }
      
      return data as TrilhoComRegras
    },
    enabled: !!trackName,
    staleTime: 10 * 60 * 1000, // 10 minutos
  })
}

/**
 * Hook para estatísticas dos trilhos (para exibição)
 */
export const useTrackStats = () => {
  return useQuery({
    queryKey: ['track-stats'],
    queryFn: async () => {
      // Buscar estatísticas básicas dos trilhos
      const { data: trilhos, error: trilhosError } = await supabase
        .from('trilhos_desconto')
        .select('id, nome, titulo, cap_maximo')
        .eq('ativo', true)
        .order('ordem_exibicao')
      
      if (trilhosError) {
        throw new Error(trilhosError.message)
      }
      
      // Buscar contagem de regras por trilho
      const stats = await Promise.all(
        trilhos.map(async (trilho) => {
          const { count, error: countError } = await supabase
            .from('regras_trilhos')
            .select('*', { count: 'exact', head: true })
            .eq('trilho_id', trilho.id)
          
          if (countError) {
            console.warn(`Erro ao contar regras para trilho ${trilho.nome}:`, countError)
          }
          
          return {
            ...trilho,
            total_regras: count || 0
          }
        })
      )
      
      return stats
    },
    staleTime: 15 * 60 * 1000, // 15 minutos
    gcTime: 30 * 60 * 1000, // 30 minutos
  })
}

// ============================================================================
// HOOKS DE UTILIDADE
// ============================================================================

/**
 * Hook para ordenar trilhos por prioridade de sugestão
 */
export const useOrderedTracks = () => {
  const { data: tracks, ...rest } = useDiscountTracks()
  
  const orderedTracks = tracks?.sort((a, b) => {
    // Ordem de prioridade: especial > combinado > comercial
    const ordem = { especial: 1, combinado: 2, comercial: 3 }
    return ordem[a.nome] - ordem[b.nome]
  })
  
  return {
    data: orderedTracks,
    ...rest
  }
}

/**
 * Hook para trilhos com exemplos de desconto
 */
export const useTracksWithExamples = () => {
  const { data: tracks, ...rest } = useDiscountTracks()
  
  const tracksWithExamples = tracks?.map(track => {
    let exemplos: string[] = []
    
    switch (track.nome) {
      case 'especial':
        exemplos = ['PASS - 100%', 'PBS - 40%', 'COL - 50%', 'ABI - 100%']
        break
      case 'combinado':
        exemplos = ['IIR - 10%', 'RES - 20%', 'PAV - 15%', 'CEP10 - 10%']
        break
      case 'comercial':
        exemplos = ['CEP10 - 10%', 'CEP5 - 5%', 'ADIM2 - 2%', 'Negociação']
        break
    }
    
    return {
      ...track,
      exemplos_desconto: exemplos
    }
  })
  
  return {
    data: tracksWithExamples,
    ...rest
  }
}

/**
 * Hook para verificar se trilho está disponível
 */
export const useTrackAvailability = (trackName: string | undefined) => {
  const { data: tracks, isLoading } = useDiscountTracks()
  
  if (isLoading || !trackName) {
    return { available: false, loading: isLoading }
  }
  
  const track = tracks?.find(t => t.nome === trackName)
  
  return {
    available: !!track,
    loading: false,
    track: track || null
  }
}