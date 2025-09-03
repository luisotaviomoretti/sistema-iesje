import { useMemo, useCallback } from "react";
import { useMultipleDiscountData, type DiscountData } from "./useDiscountData";
import { useTrackData, type TrackData, getEffectiveCap, validateDiscountCombination, getRequiredApprovalLevel } from "./useTrackData";

/**
 * Detalhe individual de desconto no cálculo
 */
export interface DiscountDetail {
  id: string;
  codigo: string;
  nome: string;
  percentual_original: number;
  percentual_aplicado: number;
  valor_desconto: number;
  status_elegibilidade: 'elegivel' | 'bloqueado' | 'condicional';
  motivo_status?: string;
  requer_documentacao: boolean;
  documentos_pendentes: string[];
  nivel_aprovacao: 'automatica' | 'coordenacao' | 'direcao';
}

/**
 * Resultado completo dos cálculos
 */
export interface CalculatedTotals {
  // Informações dos descontos
  descontos: DiscountDetail[];
  
  // Cálculos principais
  subtotal_percentual: number; // Soma sem aplicar CAP
  percentual_aplicado: number; // Após aplicar CAP
  valor_base: number;
  valor_desconto: number; // Valor monetário do desconto
  valor_final: number;
  economia_mensal: number;
  economia_anual: number;
  
  // Informações do trilho
  trilho_info: {
    id: string;
    nome: string;
    cap: number;
    cap_aplicado: boolean;
    permite_bolsa_integral: boolean;
  };
  
  // Validação e aprovação
  validacao: {
    is_valid: boolean;
    errors: string[];
    warnings: string[];
    nivel_aprovacao_necessario: 'automatica' | 'coordenacao' | 'direcao';
  };
  
  // Estatísticas
  estatisticas: {
    quantidade_descontos: number;
    desconto_maior: number;
    desconto_menor: number;
    percentual_economia: number;
  };
  
  // Metadados do cálculo
  metadata: {
    calculado_em: string;
    versao_calculo: string;
    trilho_usado: string;
    descontos_ids: string[];
  };
}

/**
 * Estados do hook useCalculatedTotals
 */
export interface UseCalculatedTotalsResult {
  totals: CalculatedTotals;
  isCalculating: boolean;
  error: Error | null;
  isValid: boolean;
  hasWarnings: boolean;
  recalculate: () => void;
}

/**
 * Opções para configurar o cálculo
 */
export interface CalculationOptions {
  includeInactiveDiscounts?: boolean;
  validateDocumentation?: boolean;
  applyCapAutomatically?: boolean;
  considerSpecialRules?: boolean;
}

/**
 * Hook centralizado para todos os cálculos de desconto
 * 
 * Esta é a fonte única de verdade para todos os cálculos de desconto no sistema.
 * Combina dados de trilhos e descontos para produzir resultados consistentes.
 * 
 * @param trackId - ID do trilho selecionado
 * @param discountIds - Array de IDs dos descontos selecionados
 * @param valorBase - Valor base da mensalidade
 * @param options - Opções de configuração do cálculo
 * @returns Objeto completo com todos os cálculos e validações
 */
