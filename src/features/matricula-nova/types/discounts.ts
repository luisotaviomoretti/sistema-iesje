// Tipos específicos para o sistema de descontos na matrícula nova
// Baseados na integração com o Painel Administrativo

import type { TipoDesconto, TrilhoNome, CategoriaDesconto } from '@/lib/supabase'

// ============================================================================
// ENUMS E CONSTANTES
// ============================================================================

/**
 * Categorias de desconto conforme definidas no sistema
 */
export enum CategoriasDesconto {
  ESPECIAL = 'especial',
  REGULAR = 'regular',
  NEGOCIACAO = 'negociacao'
}

/**
 * Categorias de desconto para compatibilidade com plano
 */
export enum CategoriaDesconto {
  ESPECIAL = 'Especial',
  REGULAR = 'Regular', 
  NEGOCIACAO = 'Negociação'
}

/**
 * Tipos de trilho disponíveis
 */
export enum TiposTrilho {
  ESPECIAL = 'especial',
  COMBINADO = 'combinado'
}

/**
 * Tipos de trilho para compatibilidade com plano
 */
export enum TipoTrilho {
  ESPECIAL = 'especial',      // Apenas descontos ESPECIAIS
  COMBINADO = 'combinado'     // Descontos REGULAR + NEGOCIACAO
}

/**
 * Níveis de aprovação baseados no percentual total
 */
export enum NivelAprovacao {
  AUTOMATICA = 'automatic',
  COORDENACAO = 'coordination',
  DIRECAO = 'direction',
  ESPECIAL = 'special'
}

/**
 * Códigos de desconto conhecidos organizados por categoria
 */
export const CODIGOS_DESCONTO = {
  [CategoriasDesconto.ESPECIAL]: ['PASS', 'PBS', 'COL', 'SAE', 'ABI', 'ABP'],
  [CategoriasDesconto.REGULAR]: ['IIR', 'RES'],
  [CategoriasDesconto.NEGOCIACAO]: ['PAV', 'CEP', 'ADI', 'NEG']
} as const

/**
 * Mapeamento de trilho para categorias permitidas
 */
export const TRILHO_CATEGORIAS = {
  [TiposTrilho.ESPECIAL]: [CategoriasDesconto.ESPECIAL],
  [TiposTrilho.COMBINADO]: [CategoriasDesconto.REGULAR, CategoriasDesconto.NEGOCIACAO]
} as const

// ============================================================================
// INTERFACES PRINCIPALES DO PLANO 2.3A
// ============================================================================

/**
 * Interface principal de desconto conforme plano detalhado
 */
export interface Desconto {
  id: string
  nome: string
  codigo: string
  categoria: CategoriaDesconto
  percentual_maximo: number
  percentual_atual?: number  // Valor selecionado pelo usuário
  requer_documento: boolean
  documento_url?: string
  ativo: boolean
  incompativel_com: string[]
  trilhos_compativeis: string[]
}

/**
 * Interface para desconto selecionado pelo usuário
 */
export interface DescontoSelecionado {
  desconto: Desconto
  percentual_aplicado: number
  documento_anexo?: File
  observacoes?: string
}

/**
 * Interface para cálculo completo de descontos
 */
export interface CalculoDesconto {
  valor_base: number
  descontos_aplicados: DescontoSelecionado[]
  valor_total_desconto: number
  percentual_total: number
  valor_final: number
  nivel_aprovacao: NivelAprovacao
  pode_aplicar: boolean
  motivo_bloqueio?: string
}

/**
 * Interface para regras de incompatibilidade
 */
export interface RegraIncompatibilidade {
  desconto_id: string
  incompativel_com: string[]
  motivo: string
}

// ============================================================================
// INTERFACES ORIGINAIS (MANTER COMPATIBILIDADE)
// ============================================================================

/**
 * Interface unificada para desconto no contexto da matrícula
 */
export interface DiscountForEnrollment {
  // Dados básicos do admin
  id: string
  codigo: string
  descricao: string
  categoria: CategoriaDesconto
  percentual_fixo: number | null
  eh_variavel: boolean
  ativo: boolean
  
