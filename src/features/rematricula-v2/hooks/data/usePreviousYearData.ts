/**
 * Hook para buscar dados do aluno do ano anterior
 * Integração direta com Edge Function via TanStack Query
 * Independente do useEnrollmentForm
 */

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { PreviousYearStudent } from '../../types/rematricula'

interface UsePreviousYearDataParams {
  cpf: string
  birthHint: string  // Formato: DD/MM
}

interface UsePreviousYearDataReturn {
  data: PreviousYearStudent | undefined
  isLoading: boolean
  isError: boolean
  error: Error | null
  refetch: () => void
  isFetching: boolean
  isSuccess: boolean
}

/**
 * Hook para buscar dados do aluno do ano anterior
 * 
 * @param cpf - CPF do aluno (com ou sem formatação)
 * @param birthHint - Data de nascimento parcial (DD/MM) para validação
 * @returns Dados do aluno do ano anterior e estados de loading/erro
 * 
 * @example
 * ```tsx
 * const { data, isLoading, error } = usePreviousYearData({
 *   cpf: '123.456.789-00',
 *   birthHint: '15/03'
 * })
 * ```
 */
export function usePreviousYearData({
  cpf,
  birthHint
}: UsePreviousYearDataParams): UsePreviousYearDataReturn {
  
  // Remove formatação do CPF para normalizar
  const normalizedCPF = cpf.replace(/\D/g, '')
  
  const query = useQuery({
    queryKey: ['rematricula-previous-data', normalizedCPF, birthHint],
    
    queryFn: async (): Promise<PreviousYearStudent> => {
      // Validação básica antes da chamada
      if (!normalizedCPF || normalizedCPF.length !== 11) {
        throw new Error('CPF inválido')
      }
      
      if (!birthHint || !birthHint.match(/^\d{2}\/\d{2}$/)) {
        throw new Error('Data de nascimento deve estar no formato DD/MM')
      }
      
      // Chamada direta ao Edge Function (sem dependências)
      const response = await supabase.functions.invoke('get_previous_year_student', {
        body: { 
          cpf: normalizedCPF, 
          birth_date_hint: birthHint 
        }
      })
      
      // Tratamento de erro da Edge Function
      if (response.error) {
        console.error('[usePreviousYearData] Edge Function error:', response.error)
        throw new Error(response.error.message || 'Erro ao buscar dados do ano anterior')
      }
      
      // Validação da resposta
      if (!response.data) {
        throw new Error('Nenhum dado retornado')
      }
      
      // Mapear resposta para o tipo PreviousYearStudent se necessário
      const mappedData: PreviousYearStudent = {
        student: {
          id: response.data.student?.id,
          name: response.data.student?.name || '',
          cpf: response.data.student?.cpf || normalizedCPF,
          rg: response.data.student?.rg,
          birth_date: response.data.student?.birth_date || '',
          gender: response.data.student?.gender || 'M',
          escola: response.data.student?.escola || 'pelicano'
        },
        academic: {
          series_id: response.data.academic?.series_id || '',
          series_name: response.data.academic?.series_name || '',
          track_id: response.data.academic?.track_id || '',
          track_name: response.data.academic?.track_name || '',
          shift: response.data.academic?.shift || 'morning'
        },
        guardians: response.data.guardians || {
          guardian1: {
            name: '',
            cpf: '',
            phone: '',
            email: '',
            relationship: ''
          }
        },
        address: response.data.address || {
          cep: '',
          street: '',
          number: '',
          district: '',
          city: '',
          state: 'BA'
        },
        financial: response.data.financial || {
          base_value: 0,
          total_discount_percentage: 0,
          final_monthly_value: 0,
          applied_discounts: []
        }
      }
      
      return mappedData
    },
    
    // Configurações da query
    enabled: Boolean(cpf && birthHint && normalizedCPF.length === 11),
    staleTime: 5 * 60 * 1000,  // Cache por 5 minutos
    gcTime: 10 * 60 * 1000,     // Manter no cache por 10 minutos (anteriormente cacheTime)
    retry: 1,                   // Tentar apenas 1 vez em caso de erro
    retryDelay: 1000,          // Aguardar 1 segundo antes de retry
    
    // Callbacks opcionais para logging em desenvolvimento
    onSuccess: (data) => {
      if (import.meta.env.DEV) {
        console.log('[usePreviousYearData] Success:', { 
          studentName: data.student.name,
          previousSeries: data.academic.series_name 
        })
      }
    },
    
    onError: (error) => {
      if (import.meta.env.DEV) {
        console.error('[usePreviousYearData] Error:', error)
      }
    }
  })
  
  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error as Error | null,
    refetch: query.refetch,
    isFetching: query.isFetching,
    isSuccess: query.isSuccess
  }
}