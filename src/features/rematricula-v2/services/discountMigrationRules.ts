/**
 * Motor de Migração de Descontos
 * Analisa e valida transferência de descontos do ano anterior
 * Totalmente independente do sistema de nova matrícula
 */

import { 
  EligibilityContext, 
  DiscountAnalysisResult,
  MigrationAnalysisComplete,
  MigrationStrategy 
} from '../types/migration'
import { DiscountSelection } from '../types/rematricula'

// Tipos específicos para o motor
interface PreviousYearDiscount {
  discount_id: string
  discount_code: string
  discount_name: string
  percentage_applied: number
  category: string
  required_documents?: string[]
  expiration_date?: string
}

interface EligibilityCheckResult {
  status: 'eligible' | 'ineligible' | 'needs_validation'
  reason?: string
  validationSteps?: string[]
  documentsRequired?: string[]
}

interface DiscountMigrationItem {
  discount: PreviousYearDiscount
  eligibilityResult: EligibilityCheckResult
  canKeep: boolean
  requiresNewDocuments: boolean
}

/**
 * Motor de análise e migração de descontos
 * Independente e sem acoplamento com useEnrollmentForm
 */
export class DiscountMigrationEngine {
  
  // Descontos que sempre precisam revalidação anual
  private static readonly ANNUAL_VALIDATION_REQUIRED = ['PAV', 'CEP', 'ADI']
  
  // Descontos que dependem de CEP
  private static readonly CEP_DEPENDENT = ['CEP', 'RES']
  
  // Descontos vinculados ao emprego/função dos pais
  private static readonly EMPLOYMENT_BASED = ['PASS', 'PBS', 'COL', 'SAE']
  
  // Limite máximo de desconto cumulativo
  private static readonly MAX_CUMULATIVE_DISCOUNT = 60

  /**
   * Analisa a migração de descontos do ano anterior
   */
  static analyzeMigration(
    previousDiscounts: PreviousYearDiscount[],
    currentContext: EligibilityContext
  ): MigrationAnalysisComplete {
    
    const startTime = Date.now()
    const discountAnalysis: DiscountAnalysisResult[] = []
    const warnings: string[] = []
    
    // Análise individual de cada desconto
    for (const discount of previousDiscounts) {
      const analysis = this.analyzeDiscount(discount, currentContext)
      discountAnalysis.push(analysis)
      
      // Adicionar avisos se necessário
      if (!analysis.canKeep && analysis.reasonIfCantKeep) {
        warnings.push(`${discount.discount_name}: ${analysis.reasonIfCantKeep}`)
      }
    }
    
    // Calcular resumo
    const summary = {
      totalPreviousDiscounts: previousDiscounts.length,
      eligibleToKeep: discountAnalysis.filter(d => d.canKeep && !d.requiresNewDocuments).length,
      requiresRevalidation: discountAnalysis.filter(d => d.requiresNewDocuments).length,
      noLongerEligible: discountAnalysis.filter(d => !d.canKeep).length,
      newDiscountsAvailable: 0 // Será calculado em outro método
    }
    
    // Determinar estratégia recomendada
    const recommendedStrategy = this.determineRecommendedStrategy(summary)
    
    // Calcular impacto financeiro
    const financialImpact = this.calculateFinancialImpact(
      previousDiscounts,
      discountAnalysis,
      1000 // Base value placeholder - será passado como parâmetro em produção
    )
    
    return {
      discountAnalysis,
      summary,
      recommendedStrategy,
      financialImpact,
      warnings,
      analyzedAt: new Date()
    }
  }
  
  /**
   * Analisa um desconto individual
   */
  private static analyzeDiscount(
    discount: PreviousYearDiscount,
    context: EligibilityContext
  ): DiscountAnalysisResult {
    
    const eligibility = this.checkCurrentEligibility(discount, context)
    
    return {
      discountCode: discount.discount_code,
      discountName: discount.discount_name,
      previousPercentage: discount.percentage_applied,
      canKeep: eligibility.status === 'eligible',
      requiresNewDocuments: eligibility.status === 'needs_validation',
      reasonIfCantKeep: eligibility.reason,
      requiredDocuments: eligibility.documentsRequired?.map((doc, index) => ({
        id: `doc_${discount.discount_code}_${index}`,
        name: doc,
        status: 'pending' as const
      }))
    }
  }
  
