// src/features/matricula-nova/services/business/discountRules.ts

import type { 
  Desconto, 
  DescontoSelecionado, 
  NivelAprovacao 
} from '../../types/discounts'
import { CategoriaDesconto, TipoTrilho } from '../../types/discounts'

/**
 * Engine de regras de desconto
 * Centraliza toda a lógica de negócio relacionada aos descontos
 */
export class DiscountRuleEngine {
  
  /**
   * Filtra descontos baseado no trilho selecionado
   */
  static filterDiscountsByTrilho(
    descontos: Desconto[], 
    trilhoTipo: TipoTrilho
  ): Desconto[] {
    console.log('filterDiscountsByTrilho - Input:', {
      descontosCount: descontos?.length || 0,
      trilhoTipo,
      TipoTrilho_ESPECIAL: TipoTrilho.ESPECIAL,
      CategoriaDesconto_ESPECIAL: CategoriaDesconto.ESPECIAL,
      firstDesconto: descontos?.[0]
    })
    
    if (!descontos || descontos.length === 0) {
      return []
    }

    let filtered: Desconto[] = []
    
    switch (trilhoTipo) {
      case TipoTrilho.ESPECIAL:
        filtered = descontos.filter(d => d.categoria === CategoriaDesconto.ESPECIAL)
        console.log('Filtering ESPECIAL:', filtered.length, 'results')
        break
      
      case TipoTrilho.COMBINADO:
        filtered = descontos.filter(d => 
          d.categoria === CategoriaDesconto.REGULAR ||
          d.categoria === CategoriaDesconto.NEGOCIACAO
        )
        console.log('Filtering COMBINADO:', filtered.length, 'results')
        break
      
      default:
        console.log('No matching trilho type')
        filtered = []
    }
    
    return filtered
  }

  /**
   * Valida se desconto pode ser adicionado à seleção atual
   */
  static canAddDiscount(
    novoDesconto: Desconto,
    descontosSelecionados: DescontoSelecionado[]
  ): { pode: boolean; motivo?: string } {
    
    // Verificar se já foi selecionado
    if (descontosSelecionados.some(d => d.desconto.id === novoDesconto.id)) {
      return { pode: false, motivo: 'Desconto já selecionado' }
    }

    // Verificar se o desconto está ativo
    if (!novoDesconto.ativo) {
      return { pode: false, motivo: 'Desconto não está ativo' }
    }

    // Verificar incompatibilidades
    const incompativeis = descontosSelecionados.filter(d =>
      novoDesconto.incompativel_com.includes(d.desconto.codigo) ||
      d.desconto.incompativel_com.includes(novoDesconto.codigo)
    )

    if (incompativeis.length > 0) {
      const nomes = incompativeis.map(d => d.desconto.nome).join(', ')
      return { 
        pode: false, 
        motivo: `Incompatível com: ${nomes}` 
      }
    }

    // Verificar regras especiais por categoria
    const validacaoCategoria = this.validateCategoryRules(novoDesconto, descontosSelecionados)
    if (!validacaoCategoria.pode) {
      return validacaoCategoria
    }

    return { pode: true }
  }

  /**
   * Valida regras específicas por categoria
   */
  private static validateCategoryRules(
    novoDesconto: Desconto,
    descontosSelecionados: DescontoSelecionado[]
  ): { pode: boolean; motivo?: string } {
    
    switch (novoDesconto.categoria) {
      case CategoriaDesconto.ESPECIAL:
        // Apenas um desconto especial por vez
        const temEspecial = descontosSelecionados.some(d => 
          d.desconto.categoria === CategoriaDesconto.ESPECIAL
        )
        if (temEspecial) {
          return { 
            pode: false, 
            motivo: 'Apenas um desconto especial pode ser selecionado' 
          }
        }
        break

      case CategoriaDesconto.REGULAR:
        // Verificar se já tem desconto da mesma família
        const mesmaFamilia = this.getDiscountFamily(novoDesconto.codigo)
        const temMesmaFamilia = descontosSelecionados.some(d => 
          this.getDiscountFamily(d.desconto.codigo) === mesmaFamilia
        )
        if (temMesmaFamilia) {
          return { 
            pode: false, 
            motivo: `Apenas um desconto da família ${mesmaFamilia} pode ser selecionado` 
          }
        }
        break

      case CategoriaDesconto.NEGOCIACAO:
        // Regras específicas para descontos comerciais
        break
    }

    return { pode: true }
  }

