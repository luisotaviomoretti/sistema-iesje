import { 
  type TrilhoNome, 
  type TipoDesconto, 
  type CalculoDesconto,
  type ConfigCap,
  type ValidacaoTrilho
} from '@/lib/supabase'

// ============================================================================
// SERVIÇO DE CÁLCULO DE TRILHOS
// ============================================================================

export interface TrilhoCalculationResult {
  isValid: boolean
  totalDiscount: number
  capApplied: number
  remainingCap: number
  finalValue: number
  errors: string[]
  warnings: string[]
  nivel_aprovacao: 'AUTOMATICA' | 'COORDENACAO' | 'DIRECAO'
}

export interface TrilhoValidationInput {
  trilho: TrilhoNome
  descontos: TipoDesconto[]
  valorBase: number
  temResponsavelSecundario: boolean
  configCap: ConfigCap
}

/**
 * Classe principal para cálculos de trilhos de desconto
 */
export class TrilhoCalculationService {
  
  /**
   * Calcula o desconto total considerando o trilho selecionado
   */
  static calculateDiscount(input: TrilhoValidationInput): TrilhoCalculationResult {
    const { trilho, descontos, valorBase, temResponsavelSecundario, configCap } = input
    
    // Determinar cap máximo baseado no trilho
    const capMaximo = this.determineCapLimit(trilho, temResponsavelSecundario, configCap)
    
    // Calcular desconto total
    const descontoTotal = descontos.reduce((total, desconto) => {
      return total + (desconto.percentual_fixo || 0)
    }, 0)
    
    // Aplicar cap
    const capAplicado = Math.min(descontoTotal, capMaximo)
    const capRestante = capMaximo - capAplicado
    
    // Calcular valor final
    const valorDesconto = valorBase * (capAplicado / 100)
    const valorFinal = valorBase - valorDesconto
    
    // Validações
    const errors: string[] = []
    const warnings: string[] = []
    
    // Verificar se excede o cap
    if (descontoTotal > capMaximo) {
      warnings.push(
        `Desconto total (${descontoTotal.toFixed(1)}%) excede o cap do trilho (${capMaximo}%). ` +
        `Será aplicado apenas ${capAplicado.toFixed(1)}%.`
      )
    }
    
    // Verificar compatibilidade de trilho
    const compatibilityCheck = this.validateTrackCompatibility(trilho, descontos)
    if (!compatibilityCheck.isCompatible) {
      errors.push(compatibilityCheck.reason || 'Desconto incompatível com o trilho selecionado')
    }
    
    // Determinar nível de aprovação
    const nivelAprovacao = this.determineApprovalLevel(capAplicado, descontos)
    
    const isValid = errors.length === 0 && descontos.length > 0
    
    return {
      isValid,
      totalDiscount: descontoTotal,
      capApplied: capAplicado,
      remainingCap: capRestante,
      finalValue: valorFinal,
      errors,
      warnings,
      nivel_aprovacao: nivelAprovacao
    }
  }
  
  /**
   * Determina o cap limite baseado no trilho e responsável secundário
   */
  private static determineCapLimit(
    trilho: TrilhoNome, 
    temResponsavelSecundario: boolean, 
    configCap: ConfigCap
  ): number {
    switch (trilho) {
      case 'especial':
        return configCap.cap_especial_maximo
      
      case 'combinado':
        return temResponsavelSecundario 
          ? configCap.cap_with_secondary 
          : configCap.cap_without_secondary
      
      case 'comercial':
        return configCap.cap_without_secondary
      
      default:
        return configCap.cap_without_secondary
    }
  }
  
  /**
   * Valida se os descontos são compatíveis com o trilho
   */
  private static validateTrackCompatibility(
    trilho: TrilhoNome, 
    descontos: TipoDesconto[]
  ): { isCompatible: boolean; reason?: string } {
    if (!descontos.length) {
      return { isCompatible: true }
    }
    
    const categorias = descontos.map(d => d.categoria)
    const temEspecial = categorias.includes('especial')
    const temRegular = categorias.includes('regular')
    const temNegociacao = categorias.includes('negociacao')
    
    switch (trilho) {
      case 'especial':
        if (temRegular || temNegociacao) {
          return {
            isCompatible: false,
            reason: 'Trilho Especial: apenas descontos especiais são permitidos'
          }
        }
        if (!temEspecial) {
          return {
            isCompatible: false,
            reason: 'Trilho Especial requer pelo menos um desconto especial'
          }
        }
        break
        
      case 'combinado':
        if (temEspecial) {
          return {
            isCompatible: false,
            reason: 'Trilho Combinado: descontos especiais não são permitidos'
          }
        }
        break
        
      case 'comercial':
        if (temEspecial || temRegular) {
          return {
            isCompatible: false,
            reason: 'Trilho Comercial: apenas descontos de negociação são permitidos'
          }
        }
        if (!temNegociacao) {
          return {
            isCompatible: false,
            reason: 'Trilho Comercial requer pelo menos um desconto de negociação'
          }
        }
        break
    }
    
    return { isCompatible: true }
  }
  
