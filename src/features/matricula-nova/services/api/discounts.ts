import { supabase } from '@/lib/supabase'
import type { DatabaseDiscount, ApiListResponse, ApiResponse } from '../../types/api'

export class DiscountsApiService {
  /**
   * Busca todos os descontos ativos do sistema
   */
  static async getActiveDiscounts(): Promise<DatabaseDiscount[]> {
    try {
      const { data, error } = await supabase
        .from('tipos_desconto')
        .select(`
          id,
          codigo,
          descricao,
          percentual_fixo,
          ativo,
          documentos_necessarios,
          nivel_aprovacao_requerido,
          categoria,
          eh_variavel
        `)
        .eq('ativo', true)
        .order('descricao')

      if (error) {
        console.error('Error fetching discounts:', error)
        // Return mock data during development if table doesn't exist
        return DiscountsApiService.getMockDiscounts()
      }

      // Transformar para o formato esperado
      return (data || []).map(discount => ({
        id: discount.id,
        codigo: discount.codigo,
        nome: discount.descricao,
        percentual: discount.percentual_fixo || 0,
        is_active: discount.ativo,
        requires_document: discount.documentos_necessarios?.length > 0,
        description: `${discount.descricao} - ${discount.categoria}`,
        max_cumulative_percentage: discount.percentual_fixo || 0
      }))
      
    } catch (error) {
      console.error('Error in getActiveDiscounts:', error)
      return DiscountsApiService.getMockDiscounts()
    }
  }

  /**
   * Busca um desconto específico pelo ID
   */
  static async getDiscountById(id: string): Promise<DatabaseDiscount | null> {
    try {
      const { data, error } = await supabase
        .from('tipos_desconto')
        .select(`
          id,
          codigo,
          descricao,
          percentual_fixo,
          ativo,
          documentos_necessarios,
          nivel_aprovacao_requerido,
          categoria,
          eh_variavel
        `)
        .eq('id', id)
        .eq('ativo', true)
        .single()

      if (error) {
        console.error('Error fetching discount by ID:', error)
        return null
      }

      // Transformar para o formato esperado
      return {
        id: data.id,
        codigo: data.codigo,
        nome: data.descricao,
        percentual: data.percentual_fixo || 0,
        is_active: data.ativo,
        requires_document: data.documentos_necessarios?.length > 0,
        description: `${data.descricao} - ${data.categoria}`,
        max_cumulative_percentage: data.percentual_fixo || 0
      }
      
    } catch (error) {
      console.error('Error in getDiscountById:', error)
      return null
    }
  }

  /**
   * Busca descontos por categoria
   */
  static async getDiscountsByCategory(categoria: 'especial' | 'regular' | 'negociacao'): Promise<DatabaseDiscount[]> {
    try {
      const { data, error } = await supabase
        .from('tipos_desconto')
        .select(`
          id,
          codigo,
          descricao,
          percentual_fixo,
          ativo,
          documentos_necessarios,
          nivel_aprovacao_requerido,
          categoria,
          eh_variavel
        `)
        .eq('categoria', categoria)
        .eq('ativo', true)
        .order('descricao')

      if (error) {
        console.error('Error fetching discounts by category:', error)
        throw error
      }

      // Transformar para o formato esperado
      return (data || []).map(discount => ({
        id: discount.id,
        codigo: discount.codigo,
        nome: discount.descricao,
        percentual: discount.percentual_fixo || 0,
        is_active: discount.ativo,
        requires_document: discount.documentos_necessarios?.length > 0,
        description: `${discount.descricao} - ${discount.categoria}`,
        max_cumulative_percentage: discount.percentual_fixo || 0
      }))
      
    } catch (error) {
      console.error('Error in getDiscountsByCategory:', error)
      return []
    }
  }