  /**
   * Determina a família de um desconto pelo código
   */
  private static getDiscountFamily(codigo: string): string {
    const familias = {
      'IIR': 'familia',
      'RES': 'residencia',
      'PAV': 'pagamento',
      'CEP': 'localizacao',
      'ADI': 'adimplencia'
    }
    return familias[codigo as keyof typeof familias] || 'geral'
  }

  /**
   * Calcula percentual total aplicável
   */
  static calculateTotalPercentual(descontos: DescontoSelecionado[]): number {
    if (!descontos || descontos.length === 0) {
      return 0
    }
    
    return descontos.reduce((total, d) => total + d.percentual_aplicado, 0)
  }

  /**
   * Determina nível de aprovação necessário baseado no percentual total
   */
  static determineApprovalLevel(percentualTotal: number): NivelAprovacao {
    if (percentualTotal <= 20) return NivelAprovacao.AUTOMATICA
    if (percentualTotal <= 50) return NivelAprovacao.COORDENACAO
    if (percentualTotal <= 60) return NivelAprovacao.DIRECAO
    return NivelAprovacao.ESPECIAL
  }

  /**
   * Verifica se combinação de descontos é válida
   */
  static validateDiscountCombination(
    descontos: DescontoSelecionado[]
  ): { isValid: boolean; warnings: string[]; errors: string[] } {
    
    const warnings: string[] = []
    const errors: string[] = []

    if (descontos.length === 0) {
      return { isValid: true, warnings, errors }
    }

    // Verificar percentual total
    const percentualTotal = this.calculateTotalPercentual(descontos)
    
    if (percentualTotal > 100) {
      errors.push(`Percentual total (${percentualTotal}%) excede 100%`)
    }

    if (percentualTotal > 60 && percentualTotal <= 100) {
      warnings.push('Desconto alto - requer aprovação especial')
    }

    // Verificar documentos obrigatórios
    const semDocumento = descontos.filter(d => 
      d.desconto.requer_documento && !d.documento_anexo
    )
    
    if (semDocumento.length > 0) {
      const nomes = semDocumento.map(d => d.desconto.nome).join(', ')
      errors.push(`Documentos obrigatórios não anexados: ${nomes}`)
    }

    // Verificar incompatibilidades (não deveria chegar aqui, mas dupla verificação)
    for (let i = 0; i < descontos.length; i++) {
      for (let j = i + 1; j < descontos.length; j++) {
        const desconto1 = descontos[i].desconto
        const desconto2 = descontos[j].desconto
        
        if (desconto1.incompativel_com.includes(desconto2.codigo) ||
            desconto2.incompativel_com.includes(desconto1.codigo)) {
          errors.push(`Descontos incompatíveis: ${desconto1.nome} e ${desconto2.nome}`)
        }
      }
    }

    return { 
      isValid: errors.length === 0, 
      warnings, 
      errors 
    }
  }

