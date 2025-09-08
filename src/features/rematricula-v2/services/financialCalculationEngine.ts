/**
 * Motor de Cálculo Financeiro para Rematrícula
 * Realiza todos os cálculos financeiros de forma independente
 * Totalmente desacoplado do sistema de nova matrícula
 */

import { 
  FinancialCalculation,
  PaymentPlan,
  InstallmentDetails,
  DiscountedPrice,
  PaymentMethod,
  FinancialComparison,
  LatePaymentFees
} from '../types/financial'
import { DiscountSelection } from '../types/rematricula'

interface Series {
  id: string
  nome: string
  valor_mensal_sem_material: number
  valor_material: number
  numero_parcelas: number
  escola: 'pelicano' | 'sete_setembro'
}

interface PreviousYearFinance {
  base_value: number
  total_discounts: number
  final_monthly_value: number
  material_cost: number
  payment_method: string
  installments: number
}

/**
 * Motor de cálculos financeiros especializado para rematrícula
 * Implementa todas as regras de negócio financeiras
 */
export class FinancialCalculationEngine {
  
  // Configurações de negócio
  private static readonly MAX_DISCOUNT_PERCENTAGE = 60
  private static readonly MIN_MONTHLY_VALUE = 100 // Valor mínimo aceitável
  private static readonly LATE_PAYMENT_FEE = 2 // 2% de multa
  private static readonly DAILY_INTEREST_RATE = 0.033 // 0,033% ao dia (1% ao mês)
  
  // Dias de vencimento disponíveis
  private static readonly AVAILABLE_DUE_DATES = [5, 10, 15, 20, 25]
  
  // Formas de pagamento disponíveis
  private static readonly PAYMENT_METHODS: PaymentMethod[] = [
    { id: 'boleto', name: 'Boleto Bancário', discount: 0 },
    { id: 'pix', name: 'PIX', discount: 2 }, // 2% desconto no PIX
    { id: 'cartao_credito', name: 'Cartão de Crédito', discount: 0 },
    { id: 'cartao_debito', name: 'Cartão de Débito', discount: 1 }, // 1% desconto no débito
    { id: 'dinheiro', name: 'Dinheiro', discount: 3 } // 3% desconto em dinheiro
  ]
  
  /**
   * Calcula valores financeiros completos para rematrícula
   */
  static calculateFinancials(
    series: Series,
    selectedDiscounts: DiscountSelection[],
    previousYearFinance: PreviousYearFinance | null,
    paymentMethod: string = 'boleto',
    installments?: number
  ): FinancialCalculation {
    
    // Valores base
    const baseValue = series.valor_mensal_sem_material
    const materialCost = series.valor_material
    const numberOfInstallments = installments || series.numero_parcelas || 12
    
    // Calcular descontos
    const discountDetails = this.calculateDiscountDetails(
      baseValue,
      selectedDiscounts
    )
    
    // Aplicar limite máximo de desconto
    const effectiveDiscountValue = Math.min(
      discountDetails.totalValue,
      baseValue * (this.MAX_DISCOUNT_PERCENTAGE / 100)
    )
    
    // Valor mensal com descontos
    const monthlyValueWithDiscounts = Math.max(
      baseValue - effectiveDiscountValue,
      this.MIN_MONTHLY_VALUE
    )
    
    // Aplicar desconto da forma de pagamento
    const paymentMethodDiscount = this.getPaymentMethodDiscount(
      monthlyValueWithDiscounts,
      paymentMethod
    )
    
    // Valor final mensal
    const finalMonthlyValue = monthlyValueWithDiscounts - paymentMethodDiscount
    
    // Calcular parcelas
    const installmentPlan = this.calculateInstallments(
      finalMonthlyValue,
      materialCost,
      numberOfInstallments
    )
    
    // Comparação com ano anterior
    const comparison = previousYearFinance 
      ? this.compareWithPreviousYear(
          finalMonthlyValue,
          previousYearFinance.final_monthly_value
        )
      : null
    
    // Nível de aprovação necessário
    const approvalLevel = this.determineApprovalLevel(discountDetails.totalPercentage)
    
    return {
      // Valores base
      baseValue,
      materialCost,
      
      // Descontos aplicados
      discountDetails,
      effectiveDiscountPercentage: (effectiveDiscountValue / baseValue) * 100,
      effectiveDiscountValue,
      
      // Valores finais
      monthlyValueWithDiscounts,
      paymentMethodDiscount,
      finalMonthlyValue,
      
      // Parcelamento
      installmentPlan,
      totalAnnualValue: finalMonthlyValue * numberOfInstallments + materialCost,
      
      // Comparação
      comparison,
      
      // Metadados
      approvalLevel,
      requiresSpecialApproval: discountDetails.totalPercentage > 50,
      calculatedAt: new Date(),
      
      // Validações
      isValid: finalMonthlyValue >= this.MIN_MONTHLY_VALUE,
      warnings: this.generateWarnings(discountDetails, finalMonthlyValue)
    }
  }
  
