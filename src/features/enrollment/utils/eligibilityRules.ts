/**
 * Sistema de Regras de Elegibilidade de Descontos por CEP
 * 
 * Este módulo contém a lógica central para determinar se um desconto
 * está disponível para um determinado CEP baseado nas regras de negócio.
 */

import type { DatabaseDiscount } from '../../matricula-nova/types/api'
import type { 
  CepCategory,
  TrilhoType,
  HardcodedEligibilityRule,
  DatabaseEligibilityRule,
  EligibilityRuleContext,
  EligibilityRuleResult,
  DiscountEligibilityCheck
} from '../types/eligibility'

// ===================================================================
// REGRAS HARDCODED (REGRAS DE NEGÓCIO PRINCIPAIS)
// ===================================================================

/**
 * Códigos de desconto considerados ESPECIAIS
 * Estes descontos devem estar sempre disponíveis no trilho especial
 */
const SPECIAL_DISCOUNT_CODES = ['ABI', 'ABP', 'PASS', 'PBS', 'COL', 'SAE']

/**
 * Regras hardcoded que sempre têm precedência sobre dados do banco
 * Estas são as regras de negócio fundamentais do sistema
 */
const HARDCODED_RULES: HardcodedEligibilityRule[] = [
  {
    discountCode: 'RES',
    rules: {
      'fora': true,   // Elegível se fora de Poços de Caldas
      'baixa': false, // Não elegível se em Poços (independente da renda)
      'alta': false   // Não elegível se em Poços (independente da renda)
    },
    restrictionReasons: {
      'fora': null,
      'baixa': 'Desconto para outras cidades não se aplica a residentes de Poços de Caldas',
      'alta': 'Desconto para outras cidades não se aplica a residentes de Poços de Caldas'
    },
    suggestions: {
      'fora': null,
      'baixa': 'Considere o desconto CEP automático disponível para sua região',
      'alta': 'Explore outros tipos de desconto disponíveis para sua situação'
    }
  },
  {
    discountCode: 'CEP',
    rules: {
      'fora': false,  // Não elegível (RES já cobre esta situação)
      'baixa': true,  // Elegível em bairros de menor renda
      'alta': false   // Não elegível em bairros de maior renda
    },
    restrictionReasons: {
      'fora': 'Desconto CEP não se aplica para fora de Poços de Caldas (use desconto RES)',
      'baixa': null,
      'alta': 'Desconto CEP automático não disponível para bairros de maior renda'
    },
    suggestions: {
      'fora': 'O desconto RES (Outras Cidades) está disponível para você',
      'baixa': null,
      'alta': 'Outros tipos de desconto podem estar disponíveis para sua situação'
    }
  },
  {
    discountCode: 'CEP5',
    rules: {
      'fora': false,  // Não elegível
      'baixa': true,  // Elegível apenas para menor renda
      'alta': false   // Não elegível para maior renda
    },
    restrictionReasons: {
      'fora': 'Desconto CEP5 não se aplica para fora de Poços de Caldas',
      'baixa': null,
      'alta': 'Desconto CEP5 disponível apenas para bairros de menor renda'
    },
    suggestions: {
      'fora': 'Considere o desconto RES (Outras Cidades)',
      'baixa': null,
      'alta': 'Explore outros tipos de desconto disponíveis'
    }
  },
  {
    discountCode: 'CEP10',
    rules: {
      'fora': true,   // Elegível para fora de Poços
      'baixa': false, // Não elegível em Poços
      'alta': false   // Não elegível em Poços
    },
    restrictionReasons: {
      'fora': null,
      'baixa': 'Desconto CEP10 não se aplica para residentes de Poços de Caldas',
      'alta': 'Desconto CEP10 não se aplica para residentes de Poços de Caldas'
    },
    suggestions: {
      'fora': null,
      'baixa': 'O desconto CEP5 pode estar disponível para sua região',
      'alta': 'Explore outros tipos de desconto disponíveis'
    }
  }
]

// ===================================================================
// FUNÇÕES PRINCIPAIS DE ANÁLISE
// ===================================================================

/**
 * Verifica se um desconto é especial baseado no código
 */
export function isSpecialDiscount(discount: DatabaseDiscount): boolean {
  return SPECIAL_DISCOUNT_CODES.includes(discount.codigo.toUpperCase())
}

/**
 * Aplica regras de elegibilidade para um desconto específico
 */
