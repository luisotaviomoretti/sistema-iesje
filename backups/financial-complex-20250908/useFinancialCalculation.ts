/**
 * Hook para cálculos financeiros da rematrícula
 * Integra o FinancialCalculationEngine com React
 * Totalmente independente do sistema de nova matrícula
 */

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { FinancialCalculationEngine } from '../../services/financialCalculationEngine'
import {
  FinancialCalculation,
  PaymentMethod,
  SimulationResult,
  DueDateConfiguration,
  RecalculationParams,
  LatePaymentFees
} from '../../types/financial'
import { DiscountSelection, PreviousYearStudent } from '../../types/rematricula'

interface Series {
  id: string
  nome: string
  valor_mensal_sem_material: number
  valor_material: number
  numero_parcelas: number
  escola: 'pelicano' | 'sete_setembro'
}

interface UseFinancialCalculationParams {
  selectedSeries: Series | null
  selectedDiscounts: DiscountSelection[]
  previousYearData: PreviousYearStudent | null
  enabled?: boolean
}

interface UseFinancialCalculationReturn {
  // Cálculo principal
  calculation: FinancialCalculation | null
  isCalculating: boolean
  calculationError: Error | null
  
  // Configurações
  paymentMethod: string
  setPaymentMethod: (method: string) => void
  installments: number
  setInstallments: (count: number) => void
  dueDate: number
  setDueDate: (day: number) => void
  
  // Simulações
  simulations: SimulationResult | null
  runSimulation: () => void
  isSimulating: boolean
  
  // Comparações
  yearOverYearChange: number | null
  savingsWithCurrentConfig: number
  
  // Ações
  recalculate: () => void
  applyBestOption: () => void
  validateViability: (familyIncome?: number) => {
    isViable: boolean
    reasons: string[]
    recommendations: string[]
  }
  
  // Exportações
  exportSummary: () => string
  exportDetailed: () => object
  
  // Pagamento em atraso
  calculateLateFees: (dueDate: Date, paymentDate?: Date) => LatePaymentFees
  
  // Formas de pagamento disponíveis
  availablePaymentMethods: PaymentMethod[]
  
  // Avisos e validações
  warnings: string[]
  hasSpecialApproval: boolean
  approvalLevel: string
}

// Formas de pagamento padrão
const DEFAULT_PAYMENT_METHODS: PaymentMethod[] = [
  { id: 'boleto', name: 'Boleto Bancário', discount: 0 },
  { id: 'pix', name: 'PIX', discount: 2 },
  { id: 'cartao_credito', name: 'Cartão de Crédito', discount: 0 },
  { id: 'cartao_debito', name: 'Cartão de Débito', discount: 1 },
  { id: 'dinheiro', name: 'Dinheiro', discount: 3 }
]

/**
 * Hook principal para cálculos financeiros
 */