  /**
   * Verifica elegibilidade atual do desconto
   */
  private static checkCurrentEligibility(
    discount: PreviousYearDiscount,
    context: EligibilityContext
  ): EligibilityCheckResult {
    
    // Desconto de irmãos (IIR) - sempre elegível se tinha antes
    if (discount.discount_code === 'IIR') {
      return { 
        status: 'eligible',
        documentsRequired: ['Comprovante de matrícula do irmão']
      }
    }
    
    // Descontos que precisam revalidação anual
    if (this.ANNUAL_VALIDATION_REQUIRED.includes(discount.discount_code)) {
      return {
        status: 'needs_validation',
        validationSteps: ['Apresentar documentação atualizada'],
        documentsRequired: this.getRequiredDocuments(discount.discount_code)
      }
    }
    
    // Descontos dependentes de CEP
    if (this.CEP_DEPENDENT.includes(discount.discount_code)) {
      // Aqui seria feita validação real com CEP
      // Por enquanto, mock de validação
      const isEligibleByCEP = this.validateCEPEligibility(context.cep, discount.discount_code)
      
      if (!isEligibleByCEP) {
        return {
          status: 'ineligible',
          reason: 'CEP não está mais na área de cobertura do desconto'
        }
      }
    }
    
    // Descontos baseados em emprego
    if (this.EMPLOYMENT_BASED.includes(discount.discount_code)) {
      return {
        status: 'needs_validation',
        validationSteps: ['Apresentar comprovante de vínculo empregatício atualizado'],
        documentsRequired: this.getEmploymentDocuments(discount.discount_code)
      }
    }
    
    // Bolsas filantrópicas
    if (discount.discount_code === 'ABI' || discount.discount_code === 'ABP') {
      return {
        status: 'needs_validation',
        validationSteps: ['Renovação da análise socioeconômica'],
        documentsRequired: this.getSocialDocuments()
      }
    }
    
    // Desconto padrão - manter se não há regra específica
    return { status: 'eligible' }
  }
  
  /**
   * Valida elegibilidade por CEP
   */
  private static validateCEPEligibility(cep: string, discountCode: string): boolean {
    // Mock - em produção consultaria banco de dados
    const eligibleCEPs = {
      'CEP': ['44001', '44002', '44003'], // CEPs centrais
      'RES': ['44050', '44051', '44052']  // CEPs residenciais
    }
    
    const cepPrefix = cep.substring(0, 5).replace('-', '')
    return eligibleCEPs[discountCode]?.includes(cepPrefix) || false
  }
  
  /**
   * Retorna documentos necessários por tipo de desconto
   */
  private static getRequiredDocuments(discountCode: string): string[] {
    const documentMap: Record<string, string[]> = {
      'PAV': ['Comprovante de pagamento à vista'],
      'CEP': ['Comprovante de endereço atualizado'],
      'ADI': ['Declaração de adimplência'],
      'IIR': ['Comprovante de matrícula do irmão', 'Certidão de nascimento dos irmãos'],
      'RES': ['Comprovante de residência', 'Declaração de distância']
    }
    
    return documentMap[discountCode] || ['Documentação padrão']
  }
  
  /**
   * Retorna documentos de vínculo empregatício
   */
  private static getEmploymentDocuments(discountCode: string): string[] {
    const documentMap: Record<string, string[]> = {
      'PASS': ['Contracheque atual', 'Carteira de trabalho', 'Declaração da escola'],
      'PBS': ['Contracheque atual', 'Declaração do sindicato', 'Carteira de trabalho'],
      'COL': ['Contracheque atual', 'Carteira funcional', 'Declaração do RH'],
      'SAE': ['Contracheque atual', 'Declaração do sindicato SAAE', 'Carteira de trabalho']
    }
    
    return documentMap[discountCode] || ['Comprovante de vínculo']
  }
  
  /**
   * Retorna documentos socioeconômicos
   */
  private static getSocialDocuments(): string[] {
    return [
      'Comprovante de renda familiar',
      'Comprovante de residência',
      'Declaração de imposto de renda',
      'Comprovantes de despesas básicas',
      'Questionário socioeconômico'
    ]
  }
  
