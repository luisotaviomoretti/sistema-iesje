/**
 * Sistema de Elegibilidade de Descontos por CEP
 * Tipos TypeScript para o sistema inteligente de filtração de descontos
 */

import type { DatabaseDiscount } from '../../matricula-nova/types/api'

// ===================================================================
// TIPOS CORE DO SISTEMA DE ELEGIBILIDADE
// ===================================================================

/**
 * Categorias de CEP do sistema
 */
export type CepCategory = 'fora' | 'baixa' | 'alta'

/**
 * Tipos de trilho do sistema
 */
export type TrilhoType = 'especial' | 'combinado' | 'comercial'

/**
 * Resultado da classificação de um desconto específico
 */
export interface DiscountEligibilityCheck {
  discount: DatabaseDiscount
  eligible: boolean
  reason: string | null
  suggestion?: string
  category?: string
  ruleApplied: 'hardcoded' | 'database' | 'default' | 'trilho-especial'
}

/**
 * Resultado completo da análise de elegibilidade
 */
export interface DiscountEligibilityResult {
  /** Descontos elegíveis para seleção */
  eligibleDiscounts: DatabaseDiscount[]
  
  /** Descontos não elegíveis com motivos */
  ineligibleDiscounts: DiscountEligibilityCheck[]
  
  /** Categoria do CEP analisado */
  cepCategory: CepCategory | null
  
  /** CEP original usado para análise */
  cep: string | null
  
  /** Indica se ainda está carregando dados */
  isLoading: boolean
  
  /** Erro durante análise, se houver */
  error: string | null
  
  /** Estatísticas da análise */
  stats: {
    totalDiscounts: number
    eligibleCount: number
    ineligibleCount: number
    eligibilityRate: number // porcentagem de descontos elegíveis
  }
}

/**
 * Configuração de uma regra de elegibilidade hardcoded
 */
export interface HardcodedEligibilityRule {
  /** Código do desconto (ex: 'RES', 'CEP') */
  discountCode: string
  
  /** Regras por categoria de CEP */
  rules: Record<CepCategory, boolean>
  
  /** Motivo da restrição por categoria */
  restrictionReasons: Record<CepCategory, string | null>
  
  /** Sugestões por categoria */
  suggestions?: Record<CepCategory, string | null>
}

/**
 * Dados vindos do banco de dados para elegibilidade
 */
export interface DatabaseEligibilityRule {
  categoria_cep: CepCategory
  tipo_desconto_codigo: string
  elegivel: boolean
  motivo_restricao: string | null
  observacoes: string | null
}

/**
 * Status detalhado da categoria do CEP
 */
export interface CepCategoryStatus {
  category: CepCategory
  title: string
  description: string
  icon: string
  color: string
  restrictions: string[]
  benefits: string[]
}

// ===================================================================
// TIPOS PARA COMPONENTES UI
// ===================================================================

/**
 * Props para o componente de status de elegibilidade
 */
export interface DiscountEligibilityStatusProps {
  cepCategory: CepCategory | null
  cep: string
  className?: string
  showDetails?: boolean
}

/**
 * Props para componente de descontos inelegíveis
 */
export interface IneligibleDiscountsInfoProps {
  ineligibleDiscounts: DiscountEligibilityCheck[]
  className?: string
  showByDefault?: boolean
}

/**
 * Props para componente de badge de categoria CEP
 */
export interface CepCategoryBadgeProps {
  category: CepCategory
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'outline' | 'filled'
}

// ===================================================================
// TIPOS PARA HOOKS
// ===================================================================

/**
 * Parâmetros para o hook useEligibleDiscounts
 */
export interface UseEligibleDiscountsParams {
  /** CEP para análise (deve estar formatado) */
  cep: string | undefined
  
  /** Lista de todos os descontos disponíveis */
  allDiscounts: DatabaseDiscount[]
  
  /** Tipo de trilho para aplicar regras específicas */
  trilhoType?: TrilhoType
  
  /** Se deve usar apenas regras hardcoded (para testes) */
  hardcodedOnly?: boolean
  
  /** Se deve incluir estatísticas detalhadas */
  includeStats?: boolean
}

/**
 * Opções de configuração do hook
 */
export interface EligibilityHookOptions {
  /** Tempo de cache em milliseconds */
  staleTime?: number
  
  /** Se deve revalidar quando foco volta */
  refetchOnWindowFocus?: boolean
  
  /** Se deve mostrar logs de debug */
  enableDebugLogs?: boolean
}

// ===================================================================
// TIPOS PARA UTILITÁRIOS
// ===================================================================

/**
 * Contexto para aplicação de regras de elegibilidade
 */
