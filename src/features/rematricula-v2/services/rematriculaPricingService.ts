/**
 * Serviço de cálculo de preços para rematrícula
 * Replica a lógica do sistema de nova matrícula mas mantém independência
 * Não depende de calculatePricing do sistema novo
 */

import type { DatabaseSeries, DatabaseDiscount } from '../../matricula-nova/types/api'
import type { 
  RematriculaPricing, 
  PricingComparison,
  PreviousYearFinance 
} from '../types/rematricula-pricing'

/**
 * Serviço independente de cálculo financeiro para rematrícula
 */
export class RematriculaPricingService {
  
  // Limite máximo de desconto cumulativo
  private static readonly MAX_DISCOUNT_PERCENTAGE = 101
  private static readonly MAX_DISCOUNT_INTEGRAL = 100
  
  // Códigos de bolsas integrais
  private static readonly INTEGRAL_SCHOLARSHIP_CODES = ['ABI', 'PASS']
  
  /**
   * Calcula pricing para rematrícula
   * Replica lógica de calculatePricing mas independente
   */
  static calculate(
    series: DatabaseSeries,
    discounts: DatabaseDiscount[]
  ): RematriculaPricing {
    
    // Debug logging
    if (import.meta.env.DEV) {
      console.log('[RematriculaPricingService] Input series:', series)
      console.log('[RematriculaPricingService] Input discounts:', discounts)
    }
    
    // Extrair valores da série
    // Compatibilidade com diferentes estruturas de dados
    const baseValue = (series as any).valor_mensal_sem_material || 
                     (series as any).value || 
                     0
    
    const materialValue = (series as any).valor_material || 0
    
    const totalValue = (series as any).valor_mensal_com_material || 
                      (baseValue + materialValue)
    
    if (import.meta.env.DEV) {
      console.log('[RematriculaPricingService] Extracted values:', {
        baseValue,
        materialValue,
        totalValue
      })
    }
    
    // Validação inicial
    if (!baseValue || baseValue <= 0) {
      return {
        seriesId: series.id,
        seriesName: series.nome,
        baseValue: 0,
        materialValue: 0,
        totalValue: 0,
        appliedDiscounts: [],
        totalDiscountPercentage: 0,
        totalDiscountValue: 0,
        finalMonthlyValue: 0,
        approvalLevel: 'automatic',
        isValid: false,
        validationErrors: ['Valor base inválido'],
        warnings: []
      }
    }
    
    // Processar descontos
    const processedDiscounts = discounts.map(discount => ({
      id: discount.id,
      code: discount.codigo,
      name: discount.nome,
      percentage: discount.percentual || 0,
      value: (baseValue * (discount.percentual || 0)) / 100
    }))
    
    // Calcular totais
    const totalDiscountPercentage = processedDiscounts.reduce(
      (sum, discount) => sum + discount.percentage, 
      0
    )
    
    const totalDiscountValue = processedDiscounts.reduce(
      (sum, discount) => sum + discount.value, 
      0
    )
    
    // Verificar se há bolsa integral
    const hasIntegralScholarship = this.hasIntegralScholarship(discounts)
    
    // Aplicar limite máximo de desconto
    const maxLimit = hasIntegralScholarship 
      ? this.MAX_DISCOUNT_INTEGRAL 
      : this.MAX_DISCOUNT_PERCENTAGE
    
    // Calcular valor final
    let effectiveDiscountValue = totalDiscountValue
    let effectiveDiscountPercentage = totalDiscountPercentage
    
    if (totalDiscountPercentage > maxLimit) {
      effectiveDiscountPercentage = maxLimit
      effectiveDiscountValue = (baseValue * maxLimit) / 100
    }
    
    const finalMonthlyValue = Math.max(0, baseValue - effectiveDiscountValue) + materialValue
    
    // Validações
    const validationErrors: string[] = []
    const warnings: string[] = []
    
    // Verificar limite de desconto
    if (totalDiscountPercentage > maxLimit) {
      validationErrors.push(
        `Desconto total de ${totalDiscountPercentage}% excede o limite máximo de ${maxLimit}%`
      )
    }
    
    // Verificar incompatibilidades
    const incompatibilityErrors = this.checkDiscountIncompatibility(discounts)
    if (incompatibilityErrors.length > 0) {
      validationErrors.push(...incompatibilityErrors)
    }
    
    // Avisos
    if (totalDiscountPercentage > 50 && totalDiscountPercentage <= maxLimit) {
      warnings.push('Desconto alto - verificar documentação necessária')
    }
    
    if (processedDiscounts.some(d => d.code === 'CEP') && processedDiscounts.length > 1) {
      warnings.push('Desconto CEP aplicado junto com outros descontos')
    }
    
    // Determinar nível de aprovação
    const approvalLevel = this.determineApprovalLevel(effectiveDiscountPercentage)
    
    return {
      seriesId: series.id,
      seriesName: series.nome,
      baseValue,
      materialValue,
      totalValue,
      appliedDiscounts: processedDiscounts,
      totalDiscountPercentage: effectiveDiscountPercentage,
      totalDiscountValue: effectiveDiscountValue,
      finalMonthlyValue,
      approvalLevel,
      isValid: validationErrors.length === 0,
      validationErrors,
      warnings
    }
  }
  
