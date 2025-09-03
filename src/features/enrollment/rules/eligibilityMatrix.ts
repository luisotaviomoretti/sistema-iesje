/**
 * MATRIZ DE ELEGIBILIDADE - FRONTEND
 * Define quais descontos são permitidos por categoria de CEP
 */

import type { CepCategory } from '../utils/cepClassifier';

export interface EligibilityRule {
  blocked: string[];           // Descontos bloqueados
  allowed: string[];          // Descontos explicitamente permitidos
  automatic: string[];        // Descontos aplicados automaticamente
  restrictions: Record<string, string>; // Motivos das restrições
}

// 📋 MATRIZ COMPLETA DE ELEGIBILIDADE
export const ELIGIBILITY_MATRIX: Record<CepCategory, EligibilityRule> = {
  
  // 🏙️ ALTA RENDA (Poços - Bairros Nobres)
  alta: {
    blocked: [
      'CEP5',   // Desconto específico para baixa renda
      'CEP10',  // Desconto específico para fora de Poços
      'RES',    // Desconto para outras cidades
      'ABI',    // Bolsa integral - critério social
      'ABP',    // Bolsa parcial - critério social
    ],
    allowed: [
      'IIR',       // Irmãos
      'PASS',      // Filhos de prof IESJE
      'PBS',       // Filhos de prof outras inst
      'COL',       // Filhos de func IESJE
      'SAE',       // Filhos de func outras inst
      'PAV',       // Pagamento à vista
      'ADIM2',     // Adimplência
      'COM_EXTRA', // Negociação comercial
    ],
    automatic: [], // Nenhum desconto automático
    restrictions: {
      'CEP5': 'Desconto CEP5 exclusivo para bairros de menor renda em Poços de Caldas',
      'CEP10': 'Desconto CEP10 exclusivo para residentes fora de Poços de Caldas',
      'RES': 'Desconto RES exclusivo para residentes de outras cidades',
      'ABI': 'Bolsa Integral reservada para famílias de menor renda (critério socioeconômico)',
      'ABP': 'Bolsa Parcial reservada para famílias de menor renda (critério socioeconômico)',
    },
  },

  // 🏘️ BAIXA RENDA (Poços - Bairros Populares)
  baixa: {
    blocked: [
      'CEP10',  // Desconto específico para fora de Poços
      'RES',    // Desconto para outras cidades
    ],
    allowed: [
      'CEP5',      // Desconto automático por localização
      'IIR',       // Irmãos
      'PASS',      // Filhos de prof IESJE
      'PBS',       // Filhos de prof outras inst
      'COL',       // Filhos de func IESJE
      'SAE',       // Filhos de func outras inst
      'ABI',       // Bolsa integral (elegível)
      'ABP',       // Bolsa parcial (elegível)
      'PAV',       // Pagamento à vista
      'ADIM2',     // Adimplência
      'COM_EXTRA', // Negociação comercial
    ],
    automatic: ['CEP5'], // CEP5 aplicado automaticamente
    restrictions: {
      'CEP10': 'Desconto CEP10 exclusivo para residentes fora de Poços de Caldas',
      'RES': 'Desconto RES exclusivo para residentes de outras cidades',
    },
  },

  // 🌍 FORA DE POÇOS DE CALDAS
  fora: {
    blocked: [
      'CEP5',  // Desconto específico para baixa renda de Poços
      'ABI',   // Bolsas restritas a residentes de Poços
      'ABP',   // Bolsas restritas a residentes de Poços
    ],
    allowed: [
      'CEP10',     // Desconto automático por localização
      'RES',       // Desconto para outras cidades
      'IIR',       // Irmãos (se estudam na instituição)
      'PASS',      // Filhos de prof IESJE (se trabalha no IESJE)
      'PBS',       // Filhos de prof outras inst
      'COL',       // Filhos de func IESJE (se trabalha no IESJE)
      'SAE',       // Filhos de func outras inst
      'PAV',       // Pagamento à vista
      'ADIM2',     // Adimplência
      'COM_EXTRA', // Negociação comercial
    ],
    automatic: ['CEP10'], // CEP10 aplicado automaticamente
    restrictions: {
      'CEP5': 'Desconto CEP5 exclusivo para bairros de menor renda em Poços de Caldas',
      'ABI': 'Bolsas filantrópicas são restritas a estudantes residentes em Poços de Caldas',
      'ABP': 'Bolsas filantrópicas são restritas a estudantes residentes em Poços de Caldas',
    },
  },
};