  /**
   * Calcula detalhes dos descontos aplicados
   */
  private static calculateDiscountDetails(
    baseValue: number,
    discounts: DiscountSelection[]
  ): DiscountedPrice {
    
    const details = discounts.map(discount => ({
      discountId: discount.discount_id,
      discountCode: discount.discount_code,
      percentage: discount.percentage,
      value: (baseValue * discount.percentage) / 100,
      requiresDocuments: discount.requires_documents || false
    }))
    
    const totalPercentage = details.reduce((sum, d) => sum + d.percentage, 0)
    const totalValue = details.reduce((sum, d) => sum + d.value, 0)
    
    return {
      appliedDiscounts: details,
      totalPercentage: Math.min(totalPercentage, this.MAX_DISCOUNT_PERCENTAGE),
      totalValue,
      exceedsLimit: totalPercentage > this.MAX_DISCOUNT_PERCENTAGE
    }
  }
  
  /**
   * Calcula plano de parcelamento
   */
  private static calculateInstallments(
    monthlyValue: number,
    materialCost: number,
    numberOfInstallments: number
  ): PaymentPlan {
    
    const installments: InstallmentDetails[] = []
    const today = new Date()
    
    // Material na primeira parcela
    const firstInstallmentValue = monthlyValue + materialCost
    
    for (let i = 0; i < numberOfInstallments; i++) {
      const dueDate = new Date(today)
      dueDate.setMonth(dueDate.getMonth() + i + 1)
      dueDate.setDate(this.AVAILABLE_DUE_DATES[0]) // Default: dia 5
      
      installments.push({
        installmentNumber: i + 1,
        dueDate,
        baseValue: monthlyValue,
        additionalCharges: i === 0 ? materialCost : 0,
        totalValue: i === 0 ? firstInstallmentValue : monthlyValue,
        status: 'pending'
      })
    }
    
    return {
      numberOfInstallments,
      installments,
      totalValue: monthlyValue * numberOfInstallments + materialCost,
      averageInstallmentValue: (monthlyValue * numberOfInstallments + materialCost) / numberOfInstallments,
      firstInstallmentValue,
      regularInstallmentValue: monthlyValue
    }
  }
  
  /**
   * Calcula desconto da forma de pagamento
   */
  private static getPaymentMethodDiscount(
    value: number,
    paymentMethodId: string
  ): number {
    const method = this.PAYMENT_METHODS.find(m => m.id === paymentMethodId)
    if (!method) return 0
    
    return (value * method.discount) / 100
  }
  
  /**
   * Compara com valores do ano anterior
   */
  private static compareWithPreviousYear(
    currentValue: number,
    previousValue: number
  ): FinancialComparison {
    
    const difference = currentValue - previousValue
    const percentageChange = previousValue > 0 
      ? (difference / previousValue) * 100 
      : 0
    
    return {
      previousValue,
      currentValue,
      difference,
      percentageChange,
      status: difference > 0 ? 'increase' : difference < 0 ? 'decrease' : 'stable'
    }
  }
  
  /**
   * Determina nível de aprovação necessário
   */
  private static determineApprovalLevel(
    totalDiscountPercentage: number
  ): 'automatic' | 'coordination' | 'direction' | 'special' {
    
    if (totalDiscountPercentage <= 20) {
      return 'automatic'
    } else if (totalDiscountPercentage <= 40) {
      return 'coordination'
    } else if (totalDiscountPercentage <= 50) {
      return 'direction'
    } else {
      return 'special'
    }
  }
  
  /**
   * Gera avisos sobre o cálculo
   */
  private static generateWarnings(
    discountDetails: DiscountedPrice,
    finalValue: number
  ): string[] {
    
    const warnings: string[] = []
    
    if (discountDetails.exceedsLimit) {
      warnings.push(
        `Desconto total excede o limite de ${this.MAX_DISCOUNT_PERCENTAGE}%. ` +
        `Aplicado limite máximo.`
      )
    }
    
    if (finalValue === this.MIN_MONTHLY_VALUE) {
      warnings.push(
        `Valor final ajustado para o mínimo permitido de R$ ${this.MIN_MONTHLY_VALUE}`
      )
    }
    
    const docsRequired = discountDetails.appliedDiscounts.filter(d => d.requiresDocuments)
    if (docsRequired.length > 0) {
      warnings.push(
        `${docsRequired.length} desconto(s) requerem apresentação de documentos`
      )
    }
    
    return warnings
  }
  
