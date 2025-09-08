import type { ApiResponse } from '../../types/api'

export interface CepData {
  cep: string
  logradouro: string
  complemento?: string
  bairro: string
  localidade: string
  uf: string
  ibge?: string
  gia?: string
  ddd?: string
  siafi?: string
  erro?: boolean
}

export class CepApiService {
  private static readonly VIACEP_BASE_URL = 'https://viacep.com.br/ws'
  private static readonly REQUEST_TIMEOUT = 10000 // 10 segundos

  /**
   * Busca informações de endereço pelo CEP usando ViaCEP
   */
  static async searchCep(cep: string): Promise<ApiResponse<CepData>> {
    try {
      // Limpar e validar CEP
      const cleanCep = cep.replace(/\D/g, '')
      
      if (cleanCep.length !== 8) {
        return {
          data: null,
          error: 'CEP deve conter 8 dígitos'
        }
      }

      // Fazer requisição para ViaCEP
      const response = await fetch(
        `${CepApiService.VIACEP_BASE_URL}/${cleanCep}/json/`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          signal: AbortSignal.timeout(CepApiService.REQUEST_TIMEOUT)
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data: CepData = await response.json()

      // Verificar se o CEP foi encontrado
      if (data.erro) {
        return {
          data: null,
          error: 'CEP não encontrado'
        }
      }

      // Validar se retornou dados essenciais
      if (!data.logradouro || !data.bairro || !data.localidade || !data.uf) {
        return {
          data: null,
          error: 'Dados incompletos retornados pelo serviço de CEP'
        }
      }

      return {
        data: data,
        error: null
      }

    } catch (error) {
      console.error('Error fetching CEP:', error)

      // Tratar diferentes tipos de erro
      if (error instanceof TypeError && error.message.includes('fetch')) {
        return {
          data: null,
          error: 'Erro de conexão. Verifique sua internet e tente novamente.'
        }
      }

      if (error instanceof Error && error.name === 'AbortError') {
        return {
          data: null,
          error: 'Tempo limite excedido. Tente novamente.'
        }
      }

      return {
        data: null,
        error: 'Erro ao buscar CEP. Tente novamente.'
      }
    }
  }

  /**
   * Busca múltiplos CEPs em paralelo (útil para validações)
   */
  static async searchMultipleCeps(ceps: string[]): Promise<Record<string, CepData | null>> {
    const results: Record<string, CepData | null> = {}

    const promises = ceps.map(async (cep) => {
      const result = await CepApiService.searchCep(cep)
      return { cep, data: result.data }
    })

    const responses = await Promise.allSettled(promises)

    responses.forEach((response, index) => {
      const cep = ceps[index]
      if (response.status === 'fulfilled') {
        results[cep] = response.value.data
      } else {
        results[cep] = null
      }
    })

    return results
  }

  /**
   * Valida formato de CEP
   */
  static isValidCepFormat(cep: string): boolean {
    const cleanCep = cep.replace(/\D/g, '')
    return cleanCep.length === 8 && /^\d{8}$/.test(cleanCep)
  }

  /**
   * Formata CEP para exibição (00000-000)
   */
  static formatCep(cep: string): string {
    const cleanCep = cep.replace(/\D/g, '')
    if (cleanCep.length <= 5) return cleanCep
    return `${cleanCep.slice(0, 5)}-${cleanCep.slice(5, 8)}`
  }

  /**
   * Remove formatação do CEP
   */
  static cleanCep(cep: string): string {
    return cep.replace(/\D/g, '')
  }

  /**
   * Verifica se um CEP está em uma região específica (por UF)
   */
  static async checkCepRegion(cep: string, expectedUf: string): Promise<boolean> {
    try {
      const result = await CepApiService.searchCep(cep)
      return result.data?.uf.toLowerCase() === expectedUf.toLowerCase()
    } catch {
      return false
    }
  }

  /**
   * Cache simples de CEPs para evitar requisições desnecessárias
   */
  private static cepCache = new Map<string, { data: CepData | null; timestamp: number }>()
  private static readonly CACHE_DURATION = 5 * 60 * 1000 // 5 minutos

  /**
   * Busca CEP com cache
   */
  static async searchCepWithCache(cep: string): Promise<ApiResponse<CepData>> {
    const cleanCep = cep.replace(/\D/g, '')
    const now = Date.now()

    // Verificar cache
    const cached = CepApiService.cepCache.get(cleanCep)
    if (cached && (now - cached.timestamp) < CepApiService.CACHE_DURATION) {
      return {
        data: cached.data,
        error: cached.data ? null : 'CEP não encontrado (cache)'
      }
    }

    // Buscar e cachear resultado
    const result = await CepApiService.searchCep(cep)
    CepApiService.cepCache.set(cleanCep, {
      data: result.data,
      timestamp: now
    })

    // Limpar cache antigo (mantém apenas 50 entradas mais recentes)
    if (CepApiService.cepCache.size > 50) {
      const entries = Array.from(CepApiService.cepCache.entries())
      entries.sort((a, b) => b[1].timestamp - a[1].timestamp)
      CepApiService.cepCache.clear()
      entries.slice(0, 50).forEach(([key, value]) => {
        CepApiService.cepCache.set(key, value)
      })
    }

    return result
  }
}