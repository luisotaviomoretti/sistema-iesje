/**
 * CLASSIFICADOR DE CEP - FRONTEND PURO
 * Sistema autônomo de classificação sem dependência de banco
 */

export type CepCategory = 'alta' | 'baixa' | 'fora';

export interface CepClassificationResult {
  categoria: CepCategory | null;
  percentual_desconto: number;
  descricao: string;
  codigo_desconto: string | null;
  debug_info?: {
    cep_original: string;
    cep_limpo: string;
    faixa_encontrada?: string;
  };
}

// 🗺️ FAIXAS DE CEP DE POÇOS DE CALDAS
const CEP_RANGES = {
  // 🏙️ CENTRO E BAIRROS DE MAIOR RENDA
  alta: [
    { inicio: 37701000, fim: 37701999, desc: 'Centro' },
    { inicio: 37702000, fim: 37702499, desc: 'Jardim dos Estados' },
    { inicio: 37702500, fim: 37702999, desc: 'Country Club' },
    { inicio: 37703000, fim: 37703499, desc: 'Vila Cruz' },
    { inicio: 37709000, fim: 37719999, desc: 'Outros bairros centrais' },
  ],
  
  // 🏘️ BAIRROS DE MENOR RENDA
  baixa: [
    { inicio: 37704000, fim: 37704999, desc: 'Região Sul' },
    { inicio: 37705000, fim: 37705999, desc: 'São José' },
    { inicio: 37706000, fim: 37706999, desc: 'Vila Nova' },
    { inicio: 37707000, fim: 37707999, desc: 'Kennedy' },
    { inicio: 37708000, fim: 37708999, desc: 'Zona Leste' },
  ]
  
  // 🌍 FORA: Qualquer CEP que não esteja nas faixas acima
};

/**
 * Classifica um CEP em categoria de renda
 */
export function classifyCep(cep: string | undefined): CepClassificationResult {
  const debug_info = {
    cep_original: cep || '',
    cep_limpo: '',
  };

  // Validação básica
  if (!cep) {
    return {
      categoria: null,
      percentual_desconto: 0,
      descricao: 'CEP não informado',
      codigo_desconto: null,
      debug_info,
    };
  }

  // Limpar CEP
  const cepLimpo = cep.replace(/\D/g, '');
  debug_info.cep_limpo = cepLimpo;
  
  if (cepLimpo.length !== 8) {
    return {
      categoria: null,
      percentual_desconto: 0,
      descricao: 'CEP deve ter 8 dígitos',
      codigo_desconto: null,
      debug_info,
    };
  }

  const cepNumerico = parseInt(cepLimpo);

  // 🔍 VERIFICAR FAIXAS DE ALTA RENDA
  for (const faixa of CEP_RANGES.alta) {
    if (cepNumerico >= faixa.inicio && cepNumerico <= faixa.fim) {
      debug_info.faixa_encontrada = `Alta: ${faixa.desc}`;
      return {
        categoria: 'alta',
        percentual_desconto: 0,
        descricao: `${faixa.desc} - Poços de Caldas (Maior Renda)`,
        codigo_desconto: null, // Sem desconto automático
        debug_info,
      };
    }
  }

  // 🔍 VERIFICAR FAIXAS DE BAIXA RENDA
  for (const faixa of CEP_RANGES.baixa) {
    if (cepNumerico >= faixa.inicio && cepNumerico <= faixa.fim) {
      debug_info.faixa_encontrada = `Baixa: ${faixa.desc}`;
      return {
        categoria: 'baixa',
        percentual_desconto: 5,
        descricao: `${faixa.desc} - Poços de Caldas (Menor Renda) - Desconto CEP5`,
        codigo_desconto: 'CEP5',
        debug_info,
      };
    }
  }

  // 🌍 FORA DE POÇOS DE CALDAS
  debug_info.faixa_encontrada = 'Fora de Poços de Caldas';
  return {
    categoria: 'fora',
    percentual_desconto: 10,
    descricao: 'Fora de Poços de Caldas - Desconto RES + CEP10',
    codigo_desconto: 'CEP10',
    debug_info,
  };
}

/**
 * Verifica se um CEP é de Poços de Caldas
 */
export function isPocosDeCaldasCep(cep: string | undefined): boolean {
  if (!cep) return false;
  
  const resultado = classifyCep(cep);
  return resultado.categoria === 'alta' || resultado.categoria === 'baixa';
}

/**
 * Obter descrição curta da categoria
 */
export function getCategoryShortDescription(categoria: CepCategory | null): string {
  switch (categoria) {
    case 'alta':
      return 'Alta Renda';
    case 'baixa':
      return 'Baixa Renda';
    case 'fora':
      return 'Fora de Poços';
    default:
      return 'Não Classificado';
  }
}

/**
 * Obter cor da categoria para UI
 */
export function getCategoryColor(categoria: CepCategory | null): string {
  switch (categoria) {
    case 'alta':
      return 'blue';
    case 'baixa':
      return 'green';
    case 'fora':
      return 'orange';
    default:
      return 'gray';
  }
}

/**
 * Log detalhado da classificação para debug
 */
export function logCepClassification(cep: string | undefined): CepClassificationResult {
  const resultado = classifyCep(cep);
  
  console.group(`🏠 Classificação CEP: ${cep}`);
  console.log('📊 Resultado:', resultado);
  console.log('🎯 Categoria:', resultado.categoria);
  console.log('💰 Desconto:', resultado.percentual_desconto + '%');
  console.log('🏷️ Código:', resultado.codigo_desconto);
  console.log('🔍 Debug:', resultado.debug_info);
  console.groupEnd();
  
  return resultado;
}