  /**
   * Verifica elegibilidade de desconto por CEP
   */
  static async checkCepEligibility(cep: string, discountCodes: string[]): Promise<ApiResponse<any>> {
    try {
      // Primeiro, buscar a categoria do CEP
      const { data: cepData, error: cepError } = await supabase
        .from('cep_ranges')
        .select('categoria')
        .lte('cep_inicio', cep.replace('-', ''))
        .gte('cep_fim', cep.replace('-', ''))
        .eq('ativo', true)
        .single()

      if (cepError || !cepData) {
        return { 
          data: null, 
          error: 'CEP não encontrado ou fora da área de cobertura' 
        }
      }

      const categoria = cepData.categoria

      // Verificar elegibilidade para cada desconto
      const eligibilityChecks = await Promise.all(
        discountCodes.map(async (codigo) => {
          const { data, error } = await supabase
            .from('cep_desconto_elegibilidade')
            .select('elegivel, motivo_restricao')
            .eq('categoria_cep', categoria)
            .eq('tipo_desconto_codigo', codigo)
            .eq('ativo', true)
            .single()

          return {
            codigo,
            elegivel: data?.elegivel || false,
            motivo_restricao: data?.motivo_restricao || null
          }
        })
      )

      return {
        data: {
          categoria_cep: categoria,
          elegibilidade: eligibilityChecks
        },
        error: null
      }
      
    } catch (error) {
      console.error('Error checking CEP eligibility:', error)
      return { 
        data: null, 
        error: 'Erro ao verificar elegibilidade do CEP' 
      }
    }
  }

  /**
   * Busca descontos automaticamente aplicáveis por CEP
   */
  static async getAutoCepDiscounts(cep: string): Promise<DatabaseDiscount[]> {
    try {
      // Buscar categoria do CEP e desconto automático
      const { data: cepRange, error: cepError } = await supabase
        .from('cep_ranges')
        .select('categoria, percentual_desconto')
        .lte('cep_inicio', cep.replace('-', ''))
        .gte('cep_fim', cep.replace('-', ''))
        .eq('ativo', true)
        .single()

      if (cepError || !cepRange) {
        return []
      }

      // Se há desconto automático por CEP, retornar como desconto virtual
      if (cepRange.percentual_desconto > 0) {
        return [{
          id: 'cep-auto',
          codigo: 'CEP',
          nome: `Desconto CEP Automático (${cepRange.categoria})`,
          percentual: cepRange.percentual_desconto,
          is_active: true,
          requires_document: false,
          description: `Desconto automático baseado no CEP - Categoria: ${cepRange.categoria}`,
          max_cumulative_percentage: cepRange.percentual_desconto
        }]
      }

      return []
      
    } catch (error) {
      console.error('Error getting auto CEP discounts:', error)
      return []
    }
  }

  /**
   * Dados mock para desenvolvimento (remover quando tabela estiver pronta)
   */
  private static getMockDiscounts(): DatabaseDiscount[] {
    return [
      {
        id: '1',
        codigo: 'IIR',
        nome: 'Alunos Irmãos Carnal',
        percentual: 10,
        is_active: true,
        requires_document: true,
        description: 'Alunos Irmãos Carnal - especial',
        max_cumulative_percentage: 10
      },
      {
        id: '2',
        codigo: 'RES',
        nome: 'Alunos de Outras Cidades',
        percentual: 20,
        is_active: true,
        requires_document: true,
        description: 'Alunos de Outras Cidades - especial',
        max_cumulative_percentage: 20
      },
      {
        id: '3',
        codigo: 'PASS',
        nome: 'Filhos de Prof. do IESJE Sindicalizados',
        percentual: 100,
        is_active: true,
        requires_document: true,
        description: 'Filhos de Prof. do IESJE Sindicalizados - especial',
        max_cumulative_percentage: 100
      },
      {
        id: '4',
        codigo: 'PBS',
        nome: 'Filhos Prof. Sind. de Outras Instituições',
        percentual: 40,
        is_active: true,
        requires_document: true,
        description: 'Filhos Prof. Sind. de Outras Instituições - especial',
        max_cumulative_percentage: 40
      },
      {
        id: '5',
        codigo: 'COL',
        nome: 'Filhos de Func. do IESJE Sindicalizados SAAE',
        percentual: 50,
        is_active: true,
        requires_document: true,
        description: 'Filhos de Func. do IESJE Sindicalizados SAAE - especial',
        max_cumulative_percentage: 50
      },
      {
        id: '6',
        codigo: 'PAV',
        nome: 'Pagamento à Vista',
        percentual: 15,
        is_active: true,
        requires_document: false,
        description: 'Pagamento à Vista - comercial',
        max_cumulative_percentage: 15
      }
    ]
  }
}