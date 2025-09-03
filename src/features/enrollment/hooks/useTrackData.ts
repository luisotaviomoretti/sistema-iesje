import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { useTrilhos } from "@/features/admin/hooks/useTrilhos";

/**
 * Interface para dados completos de trilho
 */
export interface TrackData {
  id: string;
  nome: string;
  descricao: string;
  cap_percentual: number | null; // null = sem limite (100%)
  condicoes: string[];
  prioridade: number;
  configuracao: {
    permite_bolsa_integral: boolean;
    permite_combinacao_descontos: boolean;
    requer_responsavel_secundario?: boolean;
    nivel_aprovacao_automatica: number; // Percentual até onde é automático
  };
  restricoes?: {
    tipos_desconto_excluidos?: string[];
    tipos_desconto_obrigatorios?: string[];
    valor_minimo_mensalidade?: number;
  };
  metadata: {
    ativo: boolean;
    data_criacao: string;
    data_atualizacao: string;
    versao: number;
  };
}

/**
 * Resultado do hook useTrackData
 */
export interface UseTrackDataResult {
  data: TrackData | null;
  isLoading: boolean;
  error: Error | null;
  isValid: boolean;
  isActive: boolean;
  refetch: () => Promise<any>;
}

/**
 * Opções para configurar o hook useTrackData
 */
export interface UseTrackDataOptions {
  fallbackToDefault?: boolean;
  enableCaching?: boolean;
  staleTime?: number;
}

/**
 * Mapeamento de trilhos estáticos (fallback)
 */
const STATIC_TRACKS: Record<string, TrackData> = {
  'A': {
    id: 'A',
    nome: 'Especial',
    descricao: 'Trilho especial sem limite de desconto',
    cap_percentual: null, // Sem limite
    condicoes: [
      'Permite descontos ilimitados',
      'Bolsas integrais aceitas',
      'Aprovação automática até 20%',
      'Aprovação coordenação até 50%',
      'Aprovação direção acima de 50%'
    ],
    prioridade: 1,
    configuracao: {
      permite_bolsa_integral: true,
      permite_combinacao_descontos: true,
      requer_responsavel_secundario: false,
      nivel_aprovacao_automatica: 20,
    },
    metadata: {
      ativo: true,
      data_criacao: '2024-01-01T00:00:00Z',
      data_atualizacao: new Date().toISOString(),
      versao: 1,
    },
  },
  'B': {
    id: 'B',
    nome: 'Combinado',
    descricao: 'Trilho combinado com limite de 25%',
    cap_percentual: 25,
    condicoes: [
      'Limite máximo de 25% de desconto',
      'Bolsas integrais não aceitas',
      'Aprovação automática até 20%',
      'Aprovação coordenação de 21% a 25%'
    ],
    prioridade: 2,
    configuracao: {
      permite_bolsa_integral: false,
      permite_combinacao_descontos: true,
      requer_responsavel_secundario: true,
      nivel_aprovacao_automatica: 20,
    },
    restricoes: {
      tipos_desconto_excluidos: ['ABI'], // Bolsa integral excluída
    },
    metadata: {
      ativo: true,
      data_criacao: '2024-01-01T00:00:00Z',
      data_atualizacao: new Date().toISOString(),
      versao: 1,
    },
  },
  'C': {
    id: 'C',
    nome: 'Normal',
    descricao: 'Trilho normal com limite de 60%',
    cap_percentual: 60,
    condicoes: [
      'Limite máximo de 60% de desconto',
      'Bolsas integrais aceitas',
      'Aprovação automática até 20%',
      'Aprovação coordenação de 21% a 50%',
      'Aprovação direção de 51% a 60%'
    ],
    prioridade: 3,
    configuracao: {
      permite_bolsa_integral: true,
      permite_combinacao_descontos: true,
      requer_responsavel_secundario: false,
      nivel_aprovacao_automatica: 20,
    },
    metadata: {
      ativo: true,
      data_criacao: '2024-01-01T00:00:00Z',
      data_atualizacao: new Date().toISOString(),
      versao: 1,
    },
  },
};

/**
 * Hook centralizado para buscar dados completos e atualizados de um trilho
 * 
 * @param trackId - ID do trilho (A, B, C, ou outro)
 * @param options - Opções de configuração
 * @returns Dados completos do trilho com estado de loading/error
 */