  /**
   * Determina estratégia recomendada
   */
  private static determineRecommendedStrategy(
    summary: MigrationAnalysisComplete['summary']
  ): MigrationStrategy {
    
    const keepRatio = summary.eligibleToKeep / summary.totalPreviousDiscounts
    
    if (keepRatio >= 0.8) {
      return 'inherit_all' // Maioria elegível, herdar todos
    } else if (keepRatio >= 0.5) {
      return 'inherit_selected' // Metade elegível, seleção parcial
    } else if (summary.requiresRevalidation > summary.eligibleToKeep) {
      return 'hybrid' // Muitos precisam revalidação, abordagem híbrida
    } else {
      return 'manual' // Poucos elegíveis, seleção manual
    }
  }
  
  /**
   * Calcula impacto financeiro da migração
   */
  private static calculateFinancialImpact(
    previousDiscounts: PreviousYearDiscount[],
    currentAnalysis: DiscountAnalysisResult[],
    baseValue: number
  ): MigrationAnalysisComplete['financialImpact'] {
    
    // Calcular valor anterior
    const previousTotalPercentage = previousDiscounts.reduce(
      (sum, d) => Math.min(sum + d.percentage_applied, this.MAX_CUMULATIVE_DISCOUNT),
      0
    )
    const previousMonthlyValue = baseValue * (1 - previousTotalPercentage / 100)
    
    // Calcular valor projetado (apenas descontos mantidos)
    const maintainedDiscounts = currentAnalysis.filter(d => d.canKeep)
    const projectedTotalPercentage = maintainedDiscounts.reduce(
      (sum, d) => Math.min(sum + d.previousPercentage, this.MAX_CUMULATIVE_DISCOUNT),
      0
    )
    const projectedMonthlyValue = baseValue * (1 - projectedTotalPercentage / 100)
    
    const difference = projectedMonthlyValue - previousMonthlyValue
    const percentageChange = (difference / previousMonthlyValue) * 100
    
    return {
      previousMonthlyValue,
      projectedMonthlyValue,
      difference,
      percentageChange
    }
  }
  
  /**
   * Busca novos descontos disponíveis
   */
  static async findNewlyAvailableDiscounts(
    context: EligibilityContext,
    currentDiscounts: string[]
  ): Promise<DiscountSelection[]> {
    
    // Mock de novos descontos disponíveis
    // Em produção, consultaria banco de dados com regras de elegibilidade
    const allAvailableDiscounts: DiscountSelection[] = [
      {
        discount_id: 'desc_1',
        discount_code: 'CEP',
        percentage: 10,
        requires_documents: false
      },
      {
        discount_id: 'desc_2',
        discount_code: 'ADI',
        percentage: 5,
        requires_documents: true
      }
    ]
    
    // Filtrar apenas os que o aluno ainda não tem
    return allAvailableDiscounts.filter(
      d => !currentDiscounts.includes(d.discount_code)
    )
  }
  
  /**
   * Valida conjunto de descontos selecionados
   */
  static validateDiscountSet(
    selectedDiscounts: DiscountSelection[]
  ): { 
    isValid: boolean
    totalPercentage: number
    errors: string[] 
  } {
    
    const errors: string[] = []
    
    // Calcular total
    const totalPercentage = selectedDiscounts.reduce(
      (sum, d) => sum + d.percentage,
      0
    )
    
    // Validar limite máximo
    if (totalPercentage > this.MAX_CUMULATIVE_DISCOUNT) {
      errors.push(`Total de descontos (${totalPercentage}%) excede o limite de ${this.MAX_CUMULATIVE_DISCOUNT}%`)
    }
    
    // Validar conflitos
    const codes = selectedDiscounts.map(d => d.discount_code)
    
    // Exemplo: não pode ter CEP e RES ao mesmo tempo
    if (codes.includes('CEP') && codes.includes('RES')) {
      errors.push('Descontos CEP e RES não podem ser combinados')
    }
    
    // Exemplo: bolsas integrais são exclusivas
    if (codes.includes('ABI') && codes.length > 1) {
      errors.push('Bolsa integral não pode ser combinada com outros descontos')
    }
    
    return {
      isValid: errors.length === 0,
      totalPercentage: Math.min(totalPercentage, this.MAX_CUMULATIVE_DISCOUNT),
      errors
    }
  }
}