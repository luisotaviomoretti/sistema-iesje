import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { usePublicDiscountTypes } from "@/features/admin/hooks/useDiscountTypes";
import { TIPOS_DESCONTO } from "@/features/enrollment/constants";

/**
 * Interface para dados completos de desconto com informações calculadas
 */
export interface DiscountData {
  id: string;
  codigo: string;
  nome: string;
  descricao: string;
  percentual_base: number;
  percentual_efetivo: number; // Calculado com base no trilho
  documentos_necessarios: string[];
  categoria: string;
  ativo: boolean;
  requer_aprovacao: boolean;
  nivel_aprovacao: 'automatica' | 'coordenacao' | 'direcao' | null;
  condicoes_especiais?: string[];
  data_vigencia?: {
    inicio?: string;
    fim?: string;
  };
  metadata?: {
    created_at: string;
    updated_at: string;
    version: number;
  };
}

/**
 * Resultado do hook useDiscountData
 */
export interface UseDiscountDataResult {
  data: DiscountData | null;
  isLoading: boolean;
  error: Error | null;
  isValid: boolean;
  refetch: () => Promise<any>;
}

/**
 * Opções para configurar o hook useDiscountData
 */
export interface UseDiscountDataOptions {
  trackId?: string;
  fallbackToStatic?: boolean;
  enableCaching?: boolean;
  staleTime?: number;
}

/**
 * Hook centralizado para buscar dados completos e atualizados de um desconto
 * 
 * @param discountId - ID único do desconto (pode ser null)
 * @param options - Opções de configuração
 * @returns Dados completos do desconto com estado de loading/error
 */
export function useDiscountData(
  discountId: string | null,
  options: UseDiscountDataOptions = {}
): UseDiscountDataResult {
  const {
    trackId,
    fallbackToStatic = true,
    enableCaching = true,
    staleTime = 5 * 60 * 1000, // 5 minutos
  } = options;

  // Buscar dados dinâmicos do admin
  const { 
    data: dynamicDiscountTypes = [], // SEMPRE inicializar com array vazio como fallback
    isLoading: loadingDynamic, 
    error: dynamicError,
    refetch: refetchDynamic
  } = usePublicDiscountTypes();

  // Query para dados específicos do desconto
  const {
    data: specificDiscountData,
    isLoading: loadingSpecific,
    error: specificError,
    refetch: refetchSpecific
  } = useQuery({
    queryKey: ['discount-data', discountId, trackId],
    queryFn: async () => {
      if (!discountId) return null;
      
      // Buscar dados dinâmicos primeiro
      if (dynamicDiscountTypes && Array.isArray(dynamicDiscountTypes) && dynamicDiscountTypes.length > 0) {
        const dynamicDiscount = dynamicDiscountTypes.find(d => d.id === discountId);
        if (dynamicDiscount) {
          return dynamicDiscount;
        }
      }
      
      // Fallback para dados estáticos se configurado
      if (fallbackToStatic) {
        const staticDiscount = TIPOS_DESCONTO.find(d => d.id === discountId);
        return staticDiscount || null;
      }
      
      return null;
    },
    enabled: !!discountId && enableCaching,
    staleTime,
    retry: 2,
    retryDelay: 1000,
  });

  // Calcular percentual efetivo baseado no trilho
  const calculateEffectivePercentage = useCallback((
    basePercentage: number,
    trackId?: string
  ): number => {
    // Se não há trilho selecionado, usar percentual base
    if (!trackId) return basePercentage;

    // Aplicar lógica específica do trilho se necessário
    // Por enquanto, retorna o percentual base
    // TODO: Implementar lógica específica de trilhos se houver modificadores
    return basePercentage;
  }, []);

  // Determinar nível de aprovação baseado no percentual
  const determineApprovalLevel = useCallback((
    percentage: number
  ): 'automatica' | 'coordenacao' | 'direcao' => {
    if (percentage <= 20) return 'automatica';
    if (percentage <= 50) return 'coordenacao';
    return 'direcao';
  }, []);

  // Processar dados do desconto
  const processedData = useMemo((): DiscountData | null => {
    if (!discountId) return null;

    // Tentar dados específicos primeiro
    let sourceData = specificDiscountData;
    
    // Fallback para dados dinâmicos
    if (!sourceData && dynamicDiscountTypes && Array.isArray(dynamicDiscountTypes) && dynamicDiscountTypes.length > 0) {
      sourceData = dynamicDiscountTypes.find(d => d.id === discountId);
    }
    
    // Fallback final para dados estáticos
    if (!sourceData && fallbackToStatic) {
      sourceData = TIPOS_DESCONTO.find(d => d.id === discountId);
    }

    if (!sourceData) return null;

    // Calcular dados derivados
    const percentual_base = sourceData.percentual_fixo || 0;
    const percentual_efetivo = calculateEffectivePercentage(percentual_base, trackId);
    const nivel_aprovacao = sourceData.requer_aprovacao 
      ? determineApprovalLevel(percentual_efetivo)
      : 'automatica';

    // Processar documentos necessários
    const documentos_necessarios = Array.isArray(sourceData.documentos_necessarios) 
      ? sourceData.documentos_necessarios 
      : [];

    return {
      id: sourceData.id,
      codigo: sourceData.codigo,
      nome: sourceData.nome || sourceData.descricao || sourceData.codigo,
      descricao: sourceData.descricao || sourceData.nome || `Desconto ${sourceData.codigo}`,
      percentual_base,
      percentual_efetivo,
      documentos_necessarios,
      categoria: sourceData.categoria || 'geral',
      ativo: sourceData.ativo !== false, // Default true se não especificado
      requer_aprovacao: sourceData.requer_aprovacao || false,
      nivel_aprovacao,
      condicoes_especiais: sourceData.condicoes_especiais || [],
      data_vigencia: {
        inicio: sourceData.data_inicio,
        fim: sourceData.data_fim,
      },
      metadata: {
        created_at: sourceData.created_at || new Date().toISOString(),
        updated_at: sourceData.updated_at || new Date().toISOString(),
        version: sourceData.version || 1,
      },
    };
  }, [
    discountId,
    specificDiscountData,
    dynamicDiscountTypes,
    trackId,
    fallbackToStatic,
    calculateEffectivePercentage,
    determineApprovalLevel,
  ]);

  // Estados de loading e error
  const isLoading = loadingDynamic || loadingSpecific;
  const error = dynamicError || specificError;
  const isValid = processedData !== null && processedData.ativo;

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
    refetch,
  };
}

