import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// =============================================================================
// CONFIGURAÇÕES CONSOLIDADAS PARA SISTEMA DE MATRÍCULA
// =============================================================================

/**
 * Interface para configurações do sistema de matrícula
 */
export interface EnrollmentConfig {
  maxDiscountLimit: number
  currentSchoolYear: number
  systemName: string
  enrollmentPeriod: {
    start: string
    end: string
    active: boolean
  }
  monthlyFeeSettings: {
    baseFee: number
    materialFee: number
    administrativeFee: number
  }
  documentationSettings: {
    requireUpload: boolean
    maxFileSize: number
    allowedFormats: string[]
  }
  approvalWorkflow: {
    autoApprovalLimit: number
    coordinatorApprovalLimit: number
    directorApprovalRequired: number
  }
  cepDiscountSettings: {
    enabled: boolean
    outsideCityPercentage: number
    lowIncomePercentage: number
  }
}

/**
 * Hook consolidado para todas as configurações do enrollment
 */
export const useEnrollmentConfig = () => {
  return useQuery({
    queryKey: ['enrollment-config'],
    queryFn: async (): Promise<EnrollmentConfig> => {
      const { data, error } = await supabase
        .from('system_configs')
        .select('chave, valor, tipo')
        .eq('ativo', true)

      if (error) {
        console.error('Erro ao buscar configurações do sistema:', error)
        // Retorna configurações padrão em caso de erro
        return getDefaultConfig()
      }

      // Converter array de configurações em objeto estruturado
      const configMap = data.reduce((acc, config) => {
        acc[config.chave] = parseConfigValue(config.valor, config.tipo)
        return acc
      }, {} as Record<string, any>)

      // Estruturar configurações com valores padrão para chaves ausentes
      return {
        maxDiscountLimit: configMap['max_desconto_total'] ?? 101,
        currentSchoolYear: configMap['ano_letivo'] ?? new Date().getFullYear(),
        systemName: configMap['nome_sistema'] ?? 'IESJE - Sistema de Matrícula',
        
        enrollmentPeriod: {
          start: configMap['periodo_matricula_inicio'] ?? '2025-01-01',
          end: configMap['periodo_matricula_fim'] ?? '2025-03-31',
          active: configMap['periodo_matricula_ativo'] ?? true,
        },

        monthlyFeeSettings: {
          baseFee: configMap['mensalidade_base'] ?? 800,
          materialFee: configMap['taxa_material'] ?? 50,
          administrativeFee: configMap['taxa_administrativa'] ?? 25,
        },

        documentationSettings: {
          requireUpload: configMap['exigir_upload_docs'] ?? false,
          maxFileSize: configMap['tamanho_max_arquivo'] ?? 5, // MB
          allowedFormats: configMap['formatos_permitidos'] ?? ['pdf', 'jpg', 'png'],
        },

        approvalWorkflow: {
          autoApprovalLimit: configMap['aprovacao_automatica_ate'] ?? 20,
          coordinatorApprovalLimit: configMap['aprovacao_coordenador_ate'] ?? 50,
          directorApprovalRequired: configMap['aprovacao_diretoria_acima'] ?? 50,
        },

        cepDiscountSettings: {
          enabled: configMap['desconto_cep_ativo'] ?? true,
          outsideCityPercentage: configMap['desconto_fora_cidade'] ?? 20,
          lowIncomePercentage: configMap['desconto_baixa_renda'] ?? 10,
        },
      }
    },
    staleTime: 10 * 60 * 1000, // 10 minutos
    gcTime: 30 * 60 * 1000, // 30 minutos
  })
}

/**
 * Hook específico para limite máximo de desconto
 */
export const useMaxDiscountLimit = () => {
  const { data: config, ...rest } = useEnrollmentConfig()
  
  return {
    data: config?.maxDiscountLimit ?? 101,
    ...rest
  }
}

/**
 * Hook específico para ano letivo atual
 */
export const useCurrentSchoolYear = () => {
  const { data: config, ...rest } = useEnrollmentConfig()
  
  return {
    data: config?.currentSchoolYear ?? new Date().getFullYear(),
    ...rest
  }
}

/**
 * Hook específico para configurações de mensalidade
 */
