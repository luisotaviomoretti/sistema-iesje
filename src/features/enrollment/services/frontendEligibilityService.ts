/**
 * SERVIÇO DE ELEGIBILIDADE - FRONTEND PURO
 * Substitui toda a complexidade backend por lógica simples no frontend
 */

import { classifyCep, logCepClassification, type CepCategory } from '../utils/cepClassifier';
import {
  isDiscountEligible,
  getBlockedDiscounts,
  getAutomaticDiscounts,
  getRestrictionReason,
  getEligibilityStats,
  filterEligibleDiscounts,
  validateSelectedDiscounts,
  getAlternativeDiscounts,
  debugEligibilityMatrix,
} from '../rules/eligibilityMatrix';

export interface EligibilityValidationResult {
  isValid: boolean;
  categoria: CepCategory | null;
  invalidDiscounts: string[];
  removedDiscounts: string[];
  automaticDiscounts: string[];
  messages: string[];
  suggestions: Record<string, string[]>;
}

export interface DiscountWithEligibility {
  codigo: string;
  descricao: string;
  categoria: string;
  percentual_fixo?: number;
  elegivel: boolean;
  motivo_restricao?: string;
}

/**
 * SERVIÇO PRINCIPAL DE ELEGIBILIDADE FRONTEND
 */
export class FrontendEligibilityService {
  
  /**
   * Classificar CEP e obter categoria
   */
  static classifyCep(cep: string | undefined, enableDebug = false): CepCategory | null {
    if (enableDebug) {
      return logCepClassification(cep).categoria;
    }
    return classifyCep(cep).categoria;
  }

  /**
   * Verificar se um desconto é elegível
   */
  static isDiscountEligible(cep: string | undefined, discountCode: string): boolean {
    const categoria = this.classifyCep(cep);
    return isDiscountEligible(categoria, discountCode);
  }

  /**
   * Obter descontos elegíveis para um CEP
   */
  static getEligibleDiscounts<T extends { codigo: string }>(
    cep: string | undefined,
    allDiscounts: T[],
    enableDebug = false
  ): T[] {
    const categoria = this.classifyCep(cep, enableDebug);
    
    if (enableDebug) {
      console.group('🎯 Filtering Eligible Discounts');
      console.log('CEP:', cep);
      console.log('Categoria:', categoria);
      console.log('Total discounts:', allDiscounts.length);
    }
    
    const eligible = filterEligibleDiscounts(categoria, allDiscounts);
    
    if (enableDebug) {
      console.log('Eligible discounts:', eligible.length);
      console.log('Blocked discounts:', getBlockedDiscounts(categoria));
      console.log('Automatic discounts:', getAutomaticDiscounts(categoria));
      console.groupEnd();
    }
    
    return eligible;
  }

  /**
   * Enriquecer lista de descontos com informações de elegibilidade
   */
  static enrichDiscountsWithEligibility<T extends { codigo: string; descricao: string; categoria: string }>(
    cep: string | undefined,
    allDiscounts: T[]
  ): DiscountWithEligibility[] {
    const categoria = this.classifyCep(cep);
    
    return allDiscounts.map(discount => ({
      codigo: discount.codigo,
      descricao: discount.descricao,
      categoria: discount.categoria,
      percentual_fixo: (discount as any).percentual_fixo,
      elegivel: isDiscountEligible(categoria, discount.codigo),
      motivo_restricao: getRestrictionReason(categoria, discount.codigo) || undefined,
    }));
  }

