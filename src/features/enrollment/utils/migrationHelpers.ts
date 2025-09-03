/**
 * Utilitários para migração do sistema antigo para o novo baseado em IDs
 * 
 * Este arquivo contém funções para migrar dados de desconto do formato antigo
 * (objetos completos) para o novo formato (apenas IDs).
 */

import type { Desconto } from "../types";

/**
 * Migra descontos do formato antigo (objetos) para novo (IDs)
 * 
 * @param descontosAntigos - Array de objetos de desconto do sistema antigo
 * @returns Array de IDs de desconto para o novo sistema
 */
export function migrateDescontosToIds(descontosAntigos: Partial<Desconto>[]): string[] {
  if (!descontosAntigos || !Array.isArray(descontosAntigos)) {
    return [];
  }

  return descontosAntigos
    .filter(desconto => desconto.id || desconto.tipo_desconto_id)
    .map(desconto => {
      // Priorizar ID próprio, depois tipo_desconto_id
      return desconto.id || desconto.tipo_desconto_id || '';
    })
    .filter(id => id !== ''); // Remover IDs vazios
}

/**
 * Migra trilho do formato antigo para novo
 * 
 * @param trilhoAntigo - Trilho no formato antigo (especial, combinado, normal)
 * @returns ID do trilho no novo sistema (A, B, C)
 */
export function migrateTrilhoToId(trilhoAntigo?: string | null): string | null {
  if (!trilhoAntigo) return null;

  const trilhoMap: Record<string, string> = {
    'especial': 'A',
    'combinado': 'B', 
    'normal': 'C',
    // Mapeamento reverso também
    'A': 'A',
    'B': 'B',
    'C': 'C',
  };

  return trilhoMap[trilhoAntigo.toLowerCase()] || null;
}

/**
 * Extrai valor base do sistema antigo
 * 
 * @param matricula - Dados da matrícula do sistema antigo
 * @returns Valor base para cálculos
 */
export function extractValorBase(matricula?: any): number {
  if (!matricula) return 0;

  // Tentar diferentes propriedades onde o valor pode estar
  const possiblePaths = [
    'serie_dados.valor_mensal_sem_material',
    'valor_mensalidade_base',
    'valor_base',
    'serie_dados.valor_base'
  ];

  for (const path of possiblePaths) {
    const value = getNestedValue(matricula, path);
    const numericValue = Number(value);
    
    if (numericValue > 0) {
      return numericValue;
    }
  }

  return 0;
}

/**
 * Função auxiliar para acessar propriedades aninhadas
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
}

/**
 * Migra estado completo do sistema antigo para o novo
 * 
 * @param estadoAntigo - Estado do EnrollmentContext no formato antigo
 * @returns Estado migrado para o novo formato
 */
export function migrateFullState(estadoAntigo: any) {
  const selectedDiscountIds = migrateDescontosToIds(estadoAntigo.descontos || []);
  const selectedTrackId = migrateTrilhoToId(estadoAntigo.trilhos?.trilho_escolhido);
  const valorBase = extractValorBase(estadoAntigo.matricula);

  return {
    ...estadoAntigo,
    selectedDiscountIds,
    selectedTrackId,
    valorBase,
    // Manter dados antigos para compatibilidade durante a transição
    descontos: estadoAntigo.descontos || [],
    trilhos: {
      ...(estadoAntigo.trilhos || {}),
      trilho_escolhido: selectedTrackId,
    },
  };
}

/**
 * Valida se os dados migrados estão consistentes
 * 
 * @param estadoMigrado - Estado após migração
 * @returns Objeto com status de validação e possíveis problemas
 */
