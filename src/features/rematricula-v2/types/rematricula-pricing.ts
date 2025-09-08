/**
 * Tipos simplificados para cálculo de preços na rematrícula
 * Reutiliza lógica do sistema de nova matrícula
 */

import type { DatabaseSeries, DatabaseDiscount } from '../../matricula-nova/types/api'

/**
 * Dados financeiros do ano anterior
 */
export interface PreviousYearFinance {
  base_value: number
  total_discounts: number
  final_monthly_value: number
  material_cost: number
  applied_discounts?: Array<{
    discount_id: string
    discount_code: string
    percentage: number
  }>
}

/**
 * Resultado do cálculo de preços para rematrícula
 */
export interface RematriculaPricing {
  // Valores base da série
  seriesId: string
  seriesName: string
  baseValue: number // valor_mensal_sem_material
  materialValue: number // valor_material
  totalValue: number // valor_mensal_com_material
  
  // Descontos aplicados
  appliedDiscounts: Array<{
    id: string
    code: string
    name: string
    percentage: number
    value: number
  }>
  
  // Totais
  totalDiscountPercentage: number
  totalDiscountValue: number
  finalMonthlyValue: number
  
  // Validações
  approvalLevel: 'automatic' | 'coordination' | 'direction'
  isValid: boolean
  warnings: string[]
  validationErrors: string[]
}

/**
 * Comparação de preços com ano anterior
 */
export interface PricingComparison {
  previousYearValue: number
  currentYearValue: number
  difference: number
  percentageChange: number
  status: 'increase' | 'decrease' | 'stable'
}

/**
 * Resultado completo do cálculo financeiro
 */
export interface RematriculaFinancialResult {
  series: DatabaseSeries | null
  pricing: RematriculaPricing | null
  comparison: PricingComparison | null
  isLoading: boolean
  error: string | null
}