  // Metadados para matrícula
  isSelected: boolean
  valorCalculado?: number
  documentosRequeridos: string[]
  nivelAprovacao: 'AUTOMATICA' | 'COORDENACAO' | 'DIRECAO'
  
  // Estado da validação
  validation: {
    isValid: boolean
    errors: string[]
    warnings: string[]
  }
}

/**
 * Interface para seleção de descontos no step
 */
export interface DiscountSelection {
  discountId: string
  percentualAplicado: number | null // null para variáveis
  documentosUpload: DocumentUpload[]
  observacoes?: string
}

/**
 * Interface para upload de documentos
 */
export interface DocumentUpload {
  id: string
  tipo: string
  nome: string
  arquivo: File | null
  url?: string
  status: 'pending' | 'uploaded' | 'error'
  error?: string
}

/**
 * Interface para card de desconto na UI
 */
export interface DiscountCardProps {
  discount: DiscountForEnrollment
  isSelected: boolean
  onToggle: (discountId: string) => void
  onPercentageChange?: (discountId: string, percentage: number) => void
  onDocumentUpload?: (discountId: string, documents: DocumentUpload[]) => void
  trilhoAtivo?: TrilhoNome
}

// ============================================================================
// INTERFACES DE CÁLCULO E VALIDAÇÃO
// ============================================================================

/**
 * Interface para cálculo de CAP
 */
export interface CapCalculation {
  trilho: TrilhoNome
  capMaximo: number
  capUtilizado: number
  capDisponivel: number
  percentualTotal: number
  descontosAplicados: DiscountSelection[]
  
  // Validação
  isValid: boolean
  excedeuCap: boolean
  proximoDoLimite: boolean // > 80% do cap
  
  // Mensagens
  warnings: string[]
  errors: string[]
}

/**
 * Interface para resultado de validação de desconto
 */
export interface DiscountValidation {
  discountId: string
  isValid: boolean
  isCompatibleWithTrilho: boolean
  canCombineWith: string[]
  conflicts: string[]
  errors: string[]
  warnings: string[]
  requiredDocuments: string[]
  approvalLevel: 'AUTOMATICA' | 'COORDENACAO' | 'DIRECAO'
}

/**
 * Interface para preview de valores na UI
 */
export interface ValuePreview {
  valorBase: number
  descontosDetalhes: Array<{
    codigo: string
    descricao: string
    percentual: number
    valor: number
  }>
  percentualTotal: number
  valorTotalDesconto: number
  valorFinal: number
  
  // Breakdown visual
  breakdown: {
    label: string
    value: number
    type: 'base' | 'discount' | 'final'
  }[]
}

// ============================================================================
// INTERFACES DE ESTADO E CONTEXTO
// ============================================================================

/**
 * Estado dos descontos no contexto do formulário
 */
export interface DiscountFormState {
  trilhoSelecionado: TrilhoNome | null
  descontosSelecionados: DiscountSelection[]
  descontosDisponiveis: DiscountForEnrollment[]
  
  // Cálculos
  calculoCap: CapCalculation | null
  previewValores: ValuePreview | null
  
  // Estado de UI
  isLoading: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Ações disponíveis no contexto de descontos
 */
export interface DiscountFormActions {
  // Trilho
  setTrilho: (trilho: TrilhoNome) => void
  
  // Descontos
  toggleDesconto: (discountId: string) => void
  updateDescontoPercentual: (discountId: string, percentual: number) => void
  updateDescontoDocumentos: (discountId: string, documents: DocumentUpload[]) => void
  
  // Validação
  validateSelecao: () => Promise<boolean>
  calculatePreview: () => void
  
