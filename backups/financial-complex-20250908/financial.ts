/**
 * Tipos para o sistema de cálculo financeiro da rematrícula
 * Independente do sistema de nova matrícula
 */

/**
 * Detalhes de uma parcela individual
 */
export interface InstallmentDetails {
  installmentNumber: number
  dueDate: Date
  baseValue: number
  additionalCharges: number // Material, taxas, etc
  totalValue: number
  status: 'pending' | 'paid' | 'overdue' | 'cancelled'
  paymentDate?: Date
  paymentMethod?: string
  transactionId?: string
}

/**
 * Plano completo de parcelamento
 */
export interface PaymentPlan {
  numberOfInstallments: number
  installments: InstallmentDetails[]
  totalValue: number
  averageInstallmentValue: number
  firstInstallmentValue: number
  regularInstallmentValue: number
}

/**
 * Detalhes de desconto aplicado
 */
export interface AppliedDiscountDetail {
  discountId: string
  discountCode: string
  percentage: number
  value: number
  requiresDocuments: boolean
}

/**
 * Resumo de preços com descontos
 */
export interface DiscountedPrice {
  appliedDiscounts: AppliedDiscountDetail[]
  totalPercentage: number
  totalValue: number
  exceedsLimit: boolean
}

/**
 * Método de pagamento disponível
 */
export interface PaymentMethod {
  id: string
  name: string
  discount: number // Percentual de desconto adicional
  enabled?: boolean
  restrictions?: string[]
}

/**
 * Comparação financeira com período anterior
 */
export interface FinancialComparison {
  previousValue: number
  currentValue: number
  difference: number
  percentageChange: number
  status: 'increase' | 'decrease' | 'stable'
}

/**
 * Cálculo de multa e juros por atraso
 */
export interface LatePaymentFees {
  daysLate: number
  fineAmount: number
  interestAmount: number
  totalPenalty: number
  totalWithPenalty: number
}

/**
 * Resultado completo do cálculo financeiro
 */
export interface FinancialCalculation {
  // Valores base
  baseValue: number
  materialCost: number
  
  // Descontos
  discountDetails: DiscountedPrice
  effectiveDiscountPercentage: number
  effectiveDiscountValue: number
  
  // Valores finais
  monthlyValueWithDiscounts: number
  paymentMethodDiscount: number
  finalMonthlyValue: number
  
  // Parcelamento
  installmentPlan: PaymentPlan
  totalAnnualValue: number
  
  // Comparação
  comparison: FinancialComparison | null
  
  // Metadados
  approvalLevel: 'automatic' | 'coordination' | 'direction' | 'special'
  requiresSpecialApproval: boolean
  calculatedAt: Date
  
  // Validações
  isValid: boolean
  warnings: string[]
}

/**
 * Opções de simulação financeira
 */
export interface SimulationOptions {
  paymentMethods?: string[]
  installmentOptions?: number[]
  includeTaxes?: boolean
  includeLateFees?: boolean
}

/**
 * Resultado de simulação financeira
 */
export interface SimulationResult {
  scenarios: Array<{
    paymentMethod: string
    installments: number
    monthlyValue: number
    totalValue: number
    savings: number
  }>
  bestOption: {
    method: string
    reason: string
    monthlySavings: number
  }
  warnings: string[]
}

/**
 * Configuração de vencimento
 */
export interface DueDateConfiguration {
  preferredDay: number // 1-31
  alternativeDays: number[]
  gracePeriod: number // Dias de carência
  weekendHandling: 'before' | 'after' | 'keep'
}

/**
 * Status de pagamento detalhado
 */
export interface PaymentStatus {
  installmentId: string
  status: 'pending' | 'paid' | 'partial' | 'overdue' | 'cancelled'
  dueDate: Date
  originalValue: number
  paidValue: number
  remainingValue: number
  paymentHistory: Array<{
    date: Date
    amount: number
    method: string
    reference: string
  }>
  fees?: LatePaymentFees
}

/**
 * Relatório financeiro consolidado
 */
export interface FinancialReport {
  student: {
    id: string
    name: string
    cpf: string
    series: string
  }
  period: {
    year: number
    startMonth: number
    endMonth: number
  }
  summary: {
    totalContracted: number
    totalPaid: number
    totalPending: number
    totalOverdue: number
    totalDiscounts: number
  }
  installments: PaymentStatus[]
  projections: {
    nextDueDate: Date
    nextDueValue: number
    estimatedYearTotal: number
  }
}

/**
 * Parâmetros para recálculo financeiro
 */
export interface RecalculationParams {
  reason: 'discount_change' | 'payment_method_change' | 'installment_change' | 'correction'
  previousCalculation: FinancialCalculation
  changes: {
    discounts?: any[]
    paymentMethod?: string
    installments?: number
  }
  authorizedBy?: string
  notes?: string
}

/**
 * Histórico de cálculos financeiros
 */
export interface CalculationHistory {
  id: string
  timestamp: Date
  calculation: FinancialCalculation
  reason: string
  authorizedBy?: string
  status: 'active' | 'superseded' | 'cancelled'
}