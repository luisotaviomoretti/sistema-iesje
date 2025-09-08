import { useState, useCallback } from 'react'
import { CepApiService, type CepData } from '../../services/api/cep'
import { toast } from 'sonner'

export interface UseCepState {
  isLoading: boolean
  error: string | null
  data: CepData | null
}

export interface UseCepActions {
  searchCep: (cep: string) => Promise<CepData | null>
  clearData: () => void
  clearError: () => void
}

export interface UseCepReturn extends UseCepState, UseCepActions {}

/**
 * Hook para busca de CEP com gerenciamento de estado
 */
export function useCep(): UseCepReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<CepData | null>(null)

  const searchCep = useCallback(async (cep: string): Promise<CepData | null> => {
    // Validação básica
    if (!cep || cep.replace(/\D/g, '').length !== 8) {
      setError('CEP deve conter 8 dígitos')
      setData(null)
      return null
    }

    try {
      setIsLoading(true)
      setError(null)

      // Buscar CEP
      const result = await CepApiService.searchCepWithCache(cep)

      if (result.error) {
        setError(result.error)
        setData(null)
        toast.error(`Erro ao buscar CEP: ${result.error}`)
        return null
      }

      if (result.data) {
        setData(result.data)
        setError(null)
        toast.success('Endereço encontrado!')
        return result.data
      }

      return null

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao buscar CEP'
      setError(errorMessage)
      setData(null)
      toast.error(`Erro ao buscar CEP: ${errorMessage}`)
      return null

    } finally {
      setIsLoading(false)
    }
  }, [])

  const clearData = useCallback(() => {
    setData(null)
    setError(null)
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    // State
    isLoading,
    error,
    data,
    
    // Actions
    searchCep,
    clearData,
    clearError
  }
}

/**
 * Hook mais simples para busca única de CEP
 */
export function useCepSearch() {
  const [isLoading, setIsLoading] = useState(false)

  const searchCep = useCallback(async (cep: string): Promise<{ 
    success: boolean
    data?: CepData
    error?: string 
  }> => {
    if (!CepApiService.isValidCepFormat(cep)) {
      return { 
        success: false, 
        error: 'CEP deve conter 8 dígitos' 
      }
    }

    try {
      setIsLoading(true)
      const result = await CepApiService.searchCep(cep)

      if (result.error) {
        return { 
          success: false, 
          error: result.error 
        }
      }

      return { 
        success: true, 
        data: result.data! 
      }

    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    searchCep,
    isLoading
  }
}