export function useTrackData(
  trackId: string | null,
  options: UseTrackDataOptions = {}
): UseTrackDataResult {
  const {
    fallbackToDefault = true,
    enableCaching = true,
    staleTime = 10 * 60 * 1000, // 10 minutos (dados mais estáveis)
  } = options;

  // Buscar dados dinâmicos do admin
  const { 
    data: dynamicTracks, 
    isLoading: loadingDynamic, 
    error: dynamicError,
    refetch: refetchDynamic
  } = useTrilhos();

  // Query para dados específicos do trilho
  const {
    data: trackData,
    isLoading: loadingSpecific,
    error: specificError,
    refetch: refetchSpecific
  } = useQuery({
    queryKey: ['track-data', trackId],
    queryFn: async () => {
      if (!trackId) return null;
      
      // Buscar dados dinâmicos primeiro
      if (dynamicTracks?.length > 0) {
        const dynamicTrack = dynamicTracks.find(t => 
          t.id === trackId || t.codigo === trackId || t.nome?.toUpperCase() === trackId
        );
        if (dynamicTrack) {
          return dynamicTrack;
        }
      }
      
      // Fallback para dados estáticos se configurado
      if (fallbackToDefault) {
        const staticTrack = STATIC_TRACKS[trackId.toUpperCase()];
        return staticTrack || null;
      }
      
      return null;
    },
    enabled: !!trackId && enableCaching,
    staleTime,
    retry: 2,
    retryDelay: 1500,
  });

  // Processar dados do trilho
  const processedData = useMemo((): TrackData | null => {
    if (!trackId) return null;

    // Tentar dados específicos primeiro
    let sourceData = trackData;
    
    // Fallback para dados dinâmicos
    if (!sourceData && dynamicTracks?.length > 0) {
      sourceData = dynamicTracks.find(t => 
        t.id === trackId || t.codigo === trackId || t.nome?.toUpperCase() === trackId
      );
    }
    
    // Fallback final para dados estáticos
    if (!sourceData && fallbackToDefault) {
      sourceData = STATIC_TRACKS[trackId.toUpperCase()];
    }

    if (!sourceData) return null;

    // Se dados dinâmicos, converter para formato padrão
    if ('codigo' in sourceData && 'cap_maximo' in sourceData) {
      // Dados do banco/admin
      return {
        id: sourceData.codigo || sourceData.id,
        nome: sourceData.nome || `Trilho ${sourceData.codigo}`,
        descricao: sourceData.descricao || `Trilho ${sourceData.nome}`,
        cap_percentual: sourceData.cap_maximo,
        condicoes: sourceData.condicoes || [],
        prioridade: sourceData.prioridade || 0,
        configuracao: {
          permite_bolsa_integral: sourceData.permite_bolsa_integral !== false,
          permite_combinacao_descontos: sourceData.permite_combinacao !== false,
          requer_responsavel_secundario: sourceData.requer_responsavel_secundario || false,
          nivel_aprovacao_automatica: sourceData.nivel_aprovacao_automatica || 20,
        },
        restricoes: {
          tipos_desconto_excluidos: sourceData.tipos_desconto_excluidos || [],
          tipos_desconto_obrigatorios: sourceData.tipos_desconto_obrigatorios || [],
          valor_minimo_mensalidade: sourceData.valor_minimo_mensalidade,
        },
        metadata: {
          ativo: sourceData.ativo !== false,
          data_criacao: sourceData.created_at || new Date().toISOString(),
          data_atualizacao: sourceData.updated_at || new Date().toISOString(),
          versao: sourceData.version || 1,
        },
      };
    }

    // Dados já no formato padrão (estáticos)
    return sourceData as TrackData;
  }, [trackId, trackData, dynamicTracks, fallbackToDefault]);

  // Estados de loading e error
  const isLoading = loadingDynamic || loadingSpecific;
  const error = dynamicError || specificError;
  const isValid = processedData !== null;
  const isActive = processedData?.metadata?.ativo || false;

  // Função de refetch
  const refetch = useCallback(async () => {
    const results = await Promise.allSettled([
      refetchDynamic(),
      refetchSpecific(),
    ]);
    return results;
  }, [refetchDynamic, refetchSpecific]);

  return {
    data: processedData,
    isLoading,
    error,
    isValid,
    isActive,
    refetch,
  };
}

/**
 * Hook para buscar todos os trilhos disponíveis
 * 
 * @param options - Opções de configuração
 * @returns Array com todos os trilhos
 */
