import { CepCategory, EligibleDiscount } from '../hooks/useEligibleDiscounts';
import { TipoDesconto } from '@/features/admin/hooks/useDiscountTypes';

export interface ValidationResult {
  isValid: boolean;
  invalidDiscounts: string[];
  removedDiscounts: string[];
  suggestions: Map<string, string[]>;
  messages: string[];
}

export interface DiscountValidation {
  codigo: string;
  elegivel: boolean;
  motivo: string | null;
  sugestoes: string[];
}

/**
 * Serviço de validação e sugestões para elegibilidade de descontos
 */
export class DiscountEligibilityService {
  
  /**
   * Valida uma lista de descontos contra uma categoria de CEP
   */
  static validateDiscounts(
    selectedDiscounts: string[],
    eligibleDiscounts: EligibleDiscount[],
    cepCategory: CepCategory | null
  ): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      invalidDiscounts: [],
      removedDiscounts: [],
      suggestions: new Map(),
      messages: []
    };

    if (!cepCategory || !eligibleDiscounts.length) {
      return result;
    }

    // Criar mapa de elegibilidade para busca rápida
    const eligibilityMap = new Map<string, EligibleDiscount>();
    eligibleDiscounts.forEach(d => eligibilityMap.set(d.codigo, d));

    // Validar cada desconto selecionado
    selectedDiscounts.forEach(discountCode => {
      const discountInfo = eligibilityMap.get(discountCode);
      
      if (!discountInfo) {
        // Desconto não encontrado na lista
        result.invalidDiscounts.push(discountCode);
        result.messages.push(`Desconto ${discountCode} não encontrado`);
        result.isValid = false;
      } else if (!discountInfo.elegivel) {
        // Desconto não elegível para esta categoria
        result.invalidDiscounts.push(discountCode);
        result.removedDiscounts.push(discountCode);
        
        if (discountInfo.motivo_restricao) {
          result.messages.push(
            `${discountInfo.descricao}: ${discountInfo.motivo_restricao}`
          );
        }
        
        // Adicionar sugestões se houver
        const suggestions = this.getSuggestionsForDiscount(
          discountInfo,
          eligibleDiscounts
        );
        if (suggestions.length > 0) {
          result.suggestions.set(discountCode, suggestions);
        }
        
        result.isValid = false;
      }
    });

    return result;
  }

  /**
   * Obtém sugestões de descontos alternativos
   */
  static getSuggestionsForDiscount(
    ineligibleDiscount: EligibleDiscount,
    allDiscounts: EligibleDiscount[]
  ): string[] {
    const suggestions: string[] = [];
    
    // Buscar descontos da mesma categoria que sejam elegíveis
    const alternativeDiscounts = allDiscounts.filter(d => 
      d.elegivel && 
      d.categoria === ineligibleDiscount.categoria &&
      d.codigo !== ineligibleDiscount.codigo
    );

    // Pegar até 3 sugestões
    alternativeDiscounts.slice(0, 3).forEach(d => {
      suggestions.push(`${d.descricao} (${d.percentual_fixo || 'Variável'}%)`);
    });

    return suggestions;
  }

  /**
   * Filtra descontos para mostrar apenas os elegíveis
   */
  static filterEligibleDiscounts(
    allDiscounts: TipoDesconto[],
    eligibleDiscounts: EligibleDiscount[]
  ): TipoDesconto[] {
    const eligibleCodes = new Set(
      eligibleDiscounts.filter(d => d.elegivel).map(d => d.codigo)
    );

    return allDiscounts.filter(d => eligibleCodes.has(d.codigo));
  }

  /**
   * Obtém mensagem descritiva para categoria de CEP
   */
  static getCategoryMessage(category: CepCategory): string {
    switch (category) {
      case 'alta':
        return 'Residência em bairro de maior renda em Poços de Caldas';
      case 'baixa':
        return 'Residência em bairro de menor renda em Poços de Caldas';
      case 'fora':
        return 'Residência fora de Poços de Caldas';
      default:
        return 'Categoria de CEP não identificada';
    }
  }

  /**
   * Obtém descontos automáticos para uma categoria
   */
  static getAutomaticDiscounts(category: CepCategory): string[] {
    switch (category) {
      case 'baixa':
        return ['CEP5']; // 5% automático para menor renda
      case 'fora':
        return ['CEP10']; // 10% automático para fora de Poços
      case 'alta':
      default:
        return []; // Sem descontos automáticos para maior renda
    }
  }

  /**
   * Verifica se um desconto é automático para uma categoria
   */
  static isAutomaticDiscount(discountCode: string, category: CepCategory): boolean {
    const automaticDiscounts = this.getAutomaticDiscounts(category);
    return automaticDiscounts.includes(discountCode);
  }

  /**
   * Obtém lista de descontos incompatíveis ao mudar de categoria
   */
  static getIncompatibleDiscountsOnCategoryChange(
    currentDiscounts: string[],
    oldCategory: CepCategory | null,
    newCategory: CepCategory | null,
    eligibleDiscountsNew: EligibleDiscount[]
  ): string[] {
    if (!newCategory || !currentDiscounts.length) {
      return [];
    }

    const eligibilityMap = new Map<string, boolean>();
    eligibleDiscountsNew.forEach(d => eligibilityMap.set(d.codigo, d.elegivel));

    return currentDiscounts.filter(code => !eligibilityMap.get(code));
  }

  /**
   * Gera relatório de elegibilidade para debug/admin
   */
  static generateEligibilityReport(
    cepCategory: CepCategory,
    eligibleDiscounts: EligibleDiscount[]
  ): {
    category: string;
    totalDiscounts: number;
    eligible: number;
    ineligible: number;
    automaticDiscounts: string[];
    eligibleList: string[];
    ineligibleList: Array<{ code: string; reason: string }>;
  } {
    const eligible = eligibleDiscounts.filter(d => d.elegivel);
    const ineligible = eligibleDiscounts.filter(d => !d.elegivel);

    return {
      category: this.getCategoryMessage(cepCategory),
      totalDiscounts: eligibleDiscounts.length,
      eligible: eligible.length,
      ineligible: ineligible.length,
      automaticDiscounts: this.getAutomaticDiscounts(cepCategory),
      eligibleList: eligible.map(d => `${d.codigo} - ${d.descricao}`),
      ineligibleList: ineligible.map(d => ({
        code: d.codigo,
        reason: d.motivo_restricao || 'Sem motivo especificado'
      }))
    };
  }

  /**
   * Calcula o impacto da mudança de categoria no total de descontos
   */
  static calculateCategoryChangeImpact(
    currentDiscounts: Array<{ codigo: string; percentual: number }>,
    oldCategory: CepCategory | null,
    newCategory: CepCategory | null
  ): {
    totalBefore: number;
    totalAfter: number;
    difference: number;
    removedDiscounts: string[];
    addedAutomaticDiscounts: string[];
  } {
    const oldAutomatic = oldCategory ? this.getAutomaticDiscounts(oldCategory) : [];
    const newAutomatic = newCategory ? this.getAutomaticDiscounts(newCategory) : [];

    // Calcular total antes
    let totalBefore = 0;
    currentDiscounts.forEach(d => {
      totalBefore += d.percentual;
    });

    // Adicionar desconto automático antigo se existir
    if (oldCategory === 'baixa') totalBefore += 5;
    if (oldCategory === 'fora') totalBefore += 10;

    // Calcular total depois (assumindo que incompatíveis serão removidos)
    let totalAfter = 0;
    const removedDiscounts: string[] = [];
    
    // Este é um cálculo simplificado - idealmente deveria verificar elegibilidade
    currentDiscounts.forEach(d => {
      // Verificar se o desconto seria removido
      if (
        (d.codigo === 'CEP5' && newCategory !== 'baixa') ||
        (d.codigo === 'CEP10' && newCategory !== 'fora') ||
        (d.codigo === 'RES' && newCategory !== 'fora') ||
        ((d.codigo === 'ABI' || d.codigo === 'ABP') && newCategory === 'fora')
      ) {
        removedDiscounts.push(d.codigo);
      } else {
        totalAfter += d.percentual;
      }
    });

    // Adicionar novo desconto automático
    if (newCategory === 'baixa') totalAfter += 5;
    if (newCategory === 'fora') totalAfter += 10;

    return {
      totalBefore,
      totalAfter,
      difference: totalAfter - totalBefore,
      removedDiscounts,
      addedAutomaticDiscounts: newAutomatic
    };
  }
}