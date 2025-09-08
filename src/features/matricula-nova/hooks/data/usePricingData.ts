// Hook para buscar dados de preços integrado com o painel administrativo
// TODO: Integrar com tabela real de mensalidades quando criada

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface PricingData {
  valorMensalComMaterial: number
  valorMaterial: number
  valorMensalSemMaterial: number
  serie: string
  escola: string
}

/**
 * Hook para buscar dados de preços de uma série específica
 * Temporariamente usa dados mockados com estrutura para integração futura
 */
export function usePricingData(serieId?: string, escolaId?: string) {
  return useQuery({
    queryKey: ['pricing-data', serieId, escolaId],
    queryFn: async (): Promise<PricingData> => {
      // TODO: Quando a tabela de mensalidades for criada, substituir por:
      // const { data, error } = await supabase
      //   .from('mensalidades') 
      //   .select('*')
      //   .eq('serie_id', serieId)
      //   .eq('escola_id', escolaId)
      //   .single()
      
      // Por enquanto, retornar dados mockados mas realistas
      const mockData: PricingData = {
        valorMensalComMaterial: 850.00,
        valorMaterial: 120.00,
        valorMensalSemMaterial: 730.00, // 850 - 120
        serie: '1º Ano Ensino Médio',
        escola: 'Pelicano'
      }
      
      // Simular delay da API
      await new Promise(resolve => setTimeout(resolve, 500))
      
      return mockData
    },
    enabled: !!serieId && !!escolaId,
    staleTime: 10 * 60 * 1000, // 10 minutos
    gcTime: 30 * 60 * 1000, // 30 minutos
  })
}

/**
 * Hook para buscar configurações gerais de preços
 */
export function usePricingConfig() {
  return useQuery({
    queryKey: ['pricing-config'],
    queryFn: async () => {
      // TODO: Buscar do painel administrativo
      return {
        showMaterial: true,
        allowInstallments: true,
        discountOnFullPayment: 5, // 5% de desconto à vista
        materialIsOptional: false
      }
    },
    staleTime: 60 * 60 * 1000, // 1 hora
  })
}