export function useFinancialCalculation({
  selectedSeries,
  selectedDiscounts,
  previousYearData,
  enabled = true
}: UseFinancialCalculationParams): UseFinancialCalculationReturn {
  
  // Estado local
  const [paymentMethod, setPaymentMethod] = useState<string>('boleto')
  const [installments, setInstallments] = useState<number>(12)
  const [dueDate, setDueDate] = useState<number>(5)
  const [simulations, setSimulations] = useState<SimulationResult | null>(null)
  
  // Dados financeiros do ano anterior
  const previousYearFinance = useMemo(() => {
    if (!previousYearData?.financial) return null
    
    return {
      base_value: previousYearData.financial.base_value,
      total_discounts: previousYearData.financial.total_discounts || 0,
      final_monthly_value: previousYearData.financial.final_monthly_value,
      material_cost: previousYearData.financial.material_cost || 0,
      payment_method: previousYearData.financial.payment_method || 'boleto',
      installments: previousYearData.financial.installments || 12
    }
  }, [previousYearData])
  
  // Query para cálculo principal
  const calculationQuery = useQuery({
    queryKey: [
      'financial-calculation',
      selectedSeries?.id,
      selectedDiscounts,
      paymentMethod,
      installments,
      previousYearFinance
    ],
    queryFn: async () => {
      if (!selectedSeries) {
        return null
      }
      
      const calculation = FinancialCalculationEngine.calculateFinancials(
        selectedSeries,
        selectedDiscounts,
        previousYearFinance,
        paymentMethod,
        installments
      )
      
      return calculation
    },
    enabled: enabled && !!selectedSeries,
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 5 * 60 * 1000 // 5 minutos
  })
  
  // Mutation para simulações
  const simulationMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSeries) {
        throw new Error('Série não selecionada')
      }
      
      const scenarios = FinancialCalculationEngine.simulatePaymentScenarios(
        selectedSeries,
        selectedDiscounts,
        previousYearFinance
      )
      
      // Processar cenários para encontrar melhor opção
      const processedScenarios = scenarios.map(s => ({
        paymentMethod: s.method.id,
        installments: installments,
        monthlyValue: s.calculation.finalMonthlyValue,
        totalValue: s.calculation.totalAnnualValue,
        savings: s.calculation.paymentMethodDiscount || 0
      }))
      
      // Encontrar melhor opção
      const bestOption = processedScenarios.reduce((best, current) => {
        if (current.totalValue < best.totalValue) {
          return current
        }
        return best
      })
      
      const result: SimulationResult = {
        scenarios: processedScenarios,
        bestOption: {
          method: bestOption.paymentMethod,
          reason: `Menor valor total anual`,
          monthlySavings: bestOption.savings
        },
        warnings: []
      }
      
      return result
    },
    onSuccess: (data) => {
      setSimulations(data)
    }
  })
  
  // Comparação ano a ano
  const yearOverYearChange = useMemo(() => {
    if (!calculationQuery.data?.comparison) return null
    return calculationQuery.data.comparison.percentageChange
  }, [calculationQuery.data])
  
  // Economia com configuração atual
  const savingsWithCurrentConfig = useMemo(() => {
    if (!calculationQuery.data) return 0
    return calculationQuery.data.paymentMethodDiscount || 0
  }, [calculationQuery.data])
  
  // Recalcular
  const recalculate = useCallback(() => {
    calculationQuery.refetch()
  }, [calculationQuery])
  
  // Aplicar melhor opção
  const applyBestOption = useCallback(() => {
    if (simulations?.bestOption) {
      setPaymentMethod(simulations.bestOption.method)
      // Recalcular após mudança
      setTimeout(() => recalculate(), 100)
    }
  }, [simulations, recalculate])
  
  // Validar viabilidade
  const validateViability = useCallback((familyIncome?: number) => {
    if (!calculationQuery.data) {
      return {
        isViable: false,
        reasons: ['Cálculo não disponível'],
        recommendations: ['Aguarde o cálculo ser concluído']
      }
    }
    
    return FinancialCalculationEngine.validateFinancialViability(
      calculationQuery.data,
      familyIncome
    )
  }, [calculationQuery.data])
  
  // Exportar resumo
  const exportSummary = useCallback(() => {
    if (!calculationQuery.data) {
      return 'Cálculo não disponível'
    }
    
    return FinancialCalculationEngine.generateExecutiveSummary(calculationQuery.data)
  }, [calculationQuery.data])
  
  // Exportar detalhado
  const exportDetailed = useCallback(() => {
    if (!calculationQuery.data) {
      return {}
    }
    
    return {
      calculation: calculationQuery.data,
      configuration: {
        paymentMethod,
        installments,
        dueDate
      },
      simulations,
      timestamp: new Date().toISOString()
    }
  }, [calculationQuery.data, paymentMethod, installments, dueDate, simulations])
  
  // Calcular multa por atraso
  const calculateLateFees = useCallback((dueDate: Date, paymentDate?: Date) => {
    if (!calculationQuery.data) {
      return {
        daysLate: 0,
        fineAmount: 0,
        interestAmount: 0,
        totalPenalty: 0,
        totalWithPenalty: 0
      }
    }
    
    return FinancialCalculationEngine.calculateLateFees(
      calculationQuery.data.finalMonthlyValue,
      dueDate,
      paymentDate
    )
  }, [calculationQuery.data])
  
  // Executar simulação
  const runSimulation = useCallback(() => {
    simulationMutation.mutate()
  }, [simulationMutation])
  
  // Auto-executar simulação quando mudam os parâmetros principais
  useEffect(() => {
    if (selectedSeries && selectedDiscounts.length > 0) {
      const timer = setTimeout(() => {
        runSimulation()
      }, 500) // Debounce de 500ms
      
      return () => clearTimeout(timer)
    }
  }, [selectedSeries, selectedDiscounts, runSimulation])
  
  // Avisos do cálculo
  const warnings = useMemo(() => {
    return calculationQuery.data?.warnings || []
  }, [calculationQuery.data])
  
  // Nível de aprovação
  const approvalLevel = useMemo(() => {
    if (!calculationQuery.data) return 'automatic'
    
    const levels = {
      automatic: 'Automática',
      coordination: 'Coordenação',
      direction: 'Direção',
      special: 'Especial'
    }
    
    return levels[calculationQuery.data.approvalLevel] || 'Automática'
  }, [calculationQuery.data])
  
  return {
    // Cálculo principal
    calculation: calculationQuery.data || null,
    isCalculating: calculationQuery.isLoading,
    calculationError: calculationQuery.error as Error | null,
    
    // Configurações
    paymentMethod,
    setPaymentMethod,
    installments,
    setInstallments,
    dueDate,
    setDueDate,
    
    // Simulações
    simulations,
    runSimulation,
    isSimulating: simulationMutation.isPending,
    
    // Comparações
    yearOverYearChange,
    savingsWithCurrentConfig,
    
    // Ações
    recalculate,
    applyBestOption,
    validateViability,
    
    // Exportações
    exportSummary,
    exportDetailed,
    
    // Pagamento em atraso
    calculateLateFees,
    
    // Formas de pagamento
    availablePaymentMethods: DEFAULT_PAYMENT_METHODS,
    
    // Avisos e validações
    warnings,
    hasSpecialApproval: calculationQuery.data?.requiresSpecialApproval || false,
    approvalLevel
  }
}