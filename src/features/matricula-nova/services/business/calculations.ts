import type { DatabaseDiscount, DatabaseSeries } from '../../types/api'
import type { PricingCalculation } from '../../types/business'

/**
 * Calcula pricing com base nos descontos selecionados
 */
export function calculatePricing(params: {
  baseValue: number
  discounts: DatabaseDiscount[]
  trackId?: string
}): PricingCalculation {
  const { baseValue, discounts, trackId } = params

  if (!baseValue || baseValue <= 0) {
    return {
      baseValue: 0,
      discounts: [],
      totalDiscountPercentage: 0,
      totalDiscountValue: 0,
      finalValue: 0,
      isValid: false,
      validationErrors: ['Valor base inválido'],
      warnings: []
    }
  }

  const validationErrors: string[] = []
  const warnings: string[] = []

  // Processar descontos
  const processedDiscounts = discounts.map(discount => ({
    id: discount.id,
    name: discount.nome,
    code: discount.codigo,
    percentage: discount.percentual || 0,
    value: (baseValue * (discount.percentual || 0)) / 100
  }))

  // Calcular totais
  const totalDiscountPercentage = processedDiscounts.reduce(
    (sum, discount) => sum + discount.percentage, 0
  )
  
  const totalDiscountValue = processedDiscounts.reduce(
    (sum, discount) => sum + discount.value, 0
  )

  const finalValue = Math.max(0, baseValue - totalDiscountValue)

  // Validações
  let isValid = true

  // Verificar limite máximo de desconto
  const maxDiscountLimit = hasIntegralScholarship(discounts) ? 100 : 60
  
  if (totalDiscountPercentage > maxDiscountLimit) {
    isValid = false
    validationErrors.push(
      `Desconto total de ${totalDiscountPercentage}% excede o limite máximo de ${maxDiscountLimit}%`
    )
  }

  // Verificar compatibilidade entre descontos
  const incompatibilityErrors = checkDiscountCompatibility(discounts)
  if (incompatibilityErrors.length > 0) {
    isValid = false
    validationErrors.push(...incompatibilityErrors)
  }

  // Warnings
  if (totalDiscountPercentage > 50 && totalDiscountPercentage <= maxDiscountLimit) {
    warnings.push('Desconto alto - verificar documentação necessária')
  }

  if (processedDiscounts.some(d => d.code === 'CEP') && processedDiscounts.length > 1) {
    warnings.push('Desconto CEP aplicado junto com outros descontos')
  }

  return {
    baseValue,
    discounts: processedDiscounts,
    totalDiscountPercentage,
    totalDiscountValue,
    finalValue,
    isValid,
    validationErrors,
    warnings
  }
}

/**
 * Verifica se há bolsa integral nos descontos
 */
function hasIntegralScholarship(discounts: DatabaseDiscount[]): boolean {
  const integralCodes = ['ABI', 'PASS'] // Bolsa Integral Filantropia, Filhos Prof. IESJE
  return discounts.some(discount => 
    integralCodes.includes(discount.codigo.toUpperCase()) && 
    (discount.percentual || 0) >= 100
  )
}

/**
 * Verifica compatibilidade entre descontos selecionados
 */
function checkDiscountCompatibility(discounts: DatabaseDiscount[]): string[] {
  const errors: string[] = []
  const codes = discounts.map(d => d.codigo.toUpperCase())

  // Regras de incompatibilidade
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

  // Verificar se há múltiplos descontos integrais
  const integralDiscounts = discounts.filter(d => (d.percentual || 0) >= 100)
  if (integralDiscounts.length > 1) {
    errors.push('Não é possível combinar múltiplos descontos de 100%')
  }

  // Verificar se desconto à vista está combinado com outros grandes descontos
  if (codes.includes('PAV')) {
    const otherSignificantDiscounts = discounts.filter(d => 
      d.codigo.toUpperCase() !== 'PAV' && (d.percentual || 0) > 10
    )
    if (otherSignificantDiscounts.length > 0) {
      errors.push('Desconto à vista geralmente não é combinado com outros descontos significativos')
    }
  }

  return errors
}

/**
 * Calcula desconto automático por CEP
 */
export function calculateCepDiscount(cep: string, baseValue: number): {
  hasDiscount: boolean
  percentage: number
  value: number
  category: string
} {
  // Remover formatação do CEP
  const cleanCep = cep.replace(/\D/g, '')
  
  // Lógica simplificada para categorização de CEP
  // Em produção, isso consultaria a tabela cep_ranges
  let category = 'alta' // padrão
  let percentage = 0

  // Exemplo de ranges de CEP para demonstração
  const cepNumber = parseInt(cleanCep)
  
  if (cepNumber >= 63000000 && cepNumber <= 63999999) {
    // CEPs de Juazeiro do Norte - categoria alta
    category = 'alta'
    percentage = 0 // Sem desconto para cidade local
  } else if (cepNumber >= 62000000 && cepNumber <= 62999999) {
    // CEPs de Sobral - categoria baixa
    category = 'baixa'  
    percentage = 15
  } else {
    // Outras cidades - categoria fora
    category = 'fora'
    percentage = 20
  }

  const value = (baseValue * percentage) / 100

  return {
    hasDiscount: percentage > 0,
    percentage,
    value,
    category
  }
}

/**
 * Determina nível de aprovação necessário
 */
export function determineApprovalLevel(totalPercentage: number): {
  level: 'automatic' | 'coordinator' | 'director'
  description: string
} {
  if (totalPercentage <= 20) {
    return {
      level: 'automatic',
      description: 'Aprovação automática'
    }
  } else if (totalPercentage <= 50) {
    return {
      level: 'coordinator', 
      description: 'Aprovação da coordenação necessária'
    }
  } else {
    return {
      level: 'director',
      description: 'Aprovação da direção necessária'
    }
  }
}

/**
 * Valida se todos os documentos necessários estão presentes
 */
export function validateRequiredDocuments(discounts: DatabaseDiscount[]): {
  allDocumentsProvided: boolean
  missingDocuments: string[]
  requiredDocuments: string[]
} {
  const requiredDocuments: string[] = []
  const missingDocuments: string[] = []

  discounts.forEach(discount => {
    if (discount.requires_document) {
      const docType = getRequiredDocumentType(discount.codigo)
      requiredDocuments.push(docType)
      
      // Em uma implementação completa, verificaríamos se o documento foi upload
      // Por enquanto, assumimos que está faltando se requires_document = true
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
 * Mapeia código de desconto para tipo de documento necessário
 */
function getRequiredDocumentType(discountCode: string): string {
  const documentMap: Record<string, string> = {
    'IIR': 'Certidão de nascimento dos irmãos',
    'RES': 'Comprovante de residência',
    'PASS': 'Declaração de vínculo empregatício IESJE + Carteira sindical',
    'PBS': 'Declaração de vínculo empregatício + Carteira sindical',
    'COL': 'Declaração de vínculo empregatício IESJE + Carteira sindical SAAE',
    'SAE': 'Declaração de vínculo empregatício + Carteira sindical SAAE',
    'ABI': 'Documentos de comprovação de renda familiar',
    'ABP': 'Documentos de comprovação de renda familiar'
  }

  return documentMap[discountCode.toUpperCase()] || 'Documentação específica'
}

/**
 * Formata valor monetário para exibição
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

/**
 * Formata porcentagem para exibição
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`
}