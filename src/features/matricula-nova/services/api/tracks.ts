import { supabase, type TrilhoDesconto } from '@/lib/supabase'
import type { DatabaseTrack, ApiResponse } from '../../types/api'

export class TracksApiService {
  /**
   * Busca todos os trilhos de desconto ativos
   */
  static async getActiveTracks(): Promise<DatabaseTrack[]> {
    try {
      const { data, error } = await supabase
        .from('trilhos_desconto')
        .select(`
          id,
          nome,
          titulo,
          descricao,
          icone,
          cor_primaria,
          cap_maximo,
          ativo,
          ordem_exibicao,
          created_at,
          updated_at
        `)
        .eq('ativo', true)
        .order('ordem_exibicao', { ascending: true })

      if (error) {
        console.error('Error fetching tracks:', error)
        throw error
      }

      // Transformar para o formato esperado
      return (data || []).map(track => ({
        id: track.id,
        nome: track.titulo, // Usar título como nome principal
        description: track.descricao,
        is_active: track.ativo,
        created_at: track.created_at,
        updated_at: track.updated_at,
        // Metadados extras do trilho
        metadata: {
          tipo: track.nome, // especial | combinado | comercial
          icone: track.icone,
          cor_primaria: track.cor_primaria,
          cap_maximo: track.cap_maximo,
          ordem_exibicao: track.ordem_exibicao
        }
      }))
      
    } catch (error) {
      console.error('Error in getActiveTracks:', error)
      return TracksApiService.getMockTracks()
    }
  }

  /**
   * Busca um trilho específico pelo ID
   */
  static async getTrackById(id: string): Promise<DatabaseTrack | null> {
    try {
      const { data, error } = await supabase
        .from('trilhos_desconto')
        .select(`
          id,
          nome,
          titulo,
          descricao,
          icone,
          cor_primaria,
          cap_maximo,
          ativo,
          ordem_exibicao,
          created_at,
          updated_at
        `)
        .eq('id', id)
        .eq('ativo', true)
        .single()

      if (error) {
        console.error('Error fetching track by ID:', error)
        return null
      }

      return {
        id: data.id,
        nome: data.titulo,
        description: data.descricao,
        is_active: data.ativo,
        created_at: data.created_at,
        updated_at: data.updated_at,
        metadata: {
          tipo: data.nome,
          icone: data.icone,
          cor_primaria: data.cor_primaria,
          cap_maximo: data.cap_maximo,
          ordem_exibicao: data.ordem_exibicao
        }
      }
      
    } catch (error) {
      console.error('Error in getTrackById:', error)
      return null
    }
  }

  /**
   * Busca regras de um trilho específico
   */
  static async getTrackRules(trackId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('regras_trilhos')
        .select(`
          id,
          trilho_id,
          categoria_permitida,
          pode_combinar_com,
          prioridade,
          restricao_especial,
          created_at
        `)
        .eq('trilho_id', trackId)
        .order('prioridade')

      if (error) {
        console.error('Error fetching track rules:', error)
        return []
      }

      return data || []
      
    } catch (error) {
      console.error('Error in getTrackRules:', error)
      return []
    }
  }

  /**
   * Valida compatibilidade entre trilho e descontos selecionados
   */
  static async validateTrackCompatibility(
    trackId: string, 
    discountCategories: string[]
  ): Promise<ApiResponse<{ compatible: boolean; reasons: string[] }>> {
    try {
      const rules = await TracksApiService.getTrackRules(trackId)
      
      const validationResult = {
        compatible: true,
        reasons: [] as string[]
      }

      // Verificar cada regra do trilho
      for (const rule of rules) {
        const categoriaPermitida = rule.categoria_permitida
        const podeCombimarCom = rule.pode_combinar_com || []

        // Verificar se as categorias dos descontos são compatíveis
        for (const categoria of discountCategories) {
          if (categoria === categoriaPermitida) {
            // Categoria diretamente permitida
            continue
          }

          if (podeCombimarCom.includes(categoria)) {
            // Categoria permitida por combinação
            continue
          }

          // Categoria não permitida
          validationResult.compatible = false
          validationResult.reasons.push(
            `Desconto da categoria "${categoria}" não é compatível com este trilho`
          )
        }

        // Verificar restrições especiais
        if (rule.restricao_especial) {
          validationResult.reasons.push(rule.restricao_especial)
        }
      }

      return {
        data: validationResult,
        error: null
      }
      
    } catch (error) {
      console.error('Error in validateTrackCompatibility:', error)
      return {
        data: null,
        error: 'Erro ao validar compatibilidade do trilho'
      }
    }
  }

  /**
   * Busca configuração de CAPs atual
   */
  static async getCurrentCaps(): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('config_caps')
        .select(`
          id,
          cap_with_secondary,
          cap_without_secondary,
          cap_especial_maximo,
          vigencia_inicio,
          vigencia_fim,
          observacoes
        `)
        .is('vigencia_fim', null) // Configuração vigente (sem data fim)
        .order('vigencia_inicio', { ascending: false })
        .limit(1)
        .single()

      if (error) {
        console.error('Error fetching current caps:', error)
        // Retornar valores padrão
        return {
          cap_with_secondary: 60,
          cap_without_secondary: 60,
          cap_especial_maximo: 100
        }
      }

      return data
      
    } catch (error) {
      console.error('Error in getCurrentCaps:', error)
      return {
        cap_with_secondary: 60,
        cap_without_secondary: 60,
        cap_especial_maximo: 100
      }
    }
  }

  /**
   * Dados mock para desenvolvimento
   */
  private static getMockTracks(): DatabaseTrack[] {
    return [
      {
        id: '1',
        nome: 'Trilho Especial',
        description: 'Para descontos especiais como bolsas filantrópicas e funcionários',
        is_active: true,
        metadata: {
          tipo: 'especial',
          icone: '🌟',
          cor_primaria: '#8B5CF6',
          cap_maximo: 100,
          ordem_exibicao: 1
        }
      },
      {
        id: '2',
        nome: 'Trilho Combinado',
        description: 'Combina descontos regulares e especiais com limite de 60%',
        is_active: true,
        metadata: {
          tipo: 'combinado',
          icone: '🔗',
          cor_primaria: '#10B981',
          cap_maximo: 60,
          ordem_exibicao: 2
        }
      },
      {
        id: '3',
        nome: 'Trilho Comercial',
        description: 'Para descontos comerciais e negociações especiais',
        is_active: true,
        metadata: {
          tipo: 'comercial',
          icone: '💼',
          cor_primaria: '#3B82F6',
          cap_maximo: 50,
          ordem_exibicao: 3
        }
      }
    ]
  }
}