import { useQuery, useQueryClient } from '@tanstack/react-query'
import { TracksApiService } from '../../services/api/tracks'
import type { DatabaseTrack } from '../../types/api'
import type { SelectOption } from '../../types/forms'
// Emergency fix: Importar hooks do admin para dados reais
import { usePublicTrilhos } from '@/features/admin/hooks/useTrilhos'

/**
 * Hook para buscar todos os trilhos de desconto ativos
 * EMERGENCY FIX: Tenta usar dados reais do admin, fallback para mock
 */
export function useTracks() {
  // Tenta usar dados reais primeiro
  const adminData = usePublicTrilhos()
  
  // Fallback para dados mockados se admin não funcionar
  const mockData = useQuery({
    queryKey: ['tracks', 'active'],
    queryFn: TracksApiService.getActiveTracks,
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: 3,
    refetchOnWindowFocus: false,
    enabled: !adminData.data, // Só usa mock se admin falhar
    meta: {
      errorMessage: 'Erro ao carregar trilhos de desconto'
    }
  })
  
  // Emergency fix: Retorna dados do admin se disponíveis, senão mock
  if (adminData.data) {
    console.log('=== useTracks Debug ===')
    console.log('Raw admin data:', adminData.data)
    
    // Adaptar dados do admin para formato esperado
    const adaptedData = adminData.data.map(trilho => {
      const adapted = {
        id: trilho.id,
        nome: trilho.nome,
        description: trilho.descricao || '',
        is_active: trilho.ativo,
        // Campos extras do admin disponíveis
        cap_maximo: trilho.cap_maximo,
        ordem_exibicao: trilho.ordem_exibicao
      } as any
      
      console.log(`Trilho adaptado: ${trilho.nome} - CAP: ${trilho.cap_maximo}%`)
      return adapted
    })
    
    console.log('Adapted data:', adaptedData)
    
    return {
      ...adminData,
      data: adaptedData
    }
  }
  
  return mockData
}

/**
 * Hook para forçar refresh dos trilhos
 * Útil quando precisamos atualizar dados após mudanças no painel administrativo
 */
export function useRefreshTracks() {
  const queryClient = useQueryClient()
  
  const refreshTracks = async () => {
    console.log('🔄 Forçando refresh COMPLETO dos trilhos...')
    try {
      // Remover dados do cache completamente
      queryClient.removeQueries({ queryKey: ['public-trilhos'] })
      queryClient.removeQueries({ queryKey: ['tracks'] })
      
      console.log('🗑️ Cache limpo completamente')
      
      // Invalidar e forçar refetch
      await queryClient.invalidateQueries({ queryKey: ['public-trilhos'] })
      await queryClient.invalidateQueries({ queryKey: ['tracks'] })
      
      // Forçar refetch imediato
      await queryClient.refetchQueries({ queryKey: ['public-trilhos'] })
      
      console.log('✅ Trilhos atualizados com sucesso! Dados frescos do banco.')
      return true
    } catch (error) {
      console.error('❌ Erro ao atualizar trilhos:', error)
      return false
    }
  }
  
  return { refreshTracks }
}

/**
 * Hook para buscar um trilho específico por ID
 */
export function useTrack(id: string) {
  return useQuery({
    queryKey: ['track', id],
    queryFn: () => TracksApiService.getTrackById(id),
    enabled: !!id,
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: 2,
    meta: {
      errorMessage: 'Erro ao carregar trilho'
    }
  })
}

/**
 * Hook para buscar regras de um trilho específico
 */
export function useTrackRules(trackId: string) {
  return useQuery({
    queryKey: ['track', trackId, 'rules'],
    queryFn: () => TracksApiService.getTrackRules(trackId),
    enabled: !!trackId,
    staleTime: 15 * 60 * 1000, // Regras mudam raramente
    gcTime: 30 * 60 * 1000,
    retry: 2,
    meta: {
      errorMessage: 'Erro ao carregar regras do trilho'
    }
  })
}

/**
 * Hook para validar compatibilidade entre trilho e descontos
 */
export function useTrackCompatibility(trackId: string, discountCategories: string[]) {
  return useQuery({
    queryKey: ['track', trackId, 'compatibility', discountCategories],
    queryFn: () => TracksApiService.validateTrackCompatibility(trackId, discountCategories),
    enabled: !!trackId && discountCategories.length > 0,
    staleTime: 5 * 60 * 1000, // Validação pode ser recalculada mais frequentemente
    gcTime: 10 * 60 * 1000,
    retry: 2,
    meta: {
      errorMessage: 'Erro ao validar compatibilidade do trilho'
    }
  })
}

/**
 * Hook para buscar configuração de CAPs atual
 */
export function useCurrentCaps() {
  return useQuery({
    queryKey: ['caps', 'current'],
    queryFn: TracksApiService.getCurrentCaps,
    staleTime: 30 * 60 * 1000, // CAPs mudam raramente
    gcTime: 60 * 60 * 1000, // 1 hora
    retry: 3,
    meta: {
      errorMessage: 'Erro ao carregar configuração de CAPs'
    }
  })
}

