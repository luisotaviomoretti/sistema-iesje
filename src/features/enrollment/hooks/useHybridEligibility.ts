/**
 * HOOKS PARA SISTEMA HÍBRIDO DE ELEGIBILIDADE
 * 
 * Prioriza regras do Painel Admin, com fallback para frontend
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { HybridEligibilityService, type HybridEligibilityResult } from '../services/hybridEligibilityService';
import { type CepCategory } from '../utils/cepClassifier';

/**
 * Hook para classificação CEP híbrida
 */
export const useHybridCepClassification = (cep: string | undefined) => {
  return useQuery({
    queryKey: ['hybrid-cep-classification', cep],
    queryFn: () => HybridEligibilityService.classifyCepWithDatabase(cep),
    enabled: !!cep && cep.replace(/\D/g, '').length === 8,
    staleTime: 10 * 60 * 1000, // 10 minutos
    gcTime: 30 * 60 * 1000, // 30 minutos
  });
};

/**
 * Hook para descontos com elegibilidade híbrida
 */
export const useHybridEligibleDiscounts = (
  cep: string | undefined,
  allDiscounts: any[]
) => {
  return useQuery<HybridEligibilityResult>({
    queryKey: ['hybrid-eligible-discounts', cep, allDiscounts.length],
    queryFn: () => HybridEligibilityService.getDiscountsWithEligibility(cep, allDiscounts),
    enabled: allDiscounts.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 15 * 60 * 1000, // 15 minutos
  });
};

/**
 * Hook para validação de desconto individual
 */
export const useHybridDiscountValidation = (
  cep: string | undefined,
  discountCode: string | undefined
) => {
  return useQuery({
    queryKey: ['hybrid-discount-validation', cep, discountCode],
    queryFn: () => {
      if (!discountCode) return { elegivel: true, motivo: null, source: 'frontend' };
      return HybridEligibilityService.isDiscountEligible(cep, discountCode);
    },
    enabled: !!discountCode && !!cep,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

/**
 * Hook para validação de múltiplos descontos
 */
export const useHybridDiscountsValidation = (
  cep: string | undefined,
  selectedDiscountCodes: string[],
  allDiscounts: any[]
) => {
  return useQuery({
    queryKey: ['hybrid-discounts-validation', cep, selectedDiscountCodes, allDiscounts.length],
    queryFn: () => HybridEligibilityService.validateSelectedDiscounts(cep, selectedDiscountCodes, allDiscounts),
    enabled: selectedDiscountCodes.length > 0 && allDiscounts.length > 0,
    staleTime: 2 * 60 * 1000, // 2 minutos (validação mais frequente)
    gcTime: 5 * 60 * 1000,
  });
};

/**
 * Hook para status do sistema (debug/informativo)
 */
export const useHybridSystemStatus = (cep: string | undefined) => {
  return useQuery({
    queryKey: ['hybrid-system-status', cep],
    queryFn: () => HybridEligibilityService.getSystemStatus(cep),
    enabled: !!cep,
    staleTime: 15 * 60 * 1000, // 15 minutos
    gcTime: 30 * 60 * 1000,
  });
};

/**
 * Hook integrado para uso fácil no StepDescontos
 */
export const useIntegratedEligibilitySystem = (
  cep: string | undefined,
  allDiscounts: any[],
  selectedDiscountCodes: string[] = []
) => {
  const queryClient = useQueryClient();
  
  // Dados principais
  const cepClassification = useHybridCepClassification(cep);
  const eligibilityData = useHybridEligibleDiscounts(cep, allDiscounts);
  const validation = useHybridDiscountsValidation(cep, selectedDiscountCodes, allDiscounts);
  const systemStatus = useHybridSystemStatus(cep);
  
  // Dados computados
  const isLoading = cepClassification.isLoading || eligibilityData.isLoading;
  const hasError = cepClassification.error || eligibilityData.error;
  
  const cepCategory = cepClassification.data?.categoria || null;
  const isUsingDatabaseRules = eligibilityData.data?.isUsingDatabaseRules || false;
  const dataSource = eligibilityData.data?.source || 'frontend';
  
  const availableDiscounts = eligibilityData.data?.eligible || allDiscounts;
  const blockedDiscounts = eligibilityData.data?.blocked || [];
  const automaticDiscounts = eligibilityData.data?.automatic || [];
  
  const stats = eligibilityData.data?.stats || {
    total: allDiscounts.length,
    eligible: allDiscounts.length,
    blocked: 0,
    automatic: 0
  };
  
  // Função para invalidar caches quando necessário
  const refreshEligibility = () => {
    queryClient.invalidateQueries({ queryKey: ['hybrid-eligible-discounts'] });
    queryClient.invalidateQueries({ queryKey: ['hybrid-discounts-validation'] });
  };
  
  // Função para verificar elegibilidade de um desconto específico
  const checkDiscountEligibility = async (discountCode: string) => {
    return await HybridEligibilityService.isDiscountEligible(cep, discountCode);
  };
  
  return {
    // Status do sistema
    isLoading,
    hasError,
    isUsingDatabaseRules,
    dataSource,
    
    // Dados de CEP
    cepCategory,
    cepClassification: cepClassification.data,
    
    // Dados de elegibilidade
    availableDiscounts,
    blockedDiscounts,
    automaticDiscounts,
    stats,
    
    // Validação de selecionados
    validation: validation.data,
    
    // Status do sistema
    systemStatus: systemStatus.data,
    
    // Funções utilitárias
    refreshEligibility,
    checkDiscountEligibility,
  };
};