export function applyEligibilityRules(
  discount: DatabaseDiscount,
  cepCategory: CepCategory,
  trilhoType: TrilhoType | undefined = undefined,
  databaseRule: DatabaseEligibilityRule | null = null
): EligibilityRuleResult {
  const context: EligibilityRuleContext = {
    discount,
    cepCategory,
    trilhoType,
    databaseRule,
    hardcodedRule: findHardcodedRule(discount.codigo)
  }

  // REGRA ESPECIAL: Trilho Especial + Desconto Especial = Sempre Elegível
  if (trilhoType === 'especial' && isSpecialDiscount(discount)) {
    return {
      eligible: true,
      reason: null,
      suggestion: undefined,
      ruleSource: 'trilho-especial',
      confidence: 'high'
    }
  }

  // 1. Verificar regras hardcoded primeiro (têm precedência)
  const hardcodedResult = applyHardcodedRule(context)
  if (hardcodedResult) {
    return hardcodedResult
  }

  // 2. Usar regra do banco de dados se existir
  const databaseResult = applyDatabaseRule(context)
  if (databaseResult) {
    return databaseResult
  }

  // 3. Aplicar regra padrão (elegível para outros descontos)
  return applyDefaultRule(context)
}

/**
 * Analisa elegibilidade para uma lista de descontos
 */
export function analyzeDiscountEligibility(
  discounts: DatabaseDiscount[],
  cepCategory: CepCategory | null,
  trilhoType: TrilhoType | undefined = undefined,
  databaseRules: DatabaseEligibilityRule[] = []
): DiscountEligibilityCheck[] {
  if (!cepCategory) {
    // Se não há categoria, todos são elegíveis (fallback seguro)
    return discounts.map(discount => ({
      discount,
      eligible: true,
      reason: null,
      ruleApplied: 'default' as const
    }))
  }

  return discounts.map(discount => {
    const databaseRule = databaseRules.find(rule => 
      rule.tipo_desconto_codigo === discount.codigo &&
      rule.categoria_cep === cepCategory
    )

    const result = applyEligibilityRules(discount, cepCategory, trilhoType, databaseRule)

    return {
      discount,
      eligible: result.eligible,
      reason: result.reason,
      suggestion: result.suggestion,
      category: cepCategory,
      ruleApplied: result.ruleSource
    }
  })
}

/**
 * Filtra apenas os descontos elegíveis
 */
export function filterEligibleDiscounts(
  eligibilityChecks: DiscountEligibilityCheck[]
): DatabaseDiscount[] {
  return eligibilityChecks
    .filter(check => check.eligible)
    .map(check => check.discount)
}

/**
 * Filtra apenas os descontos inelegíveis
 */
export function filterIneligibleDiscounts(
  eligibilityChecks: DiscountEligibilityCheck[]
): DiscountEligibilityCheck[] {
  return eligibilityChecks.filter(check => !check.eligible)
}

// ===================================================================
// FUNÇÕES AUXILIARES DE APLICAÇÃO DE REGRAS
// ===================================================================

/**
 * Busca regra hardcoded para um código de desconto
 */
function findHardcodedRule(discountCode: string): HardcodedEligibilityRule | null {
  return HARDCODED_RULES.find(rule => 
    rule.discountCode.toUpperCase() === discountCode.toUpperCase()
  ) || null
}

/**
 * Aplica regra hardcoded se existir
 */
function applyHardcodedRule(context: EligibilityRuleContext): EligibilityRuleResult | null {
  if (!context.hardcodedRule) {
    return null
  }

  const rule = context.hardcodedRule
  const eligible = rule.rules[context.cepCategory]
  const reason = eligible ? null : rule.restrictionReasons[context.cepCategory]
  const suggestion = rule.suggestions?.[context.cepCategory] || undefined

  return {
    eligible,
    reason,
    suggestion,
    ruleSource: 'hardcoded',
    confidence: 'high'
  }
}

/**
 * Aplica regra do banco de dados se existir
 */
function applyDatabaseRule(context: EligibilityRuleContext): EligibilityRuleResult | null {
  if (!context.databaseRule) {
    return null
  }

  const rule = context.databaseRule

  return {
    eligible: rule.elegivel,
    reason: rule.elegivel ? null : (rule.motivo_restricao || 'Não disponível para sua região'),
    suggestion: rule.observacoes || undefined,
    ruleSource: 'database',
    confidence: 'medium'
  }
}

/**
 * Aplica regra padrão (fallback)
 */
function applyDefaultRule(context: EligibilityRuleContext): EligibilityRuleResult {
  // Por padrão, outros descontos são elegíveis
  return {
    eligible: true,
    reason: null,
    ruleSource: 'default',
    confidence: 'low'
  }
}

// ===================================================================
// UTILITÁRIOS PARA MENSAGENS E UI
// ===================================================================

/**
 * Gera mensagem de restrição padrão
 */
export function generateDefaultRestrictionReason(
  discountCode: string,
  cepCategory: CepCategory
): string {
  const categoryNames = {
    'fora': 'fora de Poços de Caldas',
    'baixa': 'bairros de menor renda',
    'alta': 'bairros de maior renda'
  }

  return `Desconto ${discountCode} não disponível para ${categoryNames[cepCategory]}`
}

/**
 * Gera sugestão padrão baseada na categoria
 */