export interface EligibilityRuleContext {
  discount: DatabaseDiscount
  cepCategory: CepCategory
  trilhoType?: TrilhoType
  databaseRule: DatabaseEligibilityRule | null
  hardcodedRule: HardcodedEligibilityRule | null
}

/**
 * Resultado da aplicação de uma regra
 */
export interface EligibilityRuleResult {
  eligible: boolean
  reason: string | null
  suggestion?: string
  ruleSource: 'hardcoded' | 'database' | 'default' | 'trilho-especial'
  confidence: 'high' | 'medium' | 'low'
}

/**
 * Mapeamento de códigos de desconto para nomes amigáveis
 */
export interface DiscountCodeMapping {
  [code: string]: {
    friendlyName: string
    description: string
    category: 'especial' | 'regular' | 'negociacao'
  }
}

// ===================================================================
// TIPOS PARA DEBUG E ANALYTICS
// ===================================================================

/**
 * Dados de debug para desenvolvimento
 */
export interface EligibilityDebugData {
  /** CEP analisado */
  originalCep: string
  
  /** Categoria encontrada */
  foundCategory: CepCategory | null
  
  /** Tempo de análise em ms */
  analysisTimeMs: number
  
  /** Regras aplicadas por desconto */
  rulesApplied: Record<string, {
    source: 'hardcoded' | 'database' | 'default'
    result: boolean
    reason?: string
  }>
  
  /** Logs de execução */
  executionLogs: string[]
}

/**
 * Métricas de usage para analytics
 */
export interface EligibilityMetrics {
  /** Total de análises realizadas */
  totalAnalyses: number
  
  /** Distribuição por categoria de CEP */
  categoryDistribution: Record<CepCategory, number>
  
  /** Descontos mais bloqueados */
  mostBlockedDiscounts: Array<{
    code: string
    blockCount: number
    blockRate: number
  }>
  
  /** Performance média */
  avgAnalysisTime: number
}

// ===================================================================
// CONSTANTES DE TIPOS
// ===================================================================

/**
 * Códigos de desconto conhecidos do sistema
 */
export const KNOWN_DISCOUNT_CODES = {
  IIR: 'Alunos Irmãos Carnal',
  RES: 'Alunos de Outras Cidades', 
  PASS: 'Filhos de Prof. do IESJE Sindicalizados',
  PBS: 'Filhos Prof. Sind. de Outras Instituições',
  COL: 'Filhos de Func. do IESJE Sindicalizados SAAE',
  SAE: 'Filhos de Func. Outros Estabelec. Sindicalizados SAAE',
  ABI: 'Bolsa Integral Filantropia',
  ABP: 'Bolsa Parcial Filantropia',
  PAV: 'Pagamento à Vista',
  CEP: 'Desconto CEP Automático',
  CEP5: 'Desconto CEP Menor Renda',
  CEP10: 'Desconto CEP Fora de Poços'
} as const

/**
 * Configurações padrão do sistema
 */
export const ELIGIBILITY_DEFAULTS = {
  CACHE_TIME: 5 * 60 * 1000, // 5 minutos
  STALE_TIME: 15 * 60 * 1000, // 15 minutos
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
  ENABLE_DEBUG: process.env.NODE_ENV === 'development'
} as const

/**
 * Configurações de cores e ícones por categoria
 */
export const CATEGORY_CONFIG: Record<CepCategory, CepCategoryStatus> = {
  'fora': {
    category: 'fora',
    title: 'Fora de Poços de Caldas',
    description: 'Elegível ao desconto RES (Outras Cidades)',
    icon: '🏠',
    color: 'text-blue-600 bg-blue-50 border-blue-200',
    restrictions: ['Desconto CEP automático não disponível'],
    benefits: ['Desconto RES disponível', 'Outros descontos normais']
  },
  'baixa': {
    category: 'baixa', 
    title: 'Poços de Caldas - Menor Renda',
    description: 'Elegível ao desconto CEP automático',
    icon: '🏘️',
    color: 'text-green-600 bg-green-50 border-green-200',
    restrictions: ['Desconto RES não disponível (já reside em Poços)'],
    benefits: ['Desconto CEP automático', 'Outros descontos normais']
  },
  'alta': {
    category: 'alta',
    title: 'Poços de Caldas - Maior Renda', 
    description: 'Acesso aos descontos regulares',
    icon: '🏢',
    color: 'text-amber-600 bg-amber-50 border-amber-200',
    restrictions: ['Descontos por localização não disponíveis'],
    benefits: ['Descontos regulares disponíveis', 'Sem restrições de renda']
  }
} as const