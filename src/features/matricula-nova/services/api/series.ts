import { supabase } from '@/lib/supabase'
import type { DatabaseSeries, ApiListResponse } from '../../types/api'

export class SeriesApiService {
  // Flag para usar mock data durante desenvolvimento 
  private static readonly USE_MOCK_DATA = true // Forçar mock data por enquanto

  /**
   * Busca todas as séries ativas
   */
  static async getActiveSeries(): Promise<DatabaseSeries[]> {
    // Durante desenvolvimento, usar mock data diretamente
    if (SeriesApiService.USE_MOCK_DATA) {
      console.log('🔧 [DEV] Using mock series data - forced mode')
      return Promise.resolve(SeriesApiService.getMockSeries())
    }

    try {
      const { data, error } = await supabase
        .from('series') // Ajustar nome da tabela conforme necessário
        .select(`
          id,
          nome,
          nivel,
          value,
          turno,
          ativo,
          created_at,
          updated_at
        `)
        .eq('ativo', true)
        .order('nivel', { ascending: true })
        .order('nome', { ascending: true })

      if (error) {
        console.error('Error fetching series:', error)
        // Se a tabela não existir, retornar dados mock para desenvolvimento
        return SeriesApiService.getMockSeries()
      }

      return data || []
      
    } catch (error) {
      console.error('Error in getActiveSeries:', error)
      // Retornar dados mock em caso de erro
      return SeriesApiService.getMockSeries()
    }
  }

  /**
   * Busca séries por nível educacional
   */
  static async getSeriesByLevel(nivel: string): Promise<DatabaseSeries[]> {
    // Durante desenvolvimento, usar mock data diretamente
    if (SeriesApiService.USE_MOCK_DATA) {
      console.log(`🔧 [DEV] Using mock series data for level: ${nivel}`)
      return Promise.resolve(SeriesApiService.getMockSeriesByLevel(nivel))
    }

    try {
      const { data, error } = await supabase
        .from('series')
        .select(`
          id,
          nome,
          nivel,
          value,
          turno,
          ativo,
          created_at,
          updated_at
        `)
        .eq('nivel', nivel)
        .eq('ativo', true)
        .order('nome')

      if (error) {
        console.error('Error fetching series by level:', error)
        return SeriesApiService.getMockSeriesByLevel(nivel)
      }

      return data || []
      
    } catch (error) {
      console.error('Error in getSeriesByLevel:', error)
      return SeriesApiService.getMockSeriesByLevel(nivel)
    }
  }

  /**
   * Busca uma série específica pelo ID
   */
  static async getSeriesById(id: string): Promise<DatabaseSeries | null> {
    // Durante desenvolvimento, usar mock data diretamente
    if (SeriesApiService.USE_MOCK_DATA) {
      console.log(`🔧 [DEV] Using mock series data for ID: ${id}`)
      const mockSeries = SeriesApiService.getMockSeries()
      return Promise.resolve(mockSeries.find(s => s.id === id) || null)
    }

    try {
      const { data, error } = await supabase
        .from('series')
        .select(`
          id,
          nome,
          nivel,
          value,
          turno,
          ativo,
          created_at,
          updated_at
        `)
        .eq('id', id)
        .eq('ativo', true)
        .single()

      if (error) {
        console.error('Error fetching series by ID:', error)
        return null
      }

      return data
      
    } catch (error) {
      console.error('Error in getSeriesById:', error)
      return null
    }
  }

  /**
   * Busca níveis educacionais disponíveis
   */
  static async getAvailableLevels(): Promise<string[]> {
    // Durante desenvolvimento, usar mock data diretamente
    if (SeriesApiService.USE_MOCK_DATA) {
      console.log('🔧 [DEV] Using mock levels data')
      const mockSeries = SeriesApiService.getMockSeries()
      const levels = [...new Set(mockSeries.map(s => s.nivel))]
      return Promise.resolve(levels)
    }

    try {
      const { data, error } = await supabase
        .from('series')
        .select('nivel')
        .eq('ativo', true)
        .order('nivel')

      if (error) {
        console.error('Error fetching levels:', error)
        return ['Infantil', 'Fundamental I', 'Fundamental II', 'Médio']
      }

      // Remover duplicatas
      const levels = [...new Set(data?.map(item => item.nivel) || [])]
      return levels
      
    } catch (error) {
      console.error('Error in getAvailableLevels:', error)
      return ['Infantil', 'Fundamental I', 'Fundamental II', 'Médio']
    }
  }

  /**
   * Dados mock para desenvolvimento (remover quando tabela estiver pronta)
   */
  private static getMockSeries(): DatabaseSeries[] {
    return [
      // Educação Infantil
      {
        id: '1',
        nome: 'Maternal II',
        nivel: 'Infantil',
        value: 450.00,
        is_active: true
      },
      {
        id: '2', 
        nome: 'Jardim I',
        nivel: 'Infantil',
        value: 480.00,
        is_active: true
      },
      {
        id: '3',
        nome: 'Jardim II',
        nivel: 'Infantil', 
        value: 510.00,
        is_active: true
      },
      // Fundamental I
      {
        id: '4',
        nome: '1º Ano',
        nivel: 'Fundamental I',
        value: 580.00,
        is_active: true
      },
      {
        id: '5',
        nome: '2º Ano',
        nivel: 'Fundamental I',
        value: 580.00,
        is_active: true
      },
      {
        id: '6',
        nome: '3º Ano',
        nivel: 'Fundamental I',
        value: 610.00,
        is_active: true
      },
      {
        id: '7',
        nome: '4º Ano',
        nivel: 'Fundamental I',
        value: 610.00,
        is_active: true
      },
      {
        id: '8',
        nome: '5º Ano',
        nivel: 'Fundamental I',
        value: 640.00,
        is_active: true
      },
      // Fundamental II
      {
        id: '9',
        nome: '6º Ano',
        nivel: 'Fundamental II',
        value: 720.00,
        is_active: true
      },
      {
        id: '10',
        nome: '7º Ano',
        nivel: 'Fundamental II',
        value: 720.00,
        is_active: true
      },
      {
        id: '11',
        nome: '8º Ano',
        nivel: 'Fundamental II',
        value: 750.00,
        is_active: true
      },
      {
        id: '12',
        nome: '9º Ano',
        nivel: 'Fundamental II',
        value: 750.00,
        is_active: true
      },
      // Ensino Médio
      {
        id: '13',
        nome: '1º Ano EM',
        nivel: 'Médio',
        value: 820.00,
        is_active: true
      },
      {
        id: '14',
        nome: '2º Ano EM',
        nivel: 'Médio',
        value: 820.00,
        is_active: true
      },
      {
        id: '15',
        nome: '3º Ano EM',
        nivel: 'Médio',
        value: 850.00,
        is_active: true
      }
    ]
  }

  /**
   * Mock de séries por nível
   */
  private static getMockSeriesByLevel(nivel: string): DatabaseSeries[] {
    const allSeries = SeriesApiService.getMockSeries()
    return allSeries.filter(serie => serie.nivel === nivel)
  }
}