export function useAllTracks(
  options: UseTrackDataOptions = {}
): {
  data: TrackData[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<any>;
} {
  const trackIds = ['A', 'B', 'C']; // IDs padrão dos trilhos
  
  const results = trackIds.map(id => useTrackData(id, options));
  
  const data = results
    .map(r => r.data)
    .filter((track): track is TrackData => track !== null && track.metadata.ativo);
  
  const isLoading = results.some(r => r.isLoading);
  const error = results.find(r => r.error)?.error || null;
  
  const refetch = useCallback(async () => {
    const refetches = await Promise.allSettled(
      results.map(r => r.refetch())
    );
    return refetches;
  }, [results]);

  return {
    data,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Utilitário para obter o CAP efetivo de um trilho
 * 
 * @param trackData - Dados do trilho
 * @returns Número representando o CAP (100 se ilimitado)
 */
export function getEffectiveCap(trackData: TrackData | null): number {
  if (!trackData) return 60; // Default fallback
  
  // null significa sem limite (100%)
  return trackData.cap_percentual ?? 100;
}

/**
 * Utilitário para verificar se um trilho permite bolsas integrais
 * 
 * @param trackData - Dados do trilho
 * @returns boolean indicando se permite
 */
export function allowsIntegralScholarship(trackData: TrackData | null): boolean {
  return trackData?.configuracao?.permite_bolsa_integral || false;
}

/**
 * Utilitário para verificar se um desconto é permitido em um trilho
 * 
 * @param trackData - Dados do trilho
 * @param discountCode - Código do desconto
 * @returns boolean indicando se é permitido
 */
export function isDiscountAllowedInTrack(
  trackData: TrackData | null, 
  discountCode: string
): boolean {
  if (!trackData) return true; // Se não há trilho, permite tudo
  
  const { tipos_desconto_excluidos } = trackData.restricoes || {};
  
  // Verificar se está na lista de excluídos
  if (tipos_desconto_excluidos?.includes(discountCode)) {
    return false;
  }
  
  return true;
}

/**
 * Utilitário para determinar o nível de aprovação necessário baseado no trilho
 * 
 * @param trackData - Dados do trilho
 * @param totalPercentage - Percentual total de descontos
 * @returns Nível de aprovação necessário
 */
export function getRequiredApprovalLevel(
  trackData: TrackData | null,
  totalPercentage: number
): 'automatica' | 'coordenacao' | 'direcao' {
  if (!trackData) {
    // Fallback para regras padrão
    if (totalPercentage <= 20) return 'automatica';
    if (totalPercentage <= 50) return 'coordenacao';
    return 'direcao';
  }

  const { nivel_aprovacao_automatica } = trackData.configuracao;
  
  if (totalPercentage <= nivel_aprovacao_automatica) {
    return 'automatica';
  }
  
  if (totalPercentage <= 50) {
    return 'coordenacao';
  }
  
  return 'direcao';
}

/**
 * Utilitário para validar se uma combinação de descontos é válida no trilho
 * 
 * @param trackData - Dados do trilho
 * @param discountCodes - Array de códigos de desconto
 * @param totalPercentage - Percentual total
 * @returns Resultado da validação
 */
export function validateDiscountCombination(
  trackData: TrackData | null,
  discountCodes: string[],
  totalPercentage: number
): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!trackData) {
    warnings.push('Trilho não selecionado - usando regras padrão');
    return { isValid: true, errors, warnings };
  }

  // Verificar CAP
  const cap = getEffectiveCap(trackData);
  if (totalPercentage > cap) {
    errors.push(`Total de ${totalPercentage}% excede o limite de ${cap}% do trilho ${trackData.nome}`);
  }

  // Verificar descontos excluídos
  const { tipos_desconto_excluidos } = trackData.restricoes || {};
  if (tipos_desconto_excluidos) {
    const excludedFound = discountCodes.filter(code => 
      tipos_desconto_excluidos.includes(code)
    );
    if (excludedFound.length > 0) {
      errors.push(`Descontos não permitidos no trilho ${trackData.nome}: ${excludedFound.join(', ')}`);
    }
  }

  // Verificar bolsa integral se não permitida
  if (!trackData.configuracao.permite_bolsa_integral) {
    const hasIntegralScholarship = discountCodes.some(code => 
      ['ABI', 'PASS'].includes(code) // Códigos de bolsa integral
    );
    if (hasIntegralScholarship) {
      errors.push(`Trilho ${trackData.nome} não permite bolsas integrais`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}