  /**
   * Sugere otimizações na seleção de descontos
   */
  static suggestOptimizations(
    descontos: DescontoSelecionado[]
  ): { suggestions: string[]; alternativeSelections?: DescontoSelecionado[] } {
    
    const suggestions: string[] = []

    if (descontos.length === 0) {
      return { suggestions }
    }

    const percentualTotal = this.calculateTotalPercentual(descontos)

    // Sugerir redução se muito alto
    if (percentualTotal > 60) {
      suggestions.push('Considere reduzir alguns percentuais para agilizar aprovação')
    }

    // Sugerir documentação se faltando
    const semDocumento = descontos.filter(d => 
      d.desconto.requer_documento && !d.documento_anexo
    )
    
    if (semDocumento.length > 0) {
      suggestions.push('Anexe os documentos obrigatórios para validar os descontos')
    }

    // Sugerir combinações mais eficientes
    if (descontos.length > 3) {
      suggestions.push('Considere consolidar descontos similares para simplificar aprovação')
    }

    return { suggestions }
  }

  /**
   * Calcula impacto financeiro dos descontos
   */
  static calculateFinancialImpact(
    descontos: DescontoSelecionado[],
    valorBase: number
  ): {
    valorOriginal: number
    valorDesconto: number
    valorFinal: number
    economiaTotal: number
    economiaPercentual: number
    breakdown: Array<{
      nome: string
      codigo: string
      percentual: number
      valorDesconto: number
    }>
  } {

    if (!descontos || descontos.length === 0) {
      return {
        valorOriginal: valorBase,
        valorDesconto: 0,
        valorFinal: valorBase,
        economiaTotal: 0,
        economiaPercentual: 0,
        breakdown: []
      }
    }

    const breakdown = descontos.map(d => {
      const valorDesconto = (valorBase * d.percentual_aplicado) / 100
      return {
        nome: d.desconto.nome,
        codigo: d.desconto.codigo,
        percentual: d.percentual_aplicado,
        valorDesconto
      }
    })

    const valorTotalDesconto = breakdown.reduce((total, item) => total + item.valorDesconto, 0)
    const valorFinal = valorBase - valorTotalDesconto
    const economiaPercentual = (valorTotalDesconto / valorBase) * 100

    return {
      valorOriginal: valorBase,
      valorDesconto: valorTotalDesconto,
      valorFinal,
      economiaTotal: valorTotalDesconto,
      economiaPercentual,
      breakdown
    }
  }

  /**
   * Gera resumo executivo da seleção
   */
  static generateSummary(
    descontos: DescontoSelecionado[],
    valorBase: number
  ): {
    totalDescontos: number
    percentualTotal: number
    nivelAprovacao: NivelAprovacao
    impactoFinanceiro: ReturnType<typeof DiscountRuleEngine.calculateFinancialImpact>
    validacao: ReturnType<typeof DiscountRuleEngine.validateDiscountCombination>
    documentosRequeridos: string[]
    tempoEstimadoAprovacao: string
  } {

    const percentualTotal = this.calculateTotalPercentual(descontos)
    const nivelAprovacao = this.determineApprovalLevel(percentualTotal)
    const impactoFinanceiro = this.calculateFinancialImpact(descontos, valorBase)
    const validacao = this.validateDiscountCombination(descontos)

    const documentosRequeridos = descontos
      .filter(d => d.desconto.requer_documento)
      .map(d => d.desconto.nome)

    const tempoEstimadoAprovacao = this.getEstimatedApprovalTime(nivelAprovacao)

    return {
      totalDescontos: descontos.length,
      percentualTotal,
      nivelAprovacao,
      impactoFinanceiro,
      validacao,
      documentosRequeridos,
      tempoEstimadoAprovacao
    }
  }

  /**
   * Retorna tempo estimado de aprovação baseado no nível
   */
  private static getEstimatedApprovalTime(nivel: NivelAprovacao): string {
    switch (nivel) {
      case NivelAprovacao.AUTOMATICA:
        return 'Imediato'
      case NivelAprovacao.COORDENACAO:
        return '1-2 dias úteis'
      case NivelAprovacao.DIRECAO:
        return '3-5 dias úteis'
      case NivelAprovacao.ESPECIAL:
        return '5-10 dias úteis'
      default:
        return 'Não definido'
    }
  }
}