  /**
   * Validar lista de descontos selecionados
   */
  static validateDiscounts(
    cep: string | undefined,
    selectedDiscountCodes: string[],
    allDiscounts: { codigo: string; descricao: string; categoria: string }[]
  ): EligibilityValidationResult {
    const categoria = this.classifyCep(cep);
    const validation = validateSelectedDiscounts(categoria, selectedDiscountCodes);
    const automaticDiscounts = getAutomaticDiscounts(categoria);
    
    const result: EligibilityValidationResult = {
      isValid: validation.invalid.length === 0,
      categoria,
      invalidDiscounts: validation.invalid,
      removedDiscounts: validation.invalid, // Mesma lista neste caso
      automaticDiscounts,
      messages: [],
      suggestions: {},
    };

    // Gerar mensagens
    validation.invalid.forEach(code => {
      const discount = allDiscounts.find(d => d.codigo === code);
      const reason = validation.reasons[code];
      
      if (discount && reason) {
        result.messages.push(`${discount.descricao}: ${reason}`);
        
        // Gerar sugestões
        const alternatives = getAlternativeDiscounts(categoria, code, allDiscounts);
        if (alternatives.length > 0) {
          result.suggestions[code] = alternatives.map(alt => 
            `${alt.codigo} - ${alt.descricao}`
          );
        }
      }
    });

    return result;
  }

  /**
   * Obter estatísticas de elegibilidade
   */
  static getEligibilityStats(cep: string | undefined, allDiscountCodes: string[]) {
    const categoria = this.classifyCep(cep);
    return getEligibilityStats(categoria, allDiscountCodes);
  }

  /**
   * Obter descontos automáticos para um CEP
   */
  static getAutomaticDiscounts(cep: string | undefined): string[] {
    const categoria = this.classifyCep(cep);
    return getAutomaticDiscounts(categoria);
  }

  /**
   * Obter descrição da categoria CEP
   */
  static getCepCategoryDescription(cep: string | undefined): string {
    const classification = classifyCep(cep);
    return classification.descricao;
  }

  /**
   * Verificar se um desconto deveria ser aplicado automaticamente
   */
  static shouldAutoApplyDiscount(cep: string | undefined, discountCode: string): boolean {
    const automaticDiscounts = this.getAutomaticDiscounts(cep);
    return automaticDiscounts.includes(discountCode);
  }

  /**
   * Obter informações completas sobre um CEP
   */
  static getCepInfo(cep: string | undefined) {
    const classification = classifyCep(cep);
    const categoria = classification.categoria;
    const stats = categoria ? getEligibilityStats(categoria, []) : null;
    
    return {
      classification,
      categoria,
      stats,
      automaticDiscounts: getAutomaticDiscounts(categoria),
      blockedDiscounts: getBlockedDiscounts(categoria),
    };
  }

  /**
   * Debug completo do sistema para um CEP
   */
  static debugCep(cep: string | undefined): void {
    console.group(`🧪 DEBUG COMPLETO - CEP: ${cep}`);
    
    // 1. Classificação
    const classification = logCepClassification(cep);
    
    // 2. Matriz de elegibilidade
    debugEligibilityMatrix(classification.categoria);
    
    // 3. Informações gerais
    const info = this.getCepInfo(cep);
    console.log('📊 Informações completas:', info);
    
    console.groupEnd();
  }

  /**
   * Testar sistema com vários CEPs
   */
  static testSystem(): void {
    const testCeps = [
      '37701-000', // Alta renda
      '37704-000', // Baixa renda  
      '13000-000', // Fora
      '99999-999', // Inexistente
    ];

    console.group('🧪 TESTE COMPLETO DO SISTEMA');
    
    testCeps.forEach(cep => {
      console.group(`📍 CEP: ${cep}`);
      
      const classification = classifyCep(cep);
      console.log('Classificação:', classification);
      
      const stats = this.getEligibilityStats(cep, ['IIR', 'CEP5', 'CEP10', 'ABI', 'ABP', 'RES']);
      console.log('Estatísticas:', stats);
      
      console.groupEnd();
    });
    
    console.groupEnd();
  }
}

// Funções utilitárias exportadas para uso direto
export {
  isDiscountEligible,
  getBlockedDiscounts,
  getAutomaticDiscounts,
  getRestrictionReason,
  filterEligibleDiscounts,
  validateSelectedDiscounts,
};

// Instância padrão para uso fácil
export const eligibilityService = FrontendEligibilityService;