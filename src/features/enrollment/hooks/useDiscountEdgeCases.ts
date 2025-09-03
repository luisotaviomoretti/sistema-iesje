import { useCallback, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import type { DiscountData } from "./useDiscountData";
import type { TrackData } from "./useTrackData";
import type { CalculatedTotals } from "./useCalculatedTotals";

/**
 * Tipos de edge cases que podem ocorrer
 */
export type EdgeCaseType = 
  | 'discount_not_found'
  | 'discount_inactive'
  | 'track_not_found'
  | 'track_inactive'
  | 'invalid_combination'
  | 'network_error'
  | 'cache_stale'
  | 'data_corrupted'
  | 'permission_denied'
  | 'calculation_overflow'
  | 'concurrent_modification';

/**
 * Informações sobre um edge case
 */
export interface EdgeCaseInfo {
  type: EdgeCaseType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  suggestion?: string;
  recoverable: boolean;
  timestamp: string;
  context?: Record<string, any>;
}

/**
 * Resultado do hook de edge cases
 */
export interface UseDiscountEdgeCasesResult {
  edgeCases: EdgeCaseInfo[];
  hasEdgeCases: boolean;
  hasCriticalIssues: boolean;
  clearEdgeCase: (type: EdgeCaseType) => void;
  clearAllEdgeCases: () => void;
  reportEdgeCase: (info: Omit<EdgeCaseInfo, 'timestamp'>) => void;
}

/**
 * Hook para gerenciar edge cases do sistema de descontos
 * 
 * Este hook centraliza o tratamento de todos os casos extremos que podem
 * ocorrer no sistema de descontos, fornecendo feedback apropriado ao usuário
 * e estratégias de recuperação.
 */
export function useDiscountEdgeCases(): UseDiscountEdgeCasesResult {
  const { toast } = useToast();
  const [edgeCases, setEdgeCases] = useState<EdgeCaseInfo[]>([]);

  // Reportar um edge case
  const reportEdgeCase = useCallback((info: Omit<EdgeCaseInfo, 'timestamp'>) => {
    const edgeCase: EdgeCaseInfo = {
      ...info,
      timestamp: new Date().toISOString(),
    };

    setEdgeCases(prev => {
      // Evitar duplicatas do mesmo tipo
      const filtered = prev.filter(ec => ec.type !== info.type);
      return [...filtered, edgeCase];
    });

    // Mostrar toast baseado na severidade
    if (info.severity === 'critical' || info.severity === 'high') {
      toast({
        title: "Problema Detectado",
        description: info.message,
        variant: "destructive",
      });
    } else if (info.severity === 'medium') {
      toast({
        title: "Aviso",
        description: info.message,
        variant: "default",
      });
    }
  }, [toast]);

  // Limpar um edge case específico
  const clearEdgeCase = useCallback((type: EdgeCaseType) => {
    setEdgeCases(prev => prev.filter(ec => ec.type !== type));
  }, []);

  // Limpar todos os edge cases
  const clearAllEdgeCases = useCallback(() => {
    setEdgeCases([]);
  }, []);

  // Estados derivados
  const hasEdgeCases = edgeCases.length > 0;
  const hasCriticalIssues = edgeCases.some(ec => ec.severity === 'critical');

  return {
    edgeCases,
    hasEdgeCases,
    hasCriticalIssues,
    clearEdgeCase,
    clearAllEdgeCases,
    reportEdgeCase,
  };
}

/**
 * Hook para validar dados de desconto e detectar edge cases
 */
export function useDiscountDataValidation(
  discountData: DiscountData | null,
  discountId: string | null
) {
  const { reportEdgeCase, clearEdgeCase } = useDiscountEdgeCases();

  useEffect(() => {
    if (!discountId) return;

    // Validar se desconto foi encontrado
    if (!discountData) {
      reportEdgeCase({
        type: 'discount_not_found',
        severity: 'high',
        message: `Desconto ${discountId} não encontrado`,
        suggestion: 'Verifique se o desconto ainda existe no sistema',
        recoverable: true,
        context: { discountId },
      });
      return;
    }

    // Validar se desconto está ativo
    if (!discountData.ativo) {
      reportEdgeCase({
        type: 'discount_inactive',
        severity: 'medium',
        message: `Desconto ${discountData.codigo} está inativo`,
        suggestion: 'Selecione um desconto ativo ou contate o administrador',
        recoverable: true,
        context: { discountData },
      });
      return;
    }

    // Validar dados essenciais
    if (!discountData.percentual_base || discountData.percentual_base <= 0) {
      reportEdgeCase({
        type: 'data_corrupted',
        severity: 'high',
        message: `Dados do desconto ${discountData.codigo} estão corrompidos`,
        suggestion: 'Recarregue a página ou contate o suporte',
        recoverable: true,
        context: { discountData },
      });
      return;
    }

    // Se chegou aqui, limpar edge cases relacionados
    clearEdgeCase('discount_not_found');
    clearEdgeCase('discount_inactive');
    clearEdgeCase('data_corrupted');
  }, [discountData, discountId, reportEdgeCase, clearEdgeCase]);
}

/**
 * Hook para validar dados de trilho e detectar edge cases
 */
export function useTrackDataValidation(
  trackData: TrackData | null,
  trackId: string | null
) {
  const { reportEdgeCase, clearEdgeCase } = useDiscountEdgeCases();

  useEffect(() => {
    if (!trackId) return;

    // Validar se trilho foi encontrado
    if (!trackData) {
      reportEdgeCase({
        type: 'track_not_found',
        severity: 'high',
        message: `Trilho ${trackId} não encontrado`,
        suggestion: 'Selecione um trilho válido',
        recoverable: true,
        context: { trackId },
      });
      return;
    }

    // Validar se trilho está ativo
    if (!trackData.metadata.ativo) {
      reportEdgeCase({
        type: 'track_inactive',
        severity: 'medium',
        message: `Trilho ${trackData.nome} está inativo`,
        suggestion: 'Selecione um trilho ativo',
        recoverable: true,
        context: { trackData },
      });
      return;
    }

    // Se chegou aqui, limpar edge cases relacionados
    clearEdgeCase('track_not_found');
    clearEdgeCase('track_inactive');
  }, [trackData, trackId, reportEdgeCase, clearEdgeCase]);
}

/**
 * Hook para validar cálculos e detectar edge cases
 */
export function useCalculationValidation(totals: CalculatedTotals) {
  const { reportEdgeCase, clearEdgeCase } = useDiscountEdgeCases();

  useEffect(() => {
    // Validar overflow numérico
    if (totals.valor_final < 0) {
      reportEdgeCase({
        type: 'calculation_overflow',
        severity: 'critical',
        message: 'Cálculo resultou em valor negativo',
        suggestion: 'Revise os descontos selecionados',
        recoverable: true,
        context: { totals },
      });
      return;
    }

    // Validar percentuais impossíveis
    if (totals.percentual_aplicado > 100) {
      reportEdgeCase({
        type: 'calculation_overflow',
        severity: 'high',
        message: 'Percentual de desconto excede 100%',
        suggestion: 'Verifique a configuração dos descontos',
        recoverable: true,
        context: { totals },
      });
      return;
    }

    // Validar inconsistências entre campos
    const expectedValorDesconto = (totals.valor_base * totals.percentual_aplicado) / 100;
    const diferencaDesconto = Math.abs(totals.valor_desconto - expectedValorDesconto);
    
    if (diferencaDesconto > 0.01) { // Margem de erro de 1 centavo
      reportEdgeCase({
        type: 'data_corrupted',
        severity: 'medium',
        message: 'Inconsistência detectada nos cálculos',
        suggestion: 'Recarregue a página para recalcular',
        recoverable: true,
        context: { 
          expected: expectedValorDesconto,
          actual: totals.valor_desconto,
          difference: diferencaDesconto 
        },
      });
      return;
    }

    // Se chegou aqui, limpar edge cases de cálculo
    clearEdgeCase('calculation_overflow');
    clearEdgeCase('data_corrupted');
  }, [totals, reportEdgeCase, clearEdgeCase]);
}

/**
 * Utilitário para tratar erros de rede
 */
export function handleNetworkError(error: Error, context: string) {
  const { reportEdgeCase } = useDiscountEdgeCases();

  // Detectar tipos específicos de erro
  if (error.message.includes('fetch')) {
    reportEdgeCase({
      type: 'network_error',
      severity: 'high',
      message: 'Erro de conexão com o servidor',
      suggestion: 'Verifique sua conexão e tente novamente',
      recoverable: true,
      context: { error: error.message, context },
    });
  } else if (error.message.includes('timeout')) {
    reportEdgeCase({
      type: 'network_error',
      severity: 'medium',
      message: 'Timeout ao carregar dados',
      suggestion: 'Aguarde um momento e tente novamente',
      recoverable: true,
      context: { error: error.message, context },
    });
  } else if (error.message.includes('403') || error.message.includes('401')) {
    reportEdgeCase({
      type: 'permission_denied',
      severity: 'high',
      message: 'Sem permissão para acessar os dados',
      suggestion: 'Entre em contato com o administrador',
      recoverable: false,
      context: { error: error.message, context },
    });
  } else {
    reportEdgeCase({
      type: 'network_error',
      severity: 'medium',
      message: 'Erro inesperado ao carregar dados',
      suggestion: 'Tente recarregar a página',
      recoverable: true,
      context: { error: error.message, context },
    });
  }
}

/**
 * Utilitário para detectar modificações concorrentes
 */
export function detectConcurrentModification(
  currentVersion: number,
  expectedVersion: number,
  resourceType: string,
  resourceId: string
) {
  const { reportEdgeCase } = useDiscountEdgeCases();

  if (currentVersion !== expectedVersion) {
    reportEdgeCase({
      type: 'concurrent_modification',
      severity: 'medium',
      message: `${resourceType} foi modificado por outro usuário`,
      suggestion: 'Recarregue os dados para ver as alterações mais recentes',
      recoverable: true,
      context: { 
        resourceType,
        resourceId,
        currentVersion,
        expectedVersion 
      },
    });
  }
}

/**
 * Utilitário para recuperação automática de edge cases
 */
export function useEdgeCaseRecovery() {
  const { edgeCases, clearEdgeCase } = useDiscountEdgeCases();

  useEffect(() => {
    edgeCases.forEach(edgeCase => {
      if (!edgeCase.recoverable) return;

      // Estratégias de recuperação automática
      switch (edgeCase.type) {
        case 'cache_stale':
          // Auto-refresh após 5 segundos
          setTimeout(() => {
            window.location.reload();
          }, 5000);
          break;

        case 'network_error':
          // Retry automático após 10 segundos para erros de rede
          setTimeout(() => {
            clearEdgeCase('network_error');
          }, 10000);
          break;

        case 'discount_inactive':
        case 'track_inactive':
          // Limpar após 30 segundos para dar chance de reativação
          setTimeout(() => {
            clearEdgeCase(edgeCase.type);
          }, 30000);
          break;
      }
    });
  }, [edgeCases, clearEdgeCase]);
}

/**
 * Export do hook para uso em formulários
 */
import { useState } from "react";
export { useDiscountEdgeCases, useDiscountDataValidation, useTrackDataValidation, useCalculationValidation, handleNetworkError, detectConcurrentModification, useEdgeCaseRecovery };