  /**
   * Compara valores com ano anterior
   */
  static compareWithPreviousYear(
    current: RematriculaPricing,
    previousYear: PreviousYearFinance | null
  ): PricingComparison | null {
    
    if (!previousYear) {
      return null
    }
    
    const previousValue = previousYear.final_monthly_value
    const currentValue = current.finalMonthlyValue
    const difference = currentValue - previousValue
    const percentageChange = previousValue > 0 
      ? (difference / previousValue) * 100 
      : 0
    
    return {
      previousYearValue: previousValue,
      currentYearValue: currentValue,
      difference,
      percentageChange,
      status: difference > 0 
        ? 'increase' 
        : difference < 0 
          ? 'decrease' 
          : 'stable'
    }
  }
  
  /**
   * Verifica se há bolsa integral nos descontos
   */
  private static hasIntegralScholarship(discounts: DatabaseDiscount[]): boolean {
    return discounts.some(discount => 
      this.INTEGRAL_SCHOLARSHIP_CODES.includes(discount.codigo.toUpperCase()) && 
      (discount.percentual || 0) >= 100
    )
  }
  
  /**
   * Verifica incompatibilidades entre descontos
   */
  private static checkDiscountIncompatibility(discounts: DatabaseDiscount[]): string[] {
    const errors: string[] = []
    const codes = discounts.map(d => d.codigo.toUpperCase())
    
    // Regras de incompatibilidade replicadas
    const incompatibilityRules = [
      {
        codes: ['ABI', 'ABP'],
        message: 'Bolsa integral e parcial de filantropia não podem ser combinadas'
      },
      {
        codes: ['PASS', 'PBS'],
        message: 'Descontos de professores IESJE e outros estabelecimentos não podem ser combinados'
      },
      {
        codes: ['COL', 'SAE'],
        message: 'Descontos de funcionários IESJE e outros estabelecimentos não podem ser combinados'
      }
    ]
    
    // Verificar cada regra
    for (const rule of incompatibilityRules) {
      const matchingCodes = codes.filter(code => rule.codes.includes(code))
      if (matchingCodes.length > 1) {
        errors.push(rule.message)
      }
    }
    
    // Verificar múltiplos descontos integrais
    const integralDiscounts = discounts.filter(d => (d.percentual || 0) >= 100)
    if (integralDiscounts.length > 1) {
      errors.push('Não é possível combinar múltiplos descontos de 100%')
    }
    // Observação informativa sobre PAV com outros descontos foi removida daqui
    // para evitar acoplamento com coleções de warnings. Mantemos apenas erros.

    return errors
  }
  
  /**
   * Determina nível de aprovação necessário
   */
  private static determineApprovalLevel(
    totalPercentage: number
  ): 'automatic' | 'coordination' | 'direction' {
    
    if (totalPercentage <= 20) {
      return 'automatic'
    } else if (totalPercentage <= 50) {
      return 'coordination'
    } else {
      return 'direction'
    }
  }
  
  /**
   * Valida documentos necessários para os descontos
   */
  static validateRequiredDocuments(discounts: DatabaseDiscount[]): {
    allDocumentsProvided: boolean
    missingDocuments: string[]
    requiredDocuments: string[]
  } {
    const requiredDocuments: string[] = []
    const missingDocuments: string[] = []
    
    discounts.forEach(discount => {
      if (discount.requires_document) {
        const docType = this.getRequiredDocumentType(discount.codigo)
        requiredDocuments.push(docType)
        
        // Por enquanto, assumimos que está faltando se requires_document = true
        // Em produção, verificaria uploads reais
        missingDocuments.push(docType)
      }
    })
    
    return {
      allDocumentsProvided: missingDocuments.length === 0,
      missingDocuments,
      requiredDocuments
    }
  }
  
  /**
   * Mapeia código de desconto para documento necessário
   */
  private static getRequiredDocumentType(discountCode: string): string {
    const documentMap: Record<string, string> = {
      'IIR': 'Certidão de nascimento dos irmãos',
      'RES': 'Comprovante de residência',
      'PASS': 'Declaração de vínculo empregatício IESJE + Carteira sindical',
      'PBS': 'Declaração de vínculo empregatício + Carteira sindical',
      'COL': 'Declaração de vínculo empregatício IESJE + Carteira sindical SAAE',
      'SAE': 'Declaração de vínculo empregatício + Carteira sindical SAAE',
      'ABI': 'Documentos de comprovação de renda familiar',
      'ABP': 'Documentos de comprovação de renda familiar',
      'PAV': 'Comprovante de pagamento à vista',
      'CEP': 'Comprovante de endereço atualizado'
    }
    
    return documentMap[discountCode.toUpperCase()] || 'Documentação específica'
  }
  
  /**
   * Formata valor monetário
   */
  static formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }
  
  /**
   * Formata porcentagem
   */
  static formatPercentage(value: number): string {
    return `${value.toFixed(1)}%`
  }
  
  /**
   * Gera resumo do cálculo
   */
  static generateSummary(pricing: RematriculaPricing): string {
    const lines: string[] = [
      `Série: ${pricing.seriesName}`,
      `Valor Base: ${this.formatCurrency(pricing.baseValue)}`,
      `Material: ${this.formatCurrency(pricing.materialValue)}`,
      `Descontos: ${this.formatPercentage(pricing.totalDiscountPercentage)} (${this.formatCurrency(pricing.totalDiscountValue)})`,
      `Valor Final: ${this.formatCurrency(pricing.finalMonthlyValue)}/mês`,
      `Aprovação: ${pricing.approvalLevel === 'automatic' ? 'Automática' : 
                   pricing.approvalLevel === 'coordination' ? 'Coordenação' : 'Direção'}`
    ]
    
    if (pricing.warnings.length > 0) {
      lines.push('⚠️ Avisos:')
      pricing.warnings.forEach(w => lines.push(`  • ${w}`))
    }
    
    return lines.join('\n')
  }
}