export function useCalculatedTotals(
  trackId: string | null,
  discountIds: (string | null)[],
  valorBase: number,
  options: CalculationOptions = {}
): UseCalculatedTotalsResult {
  const {
    includeInactiveDiscounts = false,
    validateDocumentation = true,
    applyCapAutomatically = true,
    considerSpecialRules = true,
  } = options;

  // Buscar dados do trilho
  const { 
    data: trackData, 
    isLoading: trackLoading, 
    error: trackError 
  } = useTrackData(trackId);

  // Buscar dados dos descontos
  const { 
    data: discountsData, 
    isLoading: discountsLoading, 
    error: discountsError,
    refetchAll: refetchDiscounts
  } = useMultipleDiscountData(discountIds);

  // Estado de loading e error
  const isCalculating = trackLoading || discountsLoading;
  const error = trackError || discountsError;

  // Função para calcular detalhes individuais dos descontos
  const calculateDiscountDetails = useCallback((
    discounts: (DiscountData | null)[],
    track: TrackData | null,
    baseValue: number
  ): DiscountDetail[] => {
    return discounts
      .filter((discount): discount is DiscountData => {
        if (!discount) return false;
        return includeInactiveDiscounts || discount.ativo;
      })
      .map((discount) => {
        const percentualOriginal = discount.percentual_efetivo;
        const valorIndividual = (baseValue * percentualOriginal) / 100;
        
        // Determinar elegibilidade
        let statusElegibilidade: 'elegivel' | 'bloqueado' | 'condicional' = 'elegivel';
        let motivoStatus: string | undefined;
        
        if (!discount.ativo) {
          statusElegibilidade = 'bloqueado';
          motivoStatus = 'Desconto inativo';
        } else if (track && !validateDiscountCombination(track, [discount.codigo], percentualOriginal).isValid) {
          statusElegibilidade = 'bloqueado';
          motivoStatus = 'Não permitido neste trilho';
        } else if (discount.requer_aprovacao) {
          statusElegibilidade = 'condicional';
          motivoStatus = 'Requer aprovação';
        }

        return {
          id: discount.id,
          codigo: discount.codigo,
          nome: discount.nome,
          percentual_original: percentualOriginal,
          percentual_aplicado: percentualOriginal, // Será ajustado com CAP depois
          valor_desconto: valorIndividual,
          status_elegibilidade: statusElegibilidade,
          motivo_status: motivoStatus,
          requer_documentacao: discount.documentos_necessarios.length > 0,
          documentos_pendentes: validateDocumentation ? discount.documentos_necessarios : [],
          nivel_aprovacao: discount.nivel_aprovacao || 'automatica',
        };
      });
  }, [includeInactiveDiscounts, validateDocumentation]);

  // Função principal de cálculo
  const calculateTotals = useCallback((
    discountDetails: DiscountDetail[],
    track: TrackData | null,
    baseValue: number
  ): CalculatedTotals => {
    // Cálculos básicos
    const subtotalPercentual = discountDetails
      .filter(d => d.status_elegibilidade !== 'bloqueado')
      .reduce((sum, d) => sum + d.percentual_original, 0);

    // Determinar CAP efetivo
    const cap = getEffectiveCap(track);
    const capAplicado = applyCapAutomatically && subtotalPercentual > cap;
    const percentualAplicado = capAplicado ? cap : subtotalPercentual;

    // Verificar regras especiais
    let percentualFinal = percentualAplicado;
    
    if (considerSpecialRules) {
      // Regra: Bolsa integral sempre tem prioridade
      const temBolsaIntegral = discountDetails.some(d => 
        d.percentual_original === 100 && ['ABI', 'PASS'].includes(d.codigo)
      );
      
      if (temBolsaIntegral) {
        percentualFinal = 100;
      }
    }

    // Ajustar percentuais aplicados individuais proporcionalmente se houver CAP
    const discountDetailsAdjusted = discountDetails.map(detail => {
      if (detail.status_elegibilidade === 'bloqueado') return detail;
      
      let percentualAjustado = detail.percentual_original;
      
      if (capAplicado && subtotalPercentual > 0) {
        // Aplicar proporcionalmente
        percentualAjustado = (detail.percentual_original / subtotalPercentual) * percentualFinal;
      }
      
      return {
        ...detail,
        percentual_aplicado: percentualAjustado,
        valor_desconto: (baseValue * percentualAjustado) / 100,
      };
    });

    // Cálculos finais
    const valorDesconto = (baseValue * percentualFinal) / 100;
    const valorFinal = baseValue - valorDesconto;
    const economiaMensal = valorDesconto;
    const economiaAnual = economiaMensal * 12;

    // Validação
    const discountCodes = discountDetails
      .filter(d => d.status_elegibilidade !== 'bloqueado')
      .map(d => d.codigo);
      
    const validacao = track 
      ? validateDiscountCombination(track, discountCodes, percentualFinal)
      : { isValid: true, errors: [], warnings: [] };

    // Nível de aprovação necessário
    const nivelAprovacao = getRequiredApprovalLevel(track, percentualFinal);

    // Informações do trilho
    const trilhoInfo = {
      id: track?.id || 'default',
      nome: track?.nome || 'Padrão',
      cap,
      cap_aplicado: capAplicado,
      permite_bolsa_integral: track?.configuracao?.permite_bolsa_integral || true,
    };

    // Estatísticas
    const percentuaisValidos = discountDetailsAdjusted
      .filter(d => d.status_elegibilidade !== 'bloqueado')
      .map(d => d.percentual_aplicado);
      
    const estatisticas = {
      quantidade_descontos: percentuaisValidos.length,
      desconto_maior: percentuaisValidos.length > 0 ? Math.max(...percentuaisValidos) : 0,
      desconto_menor: percentuaisValidos.length > 0 ? Math.min(...percentuaisValidos) : 0,
      percentual_economia: baseValue > 0 ? (valorDesconto / baseValue) * 100 : 0,
    };

    return {
      descontos: discountDetailsAdjusted,
      subtotal_percentual: subtotalPercentual,
      percentual_aplicado: percentualFinal,
      valor_base: baseValue,
      valor_desconto: valorDesconto,
      valor_final: valorFinal,
      economia_mensal: economiaMensal,
      economia_anual: economiaAnual,
      trilho_info: trilhoInfo,
      validacao: {
        is_valid: validacao.isValid,
        errors: validacao.errors,
        warnings: validacao.warnings,
        nivel_aprovacao_necessario: nivelAprovacao,
      },
      estatisticas,
      metadata: {
        calculado_em: new Date().toISOString(),
        versao_calculo: '2.0.0',
        trilho_usado: track?.id || 'default',
        descontos_ids: discountIds.filter((id): id is string => !!id),
      },
    };
  }, [applyCapAutomatically, considerSpecialRules, discountIds]);

  // Cálculo principal (memoizado)
  const totals = useMemo((): CalculatedTotals => {
    // Valores padrão quando não há dados
    const defaultTotals: CalculatedTotals = {
      descontos: [],
      subtotal_percentual: 0,
      percentual_aplicado: 0,
      valor_base: valorBase,
      valor_desconto: 0,
      valor_final: valorBase,
      economia_mensal: 0,
      economia_anual: 0,
      trilho_info: {
        id: 'default',
        nome: 'Padrão',
        cap: 60,
        cap_aplicado: false,
        permite_bolsa_integral: true,
      },
      validacao: {
        is_valid: true,
        errors: [],
        warnings: [],
        nivel_aprovacao_necessario: 'automatica',
      },
      estatisticas: {
        quantidade_descontos: 0,
        desconto_maior: 0,
        desconto_menor: 0,
        percentual_economia: 0,
      },
      metadata: {
        calculado_em: new Date().toISOString(),
        versao_calculo: '2.0.0',
        trilho_usado: 'default',
        descontos_ids: [],
      },
    };

    if (isCalculating || error) {
      return defaultTotals;
    }

    if (valorBase <= 0) {
      return {
        ...defaultTotals,
        validacao: {
          is_valid: false,
          errors: ['Valor base deve ser maior que zero'],
          warnings: [],
          nivel_aprovacao_necessario: 'automatica',
        },
      };
    }

    // Calcular detalhes dos descontos
    const discountDetails = calculateDiscountDetails(discountsData, trackData, valorBase);
    
    // Calcular totais
    return calculateTotals(discountDetails, trackData, valorBase);
  }, [
    trackData, 
    discountsData, 
    valorBase, 
    isCalculating, 
    error,
    calculateDiscountDetails,
    calculateTotals
  ]);

  // Função para forçar recálculo
  const recalculate = useCallback(() => {
    refetchDiscounts();
  }, [refetchDiscounts]);

  // Estados derivados
  const isValid = !error && totals.validacao.is_valid;
  const hasWarnings = totals.validacao.warnings.length > 0;

  return {
    totals,
    isCalculating,
    error,
    isValid,
    hasWarnings,
    recalculate,
    // Dados adicionais para evitar duplicação de hooks
    trackData,
    discountsData
  };
}