export const useMonthlyFeeValues = () => {
  const { data: config, ...rest } = useEnrollmentConfig()
  
  return {
    data: config?.monthlyFeeSettings ?? {
      baseFee: 800,
      materialFee: 50,
      administrativeFee: 25,
    },
    ...rest
  }
}

/**
 * Hook específico para configurações de aprovação
 */
export const useApprovalWorkflow = () => {
  const { data: config, ...rest } = useEnrollmentConfig()
  
  return {
    data: config?.approvalWorkflow ?? {
      autoApprovalLimit: 20,
      coordinatorApprovalLimit: 50,
      directorApprovalRequired: 50,
    },
    ...rest
  }
}

/**
 * Hook específico para período de matrícula
 */
export const useEnrollmentPeriod = () => {
  const { data: config, ...rest } = useEnrollmentConfig()
  
  return {
    data: config?.enrollmentPeriod ?? {
      start: '2025-01-01',
      end: '2025-03-31',
      active: true,
    },
    ...rest
  }
}

/**
 * Hook para verificar se estamos no período de matrícula
 */
export const useIsEnrollmentActive = () => {
  const { data: period, isLoading, error } = useEnrollmentPeriod()
  
  const isActive = period?.active && 
    new Date() >= new Date(period.start) && 
    new Date() <= new Date(period.end)
  
  return {
    data: isActive ?? true, // Padrão: sempre ativo se não configurado
    isLoading,
    error,
    period: period,
  }
}

// =============================================================================
// FUNÇÕES UTILITÁRIAS
// =============================================================================

/**
 * Converte valor da configuração baseado no tipo
 */
function parseConfigValue(valor: string, tipo: string): any {
  switch (tipo) {
    case 'number':
      return Number(valor)
    case 'boolean':
      return valor === 'true' || valor === '1'
    case 'json':
      try {
        return JSON.parse(valor)
      } catch {
        return valor
      }
    case 'string':
    default:
      return valor
  }
}

/**
 * Configurações padrão do sistema
 */
function getDefaultConfig(): EnrollmentConfig {
  return {
    maxDiscountLimit: 101,
    currentSchoolYear: new Date().getFullYear(),
    systemName: 'IESJE - Sistema de Matrícula',
    
    enrollmentPeriod: {
      start: '2025-01-01',
      end: '2025-12-31',
      active: true,
    },

    monthlyFeeSettings: {
      baseFee: 800,
      materialFee: 50,
      administrativeFee: 25,
    },

    documentationSettings: {
      requireUpload: false,
      maxFileSize: 5,
      allowedFormats: ['pdf', 'jpg', 'png'],
    },

    approvalWorkflow: {
      autoApprovalLimit: 20,
      coordinatorApprovalLimit: 50,
      directorApprovalRequired: 50,
    },

    cepDiscountSettings: {
      enabled: true,
      outsideCityPercentage: 20,
      lowIncomePercentage: 10,
    },
  }
}

/**
 * Helper para obter nível de aprovação necessário baseado no percentual de desconto
 */
export const getRequiredApprovalLevel = (
  discountPercentage: number, 
  approvalConfig?: EnrollmentConfig['approvalWorkflow']
): 'auto' | 'coordinator' | 'director' => {
  if (!approvalConfig) {
    // Configurações padrão
    if (discountPercentage <= 20) return 'auto'
    if (discountPercentage <= 50) return 'coordinator'
    return 'director'
  }

  if (discountPercentage <= approvalConfig.autoApprovalLimit) return 'auto'
  if (discountPercentage <= approvalConfig.coordinatorApprovalLimit) return 'coordinator'
  return 'director'
}

/**
 * Helper para validar se desconto está dentro do limite permitido
 */
export const isDiscountWithinLimit = (
  discountPercentage: number, 
  maxLimit?: number
): boolean => {
  return discountPercentage <= (maxLimit ?? 101)
}

/**
 * Helper para formatar período de matrícula para exibição
 */
export const formatEnrollmentPeriod = (period?: EnrollmentConfig['enrollmentPeriod']): string => {
  if (!period) return 'Período não configurado'
  
  const start = new Date(period.start).toLocaleDateString('pt-BR')
  const end = new Date(period.end).toLocaleDateString('pt-BR')
  const status = period.active ? 'Ativo' : 'Inativo'
  
  return `${start} até ${end} (${status})`
}