/**
 * Hook para buscar múltiplos descontos de uma vez
 * 
 * @param discountIds - Array de IDs de desconto
 * @param options - Opções de configuração
 * @returns Array de dados de desconto
 */
export function useMultipleDiscountData(
  discountIds: (string | null)[],
  options: UseDiscountDataOptions = {}
): {
  data: (DiscountData | null)[];
  isLoading: boolean;
  error: Error | null;
  allValid: boolean;
  refetchAll: () => Promise<any>;
} {
  // Filtrar IDs válidos
  const validIds = discountIds.filter((id): id is string => !!id);
  
  // Buscar dados para cada ID
  const results = validIds.map(id => useDiscountData(id, options));
  
  // Combinar resultados
  const data = discountIds.map(id => {
    if (!id) return null;
    const result = results.find(r => r.data?.id === id);
    return result?.data || null;
  });
  
  const isLoading = results.some(r => r.isLoading);
  const error = results.find(r => r.error)?.error || null;
  const allValid = results.every(r => r.isValid);
  
  const refetchAll = useCallback(async () => {
    const refetches = await Promise.allSettled(
      results.map(r => r.refetch())
    );
    return refetches;
  }, [results]);

  return {
    data,
    isLoading,
    error,
    allValid,
    refetchAll,
  };
}

/**
 * Utilitário para validar se um desconto está disponível
 * 
 * @param discountData - Dados do desconto
 * @returns boolean indicando disponibilidade
 */
export function isDiscountAvailable(discountData: DiscountData | null): boolean {
  if (!discountData) return false;
  
  // Verificar se está ativo
  if (!discountData.ativo) return false;
  
  // Verificar vigência se especificada
  const now = new Date();
  const { data_vigencia } = discountData;
  
  if (data_vigencia?.inicio) {
    const inicio = new Date(data_vigencia.inicio);
    if (now < inicio) return false;
  }
  
  if (data_vigencia?.fim) {
    const fim = new Date(data_vigencia.fim);
    if (now > fim) return false;
  }
  
  return true;
}

/**
 * Utilitário para verificar se um desconto requer documentação
 * 
 * @param discountData - Dados do desconto
 * @returns boolean indicando se requer documentos
 */
export function requiresDocumentation(discountData: DiscountData | null): boolean {
  return !!(discountData?.documentos_necessarios?.length);
}

/**
 * Utilitário para obter o nível de aprovação necessário
 * 
 * @param discountData - Dados do desconto
 * @returns Nível de aprovação ou null se automático
 */
export function getRequiredApprovalLevel(
  discountData: DiscountData | null
): 'coordenacao' | 'direcao' | null {
  if (!discountData?.requer_aprovacao) return null;
  
  const { nivel_aprovacao } = discountData;
  return nivel_aprovacao === 'automatica' ? null : nivel_aprovacao;
}