/**
 * Hook personalizado para trilhos formatados para exibição
 */
export function useTracksFormatted() {
  const { data: tracks, ...queryProps } = useTracks()

  // Converter para opções de select
  const trackOptions: SelectOption[] = tracks?.map(track => ({
    value: track.id,
    label: track.nome,
    disabled: false
  })) || []

  // Trilhos com informações extras formatadas
  const tracksWithDetails = tracks?.map(track => ({
    ...track,
    formattedName: track.nome,
    formattedDescription: track.description || 'Sem descrição disponível',
    type: track.metadata?.tipo || 'combinado',
    icon: track.metadata?.icone || '📋',
    color: track.metadata?.cor_primaria || '#6B7280',
    maxCap: track.metadata?.cap_maximo || 101,
    order: track.metadata?.ordem_exibicao || 999
  })) || []

  // Ordenar por ordem de exibição
  tracksWithDetails.sort((a, b) => a.order - b.order)

  return {
    ...queryProps,
    data: tracks,
    trackOptions,
    tracksWithDetails
  }
}

/**
 * Hook para recomendação de trilho baseado em descontos selecionados
 */
export function useRecommendedTrack(discountCodes: string[]) {
  const { data: tracks } = useTracks()
  
  if (!tracks || !discountCodes.length) {
    return {
      recommendedTrack: null,
      reason: 'Nenhum desconto selecionado'
    }
  }

  // Lógica de recomendação baseada nos códigos de desconto
  const hasEspecialDiscounts = discountCodes.some(code => 
    ['PASS', 'PBS', 'COL', 'SAE', 'ABI', 'ABP'].includes(code.toUpperCase())
  )
  
  const hasComercialDiscounts = discountCodes.some(code => 
    ['PAV', 'CEP'].includes(code.toUpperCase())
  )

  let recommendedTrack: DatabaseTrack | null = null
  let reason = ''

  if (hasEspecialDiscounts && !hasComercialDiscounts) {
    // Recomendar trilho especial
    recommendedTrack = tracks.find(track => 
      track.metadata?.tipo === 'especial'
    ) || null
    reason = 'Recomendado para descontos especiais selecionados'
    
  } else if (hasComercialDiscounts && !hasEspecialDiscounts) {
    // Recomendar trilho comercial
    recommendedTrack = tracks.find(track => 
      track.metadata?.tipo === 'comercial'
    ) || null
    reason = 'Recomendado para descontos comerciais selecionados'
    
  } else if (hasEspecialDiscounts && hasComercialDiscounts) {
    // Recomendar trilho combinado
    recommendedTrack = tracks.find(track => 
      track.metadata?.tipo === 'combinado'
    ) || null
    reason = 'Recomendado para combinação de descontos especiais e comerciais'
    
  } else {
    // Recomendar trilho combinado como padrão
    recommendedTrack = tracks.find(track => 
      track.metadata?.tipo === 'combinado'
    ) || tracks[0] || null
    reason = 'Trilho padrão para descontos regulares'
  }

  return {
    recommendedTrack,
    reason
  }
}

/**
 * Hook utilitário para informações detalhadas de um trilho
 */
export function useTrackInfo(trackId: string) {
  const { data: track } = useTrack(trackId)
  const { data: rules } = useTrackRules(trackId)
  const { data: caps } = useCurrentCaps()
  
  if (!track) {
    return {
      track: null,
      rules: [],
      maxCap: 0,
      type: null,
      canCombineWith: [],
      restrictions: []
    }
  }

  const maxCap = track.metadata?.cap_maximo || caps?.cap_without_secondary || 101
  const type = track.metadata?.tipo as 'especial' | 'combinado' | 'comercial'
  
  const canCombineWith = rules?.flatMap(rule => rule.pode_combinar_com || []) || []
  const restrictions = rules?.filter(rule => rule.restricao_especial)
    .map(rule => rule.restricao_especial) || []

  return {
    track,
    rules: rules || [],
    maxCap,
    type,
    canCombineWith,
    restrictions,
    formattedMaxCap: `${maxCap}%`,
    isSpecial: type === 'especial',
    isCommercial: type === 'comercial',
    isCombined: type === 'combinado'
  }
}

/**
 * Hook para validação rápida de trilho
 */
export function useTrackValidation(trackId: string, selectedDiscountPercentage: number) {
  const { maxCap } = useTrackInfo(trackId)
  
  const isValid = selectedDiscountPercentage <= maxCap
  const isNearLimit = selectedDiscountPercentage > (maxCap * 0.8) // 80% do limite
  const exceedsLimit = selectedDiscountPercentage > maxCap

  return {
    isValid,
    isNearLimit,
    exceedsLimit,
    maxCap,
    currentPercentage: selectedDiscountPercentage,
    remainingCap: Math.max(0, maxCap - selectedDiscountPercentage),
    validationMessage: exceedsLimit 
      ? `Desconto de ${selectedDiscountPercentage}% excede o limite de ${maxCap}% do trilho`
      : isNearLimit
      ? `Desconto próximo ao limite (${maxCap}%)`
      : 'Desconto dentro do limite permitido'
  }
}