  // Reset
  resetSelecao: () => void
}

// ============================================================================
// TIPOS UTILITÁRIOS
// ============================================================================

/**
 * Tipo para filtro de descontos
 */
export type DiscountFilter = {
  categoria?: CategoriaDesconto[]
  trilho?: TrilhoNome
  apenasAtivos?: boolean
  apenasVariaveis?: boolean
  codigosPesquisa?: string[]
}

/**
 * Tipo para configuração de trilho
 */
export type TrilhoConfig = {
  nome: TrilhoNome
  titulo: string
  descricao: string
  icone: string
  corPrimaria: string
  capMaximo: number | null
  categoriasPermitidas: CategoriaDesconto[]
  ordemExibicao: number
}

/**
 * Tipo para resultado de compatibilidade
 */
export type CompatibilityResult = {
  isCompatible: boolean
  allowedCategories: CategoriaDesconto[]
  conflictingDiscounts: string[]
  maxCap: number
  recommendedTrilho?: TrilhoNome
  reason: string
}

// ============================================================================
// INTERFACES PARA INTEGRAÇÃO COM ADMIN
// ============================================================================

/**
 * Adaptador para converter TipoDesconto do admin para DiscountForEnrollment
 */
export interface DiscountAdapter {
  fromAdmin: (admin: TipoDesconto) => DiscountForEnrollment
  toSelection: (discount: DiscountForEnrollment, percentual?: number) => DiscountSelection
  validateCompatibility: (discountId: string, trilho: TrilhoNome) => Promise<CompatibilityResult>
}

/**
 * Interface para hooks de integração
 */
export interface DiscountHooks {
  useDiscountsForTrilho: (trilho: TrilhoNome) => {
    data: DiscountForEnrollment[]
    isLoading: boolean
    error: Error | null
  }
  
  useCapCalculation: (selections: DiscountSelection[], trilho: TrilhoNome) => {
    calculation: CapCalculation
    isLoading: boolean
  }
  
  useDiscountValidation: (discountId: string, trilho: TrilhoNome) => {
    validation: DiscountValidation
    isLoading: boolean
  }
}

// ============================================================================
// INTERFACES DE COMPONENTES CONFORME PLANO 2.3A
// ============================================================================

/**
 * Props para DiscountCard component
 */
export interface DiscountCardProps {
  desconto: Desconto
  isSelected: boolean
  percentualAtual: number
  maxPercentual: number
  onToggle: () => void
  onPercentualChange: (valor: number) => void
  onDocumentUpload?: (file: File) => void
  disabled?: boolean
  errorMessage?: string
}

/**
 * Props para DiscountCategorySection component
 */
export interface DiscountSectionProps {
  categoria: CategoriaDesconto
  descontos: Desconto[]
  descontosSelecionados: DescontoSelecionado[]
  onDescontoToggle: (desconto: Desconto) => void
  onPercentualChange: (descontoId: string, percentual: number) => void
  capRestante: number
  erros: Record<string, string>
}

/**
 * Props para CapIndicator component
 */
export interface CapIndicatorProps {
  percentualAtual: number
  percentualMaximo: number
  nivelAprovacao: NivelAprovacao
  trilhoNome: string
  valorBase: number
  valorFinal: number
  descontosDetalhes: DescontoSelecionado[]
}

// ============================================================================
// TIPOS PARA VALIDAÇÃO DE CAP
// ============================================================================

/**
 * Interface para validação de CAP
 */
export interface CapValidationResult {
  percentual_atual: number
  cap_maximo: number  
  excede_cap: boolean
  nivel_aprovacao: NivelAprovacao
  pode_continuar: boolean
  motivo_bloqueio?: string
}

// ============================================================================
// TIPOS PARA COMPONENTES ESPECÍFICOS
// ============================================================================

/**
 * Props para componente principal de seleção
 */
export interface DiscountSelectionStepProps {
  onDiscountChange: (selections: DiscountSelection[]) => void
  onTrilhoChange: (trilho: TrilhoNome) => void
  valorBase: number
  serieInfo: {
    id: string
    nome: string
  }
  escolaInfo: {
    id: string
    nome: string
  }
}

/**
 * Props para componente de indicador de CAP
 */
export interface CapIndicatorProps {
  calculation: CapCalculation
  showDetails?: boolean
  variant?: 'default' | 'warning' | 'danger'
}

/**
 * Props para componente de preview de valores
 */
export interface ValuePreviewProps {
  preview: ValuePreview
  isLoading?: boolean
  showBreakdown?: boolean
}

export default {
  CategoriasDesconto,
  TiposTrilho,
  CODIGOS_DESCONTO,
  TRILHO_CATEGORIAS
}