/**
 * Hook simplificado para cenários que só precisam do total
 * 
 * @param trackId - ID do trilho
 * @param discountIds - IDs dos descontos
 * @param valorBase - Valor base
 * @returns Apenas o percentual e valor final
 */
export function useSimpleTotal(
  trackId: string | null,
  discountIds: (string | null)[],
  valorBase: number
): {
  percentual: number;
  valorFinal: number;
  isValid: boolean;
} {
  const { totals, isValid } = useCalculatedTotals(trackId, discountIds, valorBase);
  
  return {
    percentual: totals.percentual_aplicado,
    valorFinal: totals.valor_final,
    isValid,
  };
}

/**
 * Utilitário para comparar diferentes cenários de cálculo
 * 
 * @param scenarios - Array de cenários para comparar
 * @returns Comparação dos cenários
 */
export function useCalculationComparison(
  scenarios: Array<{
    name: string;
    trackId: string | null;
    discountIds: (string | null)[];
    valorBase: number;
  }>
): Array<{
  name: string;
  totals: CalculatedTotals;
  isValid: boolean;
}> {
  return scenarios.map(scenario => {
    const { totals, isValid } = useCalculatedTotals(
      scenario.trackId,
      scenario.discountIds,
      scenario.valorBase
    );
    
    return {
      name: scenario.name,
      totals,
      isValid,
    };
  });
}