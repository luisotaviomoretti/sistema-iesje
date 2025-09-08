/**
 * Hook para carregar dados do ano anterior
 * Busca informações do aluno para pré-preencher o formulário
 */

import { useState, useCallback } from 'react'
import { RematriculaData, PreviousYearResponse } from '../types'
import { MESSAGES } from '../constants'

interface UsePreviousYearDataReturn {
  loadData: (cpf: string, birthDateHint?: string) => Promise<PreviousYearResponse>
  isLoading: boolean
  data: RematriculaData | null
  error: string | null
  reset: () => void
}

export function usePreviousYearData(): UsePreviousYearDataReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [data, setData] = useState<RematriculaData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async (
    cpf: string, 
    birthDateHint?: string
  ): Promise<PreviousYearResponse> => {
    setIsLoading(true)
    setError(null)

    try {
      // TODO: Implementar chamada à Edge Function get_previous_year_student
      // Por enquanto, retorna mock
      await new Promise(resolve => setTimeout(resolve, 1500))

      const mockData: RematriculaData = {
        student: {
          name: 'João da Silva',
          cpf: cpf,
          birth_date: '2010-03-15',
          gender: 'M',
          escola: 'pelicano'
        },
        guardians: {
          guardian1: {
            name: 'Maria da Silva',
            cpf: '123.456.789-00',
            phone: '(75) 98888-8888',
            email: 'maria@email.com',
            relationship: 'mother'
          }
        },
        address: {
          cep: '44001-000',
          street: 'Rua Exemplo',
          number: '123',
          district: 'Centro',
          city: 'Feira de Santana',
          state: 'BA'
        },
        academic: {
          series_id: 'series-1',
          series_name: '1º Ano',
          track_id: 'track-1',
          track_name: 'Regular',
          shift: 'morning'
        },
        financial: {
          base_value: 1000,
          total_discount_percentage: 20,
          final_monthly_value: 800,
          applied_discounts: []
        }
      }

      setData(mockData)
      
      return {
        success: true,
        data: mockData
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar dados'
      setError(errorMessage)
      
      return {
        success: false,
        error: errorMessage
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setData(null)
    setError(null)
    setIsLoading(false)
  }, [])

  return {
    loadData,
    isLoading,
    data,
    error,
    reset
  }
}