/**
 * Verificar se um desconto é elegível para uma categoria
 */
export function isDiscountEligible(categoria: CepCategory | null, discountCode: string): boolean {
  if (!categoria) return true; // Se não há categoria, permitir (sistema permissivo)
  
  const rules = ELIGIBILITY_MATRIX[categoria];
  return !rules.blocked.includes(discountCode);
}

/**
 * Obter descontos bloqueados para uma categoria
 */
export function getBlockedDiscounts(categoria: CepCategory | null): string[] {
  if (!categoria) return [];
  return ELIGIBILITY_MATRIX[categoria].blocked;
}

/**
 * Obter descontos automáticos para uma categoria
 */
export function getAutomaticDiscounts(categoria: CepCategory | null): string[] {
  if (!categoria) return [];
  return ELIGIBILITY_MATRIX[categoria].automatic;
}

/**
 * Obter motivo da restrição de um desconto
 */
export function getRestrictionReason(categoria: CepCategory | null, discountCode: string): string | null {
  if (!categoria) return null;
  return ELIGIBILITY_MATRIX[categoria].restrictions[discountCode] || null;
}

/**
 * Obter estatísticas de elegibilidade
 */
export function getEligibilityStats(categoria: CepCategory | null, allDiscounts: string[]) {
  if (!categoria) {
    return {
      total: allDiscounts.length,
      eligible: allDiscounts.length,
      blocked: 0,
      automatic: 0,
    };
  }

  const rules = ELIGIBILITY_MATRIX[categoria];
  const blocked = allDiscounts.filter(d => rules.blocked.includes(d));
  const eligible = allDiscounts.filter(d => !rules.blocked.includes(d));
  const automatic = rules.automatic.filter(d => allDiscounts.includes(d));

  return {
    total: allDiscounts.length,
    eligible: eligible.length,
    blocked: blocked.length,
    automatic: automatic.length,
  };
}

/**
 * Filtrar descontos elegíveis
 */
export function filterEligibleDiscounts<T extends { codigo: string }>(
  categoria: CepCategory | null,
  discounts: T[]
): T[] {
  if (!categoria) return discounts; // Sistema permissivo
  
  const rules = ELIGIBILITY_MATRIX[categoria];
  return discounts.filter(discount => !rules.blocked.includes(discount.codigo));
}

/**
 * Validar lista de descontos selecionados
 */
export function validateSelectedDiscounts(
  categoria: CepCategory | null,
  selectedCodes: string[]
): {
  valid: string[];
  invalid: string[];
  reasons: Record<string, string>;
} {
  const valid: string[] = [];
  const invalid: string[] = [];
  const reasons: Record<string, string> = {};

  selectedCodes.forEach(code => {
    if (isDiscountEligible(categoria, code)) {
      valid.push(code);
    } else {
      invalid.push(code);
      const reason = getRestrictionReason(categoria, code);
      if (reason) reasons[code] = reason;
    }
  });

  return { valid, invalid, reasons };
}

/**
 * Obter sugestões de descontos alternativos
 */
export function getAlternativeDiscounts<T extends { codigo: string; categoria: string }>(
  categoria: CepCategory | null,
  blockedCode: string,
  allDiscounts: T[]
): T[] {
  if (!categoria) return [];

  // Encontrar desconto bloqueado
  const blockedDiscount = allDiscounts.find(d => d.codigo === blockedCode);
  if (!blockedDiscount) return [];

  // Buscar alternativas na mesma categoria
  return filterEligibleDiscounts(categoria, allDiscounts)
    .filter(d => 
      d.categoria === blockedDiscount.categoria && 
      d.codigo !== blockedCode
    )
    .slice(0, 3); // Máximo 3 sugestões
}

/**
 * Debug completo da matriz para uma categoria
 */
export function debugEligibilityMatrix(categoria: CepCategory | null): void {
  if (!categoria) {
    console.log('🤷 Nenhuma categoria fornecida - sistema permissivo');
    return;
  }

  const rules = ELIGIBILITY_MATRIX[categoria];
  
  console.group(`📋 Matriz de Elegibilidade - ${categoria.toUpperCase()}`);
  console.log('✅ Permitidos:', rules.allowed);
  console.log('❌ Bloqueados:', rules.blocked);
  console.log('🤖 Automáticos:', rules.automatic);
  console.log('📝 Restrições:', rules.restrictions);
  console.groupEnd();
}