export function validateMigratedState(estadoMigrado: any): {
  isValid: boolean;
  warnings: string[];
  errors: string[];
} {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Validar IDs de desconto
  if (estadoMigrado.selectedDiscountIds?.length > 0) {
    const invalidIds = estadoMigrado.selectedDiscountIds.filter((id: string) => !id || id === '');
    if (invalidIds.length > 0) {
      warnings.push(`${invalidIds.length} IDs de desconto inválidos foram removidos`);
    }
  }

  // Validar consistência entre sistema antigo e novo
  if (estadoMigrado.descontos?.length !== estadoMigrado.selectedDiscountIds?.length) {
    warnings.push('Quantidade de descontos entre sistema antigo e novo diferem');
  }

  // Validar trilho
  if (estadoMigrado.trilhos?.trilho_escolhido && !estadoMigrado.selectedTrackId) {
    errors.push('Falha ao migrar trilho selecionado');
  }

  // Validar valor base
  if (estadoMigrado.valorBase <= 0 && estadoMigrado.matricula?.serie_dados) {
    warnings.push('Valor base não pôde ser extraído dos dados da matrícula');
  }

  return {
    isValid: errors.length === 0,
    warnings,
    errors,
  };
}

/**
 * Converte dados do localStorage do formato antigo para novo
 * 
 * @param localStorageKey - Chave do localStorage
 * @returns Dados migrados ou null se não existir
 */
export function migrateLocalStorageData(localStorageKey: string) {
  try {
    const rawData = localStorage.getItem(localStorageKey);
    if (!rawData) return null;

    const parsedData = JSON.parse(rawData);
    const migratedData = migrateFullState(parsedData);
    
    // Salvar dados migrados com nova chave
    const newKey = `${localStorageKey}_v2`;
    localStorage.setItem(newKey, JSON.stringify(migratedData));
    
    // Log da migração para debug
    console.log(`✅ Migração LocalStorage: ${localStorageKey} → ${newKey}`, {
      antigo: parsedData,
      migrado: migratedData,
    });

    return migratedData;
  } catch (error) {
    console.error(`❌ Erro na migração LocalStorage ${localStorageKey}:`, error);
    return null;
  }
}

/**
 * Função para migrar dados de rascunhos locais
 */
export function migrateDraftData() {
  const draftKeys = ['nova-matricula', 'rematricula-draft', 'enrollment-draft'];
  
  draftKeys.forEach(key => {
    migrateLocalStorageData(key);
  });
}

/**
 * Hook personalizado para usar dados migrados
 * 
 * Esta função pode ser chamada em componentes que precisam
 * migrar dados automaticamente na inicialização
 */
export function useMigrationHelper() {
  const checkAndMigrate = (data: any) => {
    // Verificar se os dados precisam de migração
    const needsMigration = (
      data.descontos && data.descontos.length > 0 && 
      (!data.selectedDiscountIds || data.selectedDiscountIds.length === 0)
    );

    if (needsMigration) {
      console.log('🔄 Migrando dados automaticamente...');
      const migratedData = migrateFullState(data);
      const validation = validateMigratedState(migratedData);
      
      if (validation.warnings.length > 0) {
        console.warn('⚠️ Avisos na migração:', validation.warnings);
      }
      
      if (validation.errors.length > 0) {
        console.error('❌ Erros na migração:', validation.errors);
      }
      
      return migratedData;
    }

    return data;
  };

  return { checkAndMigrate };
}

/**
 * Função para verificar se um estado está no formato antigo
 */
export function isLegacyState(state: any): boolean {
  return !!(
    state.descontos && 
    state.descontos.length > 0 && 
    !state.selectedDiscountIds
  );
}

/**
 * Função para verificar se um estado está no novo formato
 */
export function isNewFormatState(state: any): boolean {
  return !!(
    state.selectedDiscountIds !== undefined && 
    state.selectedTrackId !== undefined && 
    state.valorBase !== undefined
  );
}

/**
 * Log de informações sobre o estado de migração
 */
export function logMigrationStatus(state: any) {
  const isLegacy = isLegacyState(state);
  const isNew = isNewFormatState(state);
  
  console.log('📊 Status da Migração:', {
    isLegacyFormat: isLegacy,
    isNewFormat: isNew,
    hasDescontos: !!(state.descontos?.length),
    hasSelectedDiscountIds: !!(state.selectedDiscountIds?.length),
    selectedTrackId: state.selectedTrackId,
    valorBase: state.valorBase,
  });
}