export function generateDefaultSuggestion(
  discountCode: string,
  cepCategory: CepCategory
): string | undefined {
  const suggestions = {
    'fora': 'Considere o desconto RES (Outras Cidades) disponível para sua localização',
    'baixa': 'Verifique se há descontos CEP automáticos disponíveis para sua região',
    'alta': 'Explore outros tipos de desconto disponíveis para sua situação'
  }

  // Não dar sugestão para descontos que já são específicos de CEP
  if (['CEP', 'CEP5', 'CEP10', 'RES'].includes(discountCode.toUpperCase())) {
    return undefined
  }

  return suggestions[cepCategory]
}

/**
 * Obtém nome amigável para código de desconto
 */
export function getFriendlyDiscountName(discountCode: string): string {
  const friendlyNames: Record<string, string> = {
    'IIR': 'Desconto para Irmãos',
    'RES': 'Desconto Outras Cidades',
    'PASS': 'Desconto Professores IESJE',
    'PBS': 'Desconto Professores Outras Inst.',
    'COL': 'Desconto Funcionários IESJE',
    'SAE': 'Desconto Funcionários SAAE',
    'ABI': 'Bolsa Integral Filantropia',
    'ABP': 'Bolsa Parcial Filantropia',
    'PAV': 'Desconto à Vista',
    'CEP': 'Desconto CEP Automático',
    'CEP5': 'Desconto CEP Menor Renda',
    'CEP10': 'Desconto CEP Fora de Poços'
  }

  return friendlyNames[discountCode.toUpperCase()] || discountCode
}

/**
 * Calcula estatísticas de elegibilidade
 */
export function calculateEligibilityStats(
  eligibilityChecks: DiscountEligibilityCheck[]
) {
  const total = eligibilityChecks.length
  const eligible = eligibilityChecks.filter(check => check.eligible).length
  const ineligible = total - eligible

  return {
    totalDiscounts: total,
    eligibleCount: eligible,
    ineligibleCount: ineligible,
    eligibilityRate: total > 0 ? Math.round((eligible / total) * 100) : 0
  }
}

// ===================================================================
// UTILITÁRIOS PARA DEBUG E DESENVOLVIMENTO
// ===================================================================

/**
 * Logs detalhados para debug (apenas em desenvolvimento)
 */
export function debugEligibilityAnalysis(
  cep: string,
  category: CepCategory | null,
  trilhoType: TrilhoType | undefined,
  eligibilityChecks: DiscountEligibilityCheck[]
) {
  if (process.env.NODE_ENV !== 'development') {
    return
  }

  console.group(`🔍 Análise de Elegibilidade - CEP: ${cep}`)
  console.log(`📍 Categoria CEP: ${category}`)
  console.log(`🛤️ Trilho: ${trilhoType || 'não especificado'}`)
  console.log(`📊 Total de descontos analisados: ${eligibilityChecks.length}`)

  const eligible = eligibilityChecks.filter(c => c.eligible)
  const ineligible = eligibilityChecks.filter(c => !c.eligible)
  
  // Destacar descontos especiais no trilho especial
  const specialInSpecial = eligible.filter(c => 
    trilhoType === 'especial' && 
    c.ruleApplied === 'trilho-especial'
  )

  if (specialInSpecial.length > 0) {
    console.log(`⭐ Descontos especiais (trilho especial): ${specialInSpecial.length}`)
    specialInSpecial.forEach(check => {
      console.log(`   ⭐ ${check.discount.codigo} (${check.discount.nome}) - SEMPRE ELEGÍVEL`)
    })
  }

  console.log(`✅ Elegíveis: ${eligible.length}`)
  eligible.forEach(check => {
    const icon = check.ruleApplied === 'trilho-especial' ? '⭐' : '•'
    console.log(`   ${icon} ${check.discount.codigo} (${check.discount.nome}) - ${check.ruleApplied}`)
  })

  console.log(`❌ Inelegíveis: ${ineligible.length}`)
  ineligible.forEach(check => {
    console.log(`   • ${check.discount.codigo} (${check.discount.nome}) - ${check.reason}`)
  })

  console.groupEnd()
}

/**
 * Valida integridade das regras hardcoded
 */
export function validateHardcodedRules(): boolean {
  let isValid = true

  HARDCODED_RULES.forEach(rule => {
    const categories: CepCategory[] = ['fora', 'baixa', 'alta']
    
    categories.forEach(category => {
      // Verificar se todas as categorias têm regras definidas
      if (!(category in rule.rules)) {
        console.error(`❌ Regra ${rule.discountCode}: categoria '${category}' não definida`)
        isValid = false
      }

      // Verificar se restrições estão definidas para regras false
      if (!rule.rules[category] && !rule.restrictionReasons[category]) {
        console.warn(`⚠️ Regra ${rule.discountCode}: categoria '${category}' false mas sem motivo de restrição`)
      }
    })
  })

  return isValid
}

// Executar validação em desenvolvimento
if (process.env.NODE_ENV === 'development') {
  validateHardcodedRules()
}