  /**
   * Determina o nível de aprovação necessário
   */
  private static determineApprovalLevel(
    capAplicado: number, 
    descontos: TipoDesconto[]
  ): 'AUTOMATICA' | 'COORDENACAO' | 'DIRECAO' {
    // Verificar se há descontos que requerem aprovação específica
    const nivelMaximo = descontos.reduce<'AUTOMATICA' | 'COORDENACAO' | 'DIRECAO'>((max, desconto) => {
      const nivelDesconto = desconto.nivel_aprovacao_requerido
      
      if (nivelDesconto === 'DIRECAO' || max === 'DIRECAO') {
        return 'DIRECAO'
      }
      
      if (nivelDesconto === 'COORDENACAO' || max === 'COORDENACAO') {
        return 'COORDENACAO'
      }
      
      return 'AUTOMATICA'
    }, 'AUTOMATICA')
    
    // Regras por percentual de cap
    if (capAplicado > 50) {
      return 'DIRECAO'
    } else if (capAplicado > 20) {
      return 'COORDENACAO'
    }
    
    // Retornar o maior nível entre percentual e descontos específicos
    const niveis = ['AUTOMATICA', 'COORDENACAO', 'DIRECAO'] as const
    const indexCap = capAplicado > 50 ? 2 : capAplicado > 20 ? 1 : 0
    const indexDesconto = niveis.indexOf(nivelMaximo)
    
    return niveis[Math.max(indexCap, indexDesconto)]
  }
  
  /**
   * Sugere o trilho mais adequado baseado nos descontos
   */
  static suggestOptimalTrack(descontos: TipoDesconto[]): TrilhoNome | null {
    if (!descontos.length) return null
    
    const categorias = descontos.map(d => d.categoria)
    const temEspecial = categorias.includes('especial')
    const temRegular = categorias.includes('regular')
    const temNegociacao = categorias.includes('negociacao')
    
    // Se tem especial, só pode ser especial
    if (temEspecial) {
      return 'especial'
    }
    
    // Se tem regular + negociação ou só regular, usar combinado
    if (temRegular) {
      return 'combinado'
    }
    
    // Se tem só negociação, usar comercial
    if (temNegociacao) {
      return 'comercial'
    }
    
    return null
  }
  
  /**
   * Calcula estatísticas para múltiplas opções de trilho
   */
  static compareTrackOptions(
    descontos: TipoDesconto[],
    valorBase: number,
    temResponsavelSecundario: boolean,
    configCap: ConfigCap
  ): Record<TrilhoNome, TrilhoCalculationResult> {
    const trilhos: TrilhoNome[] = ['especial', 'combinado', 'comercial']
    
    const results: Record<TrilhoNome, TrilhoCalculationResult> = {} as any
    
    trilhos.forEach(trilho => {
      try {
        results[trilho] = this.calculateDiscount({
          trilho,
          descontos,
          valorBase,
          temResponsavelSecundario,
          configCap
        })
      } catch (error) {
        results[trilho] = {
          isValid: false,
          totalDiscount: 0,
          capApplied: 0,
          remainingCap: 0,
          finalValue: valorBase,
          errors: ['Erro no cálculo do trilho'],
          warnings: [],
          nivel_aprovacao: 'AUTOMATICA'
        }
      }
    })
    
    return results
  }
  
  /**
   * Formata valores para exibição
   */
  static formatters = {
    percentage: (value: number): string => `${value.toFixed(1).replace('.0', '')}%`,
    currency: (value: number): string => new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value),
    
    approvalLevel: (level: 'AUTOMATICA' | 'COORDENACAO' | 'DIRECAO'): string => {
      switch (level) {
        case 'AUTOMATICA': return 'Aprovação Automática'
        case 'COORDENACAO': return 'Aprovação da Coordenação'
        case 'DIRECAO': return 'Aprovação da Direção'
        default: return 'Nível Desconhecido'
      }
    }
  }
  
  /**
   * Valida se documentação está completa
   */
  static validateDocumentation(descontos: TipoDesconto[]): {
    isComplete: boolean
    missingDocuments: string[]
    requiredDocuments: Array<{ desconto: string; documentos: string[] }>
  } {
    const missingDocuments: string[] = []
    const requiredDocuments: Array<{ desconto: string; documentos: string[] }> = []
    
    descontos.forEach(desconto => {
      if (desconto.documentos_necessarios && desconto.documentos_necessarios.length > 0) {
        requiredDocuments.push({
          desconto: desconto.codigo,
          documentos: desconto.documentos_necessarios
        })
        
        // Aqui você pode implementar lógica para verificar se os documentos foram enviados
        // Por enquanto, assumimos que não foram
        missingDocuments.push(...desconto.documentos_necessarios)
      }
    })
    
    return {
      isComplete: missingDocuments.length === 0,
      missingDocuments: [...new Set(missingDocuments)], // Remove duplicatas
      requiredDocuments
    }
  }
}