  /**
   * Calcula multa e juros por atraso
   */
  static calculateLateFees(
    originalValue: number,
    dueDate: Date,
    paymentDate: Date = new Date()
  ): LatePaymentFees {
    
    const daysLate = Math.floor(
      (paymentDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
    )
    
    if (daysLate <= 0) {
      return {
        daysLate: 0,
        fineAmount: 0,
        interestAmount: 0,
        totalPenalty: 0,
        totalWithPenalty: originalValue
      }
    }
    
    // Multa fixa de 2%
    const fineAmount = originalValue * (this.LATE_PAYMENT_FEE / 100)
    
    // Juros compostos diários
    const interestRate = this.DAILY_INTEREST_RATE / 100
    const interestAmount = originalValue * (Math.pow(1 + interestRate, daysLate) - 1)
    
    const totalPenalty = fineAmount + interestAmount
    
    return {
      daysLate,
      fineAmount,
      interestAmount,
      totalPenalty,
      totalWithPenalty: originalValue + totalPenalty
    }
  }
  
  /**
   * Simula diferentes cenários de pagamento
   */
  static simulatePaymentScenarios(
    series: Series,
    discounts: DiscountSelection[],
    previousYear: PreviousYearFinance | null
  ): Array<{
    method: PaymentMethod
    calculation: FinancialCalculation
  }> {
    
    return this.PAYMENT_METHODS.map(method => ({
      method,
      calculation: this.calculateFinancials(
        series,
        discounts,
        previousYear,
        method.id
      )
    }))
  }
  
  /**
   * Valida viabilidade financeira
   */
  static validateFinancialViability(
    calculation: FinancialCalculation,
    familyIncome?: number
  ): {
    isViable: boolean
    reasons: string[]
    recommendations: string[]
  } {
    
    const reasons: string[] = []
    const recommendations: string[] = []
    
    // Validar valor mínimo
    if (calculation.finalMonthlyValue < this.MIN_MONTHLY_VALUE) {
      reasons.push('Valor mensal abaixo do mínimo permitido')
      recommendations.push('Revisar descontos aplicados')
    }
    
    // Validar comprometimento de renda (se informada)
    if (familyIncome) {
      const incomePercentage = (calculation.finalMonthlyValue / familyIncome) * 100
      
      if (incomePercentage > 30) {
        reasons.push(`Mensalidade compromete ${incomePercentage.toFixed(1)}% da renda familiar`)
        recommendations.push('Considerar solicitar bolsa social ou parcelamento especial')
      }
    }
    
    // Validar aumento em relação ao ano anterior
    if (calculation.comparison && calculation.comparison.percentageChange > 20) {
      reasons.push(`Aumento de ${calculation.comparison.percentageChange.toFixed(1)}% em relação ao ano anterior`)
      recommendations.push('Negociar descontos adicionais ou revisar trilha escolhida')
    }
    
    return {
      isViable: reasons.length === 0,
      reasons,
      recommendations
    }
  }
  
  /**
   * Gera resumo executivo do cálculo
   */
  static generateExecutiveSummary(
    calculation: FinancialCalculation
  ): string {
    
    const lines: string[] = [
      `Valor Base: R$ ${calculation.baseValue.toFixed(2)}`,
      `Descontos: ${calculation.effectiveDiscountPercentage.toFixed(1)}% (R$ ${calculation.effectiveDiscountValue.toFixed(2)})`,
      `Valor Final: R$ ${calculation.finalMonthlyValue.toFixed(2)}/mês`,
      `Total Anual: R$ ${calculation.totalAnnualValue.toFixed(2)}`,
    ]
    
    if (calculation.comparison) {
      const change = calculation.comparison.percentageChange
      const status = change > 0 ? 'Aumento' : change < 0 ? 'Redução' : 'Estável'
      lines.push(`${status}: ${Math.abs(change).toFixed(1)}% vs ano anterior`)
    }
    
    lines.push(`Aprovação: Nível ${calculation.approvalLevel}`)
    
    if (calculation.warnings.length > 0) {
      lines.push('⚠️ Avisos:')
      calculation.warnings.forEach(w => lines.push(`  • ${w}`))
    }
    
    return lines.join('\n')
  }
}