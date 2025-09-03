/**
 * SERVIÇO HÍBRIDO DE ELEGIBILIDADE
 * 
 * Prioridade:
 * 1. Regras do Painel Administrativo (banco de dados) 
 * 2. Fallback para regras frontend estáticas
 * 
 * Isso garante que as configurações do admin sempre tenham precedência
 */

import { supabase } from '@/lib/supabase';
import { FrontendEligibilityService, type EligibilityValidationResult } from './frontendEligibilityService';
import { type CepCategory } from '../utils/cepClassifier';

export interface HybridEligibilityResult {
  isUsingDatabaseRules: boolean;
  source: 'database' | 'frontend';
  eligible: any[];
  blocked: any[];
  automatic: string[];
  stats: {
    total: number;
    eligible: number;
    blocked: number;
    automatic: number;
  };
}

export class HybridEligibilityService {
  
  /**
   * Classificar CEP usando dados dinâmicos ou fallback
   */
  static async classifyCepWithDatabase(cep: string | undefined): Promise<{
    categoria: CepCategory | null;
    source: 'database' | 'frontend';
    description: string;
  }> {
    // 1. Tentar classificação via banco de dados primeiro
    if (cep) {
      try {
        const cleanCep = cep.replace(/\D/g, '');
        if (cleanCep.length === 8) {
          console.log('🔍 Tentando classificação via banco de dados...');
          
          const { data, error } = await supabase.rpc('classify_cep', { 
            input_cep: cleanCep 
          });
          
          if (!error && data?.[0]?.categoria) {
            const result = data[0];
            console.log('✅ Classificação via banco:', result);
            
            return {
              categoria: result.categoria as CepCategory,
              source: 'database',
              description: result.descricao || `Categoria ${result.categoria} (Banco de Dados)`
            };
          }
        }
      } catch (error) {
        console.warn('⚠️ Erro na classificação via banco, usando fallback:', error);
      }
    }
    
    // 2. Fallback: usar classificação frontend
    console.log('📱 Usando classificação frontend como fallback');
    const categoria = FrontendEligibilityService.classifyCep(cep);
    const info = FrontendEligibilityService.getCepInfo(cep);
    
    return {
      categoria,
      source: 'frontend',
      description: info.classification.descricao + ' (Regras Locais)'
    };
  }
  
  /**
   * Obter descontos com elegibilidade priorizando regras do admin
   */
  static async getDiscountsWithEligibility(
    cep: string | undefined,
    allDiscounts: any[]
  ): Promise<HybridEligibilityResult> {
    
    // 1. Classificar CEP
    const { categoria, source: cepSource } = await this.classifyCepWithDatabase(cep);
    
    if (!categoria) {
      // Sem categoria: todos elegíveis
      return {
        isUsingDatabaseRules: false,
        source: 'frontend',
        eligible: allDiscounts,
        blocked: [],
        automatic: [],
        stats: {
          total: allDiscounts.length,
          eligible: allDiscounts.length,
          blocked: 0,
          automatic: 0
        }
      };
    }
    
    // 2. Tentar usar regras do banco de dados
    try {
      console.log('🎯 Tentando usar regras de elegibilidade do banco de dados...');
      
      const { data: eligibilityData, error } = await supabase.rpc('get_eligible_discounts', {
        p_categoria_cep: categoria
      });
      
      if (!error && eligibilityData && eligibilityData.length > 0) {
        console.log('✅ Usando regras do painel administrativo');
        
        const eligible = eligibilityData.filter(d => d.elegivel);
        const blocked = eligibilityData.filter(d => !d.elegivel);
        
        // Obter descontos automáticos do banco se disponível
        let automatic: string[] = [];
        try {
          const { data: autoData } = await supabase
            .from('cep_desconto_elegibilidade')
            .select('tipo_desconto_codigo')
            .eq('categoria_cep', categoria)
            .eq('elegivel', true)
            .eq('automatico', true);
          
          automatic = autoData?.map(d => d.tipo_desconto_codigo) || [];
        } catch (autoError) {
          console.warn('⚠️ Erro ao buscar descontos automáticos do banco:', autoError);
        }
        
        return {
          isUsingDatabaseRules: true,
          source: 'database',
          eligible,
          blocked,
          automatic,
          stats: {
            total: eligibilityData.length,
            eligible: eligible.length,
            blocked: blocked.length,
            automatic: automatic.length
          }
        };
      }
    } catch (dbError) {
      console.warn('⚠️ Erro ao buscar regras do banco, usando fallback frontend:', dbError);
    }
    
    // 3. Fallback: usar regras frontend
    console.log('📱 Usando regras frontend como fallback');
    
    const eligibleDiscounts = FrontendEligibilityService.getEligibleDiscounts(cep, allDiscounts);
    const enrichedDiscounts = FrontendEligibilityService.enrichDiscountsWithEligibility(cep, allDiscounts);
    const stats = FrontendEligibilityService.getEligibilityStats(cep, allDiscounts.map(d => d.codigo));
    const automatic = FrontendEligibilityService.getAutomaticDiscounts(cep);
    
    const blocked = enrichedDiscounts.filter(d => !d.elegivel);
    
    return {
      isUsingDatabaseRules: false,
      source: 'frontend',
      eligible: eligibleDiscounts,
      blocked,
      automatic,
      stats
    };
  }
  
  /**
   * Validar se um desconto específico é elegível
   */
  static async isDiscountEligible(
    cep: string | undefined, 
    discountCode: string
  ): Promise<{
    elegivel: boolean;
    motivo: string | null;
    source: 'database' | 'frontend';
  }> {
    
    const { categoria } = await this.classifyCepWithDatabase(cep);
    
    if (!categoria) {
      return { elegivel: true, motivo: null, source: 'frontend' };
    }
    
    // 1. Tentar validação via banco
    try {
      const { data, error } = await supabase.rpc('check_discount_eligibility', {
        p_categoria_cep: categoria,
        p_tipo_desconto_codigo: discountCode
      });
      
      if (!error && data?.[0]) {
        const result = data[0];
        return {
          elegivel: result.elegivel,
          motivo: result.motivo_restricao,
          source: 'database'
        };
      }
    } catch (dbError) {
      console.warn('⚠️ Erro na validação via banco:', dbError);
    }
    
    // 2. Fallback: validação frontend
    const elegivel = FrontendEligibilityService.isDiscountEligible(cep, discountCode);
    const motivo = elegivel ? null : FrontendEligibilityService.getRestrictionReason(categoria, discountCode);
    
    return {
      elegivel,
      motivo,
      source: 'frontend'
    };
  }
  
  /**
   * Validar múltiplos descontos selecionados
   */
  static async validateSelectedDiscounts(
    cep: string | undefined,
    selectedDiscountCodes: string[],
    allDiscounts: any[]
  ): Promise<EligibilityValidationResult & { source: 'database' | 'frontend' }> {
    
    const { categoria } = await this.classifyCepWithDatabase(cep);
    
    if (!categoria) {
      return {
        isValid: true,
        categoria: null,
        invalidDiscounts: [],
        removedDiscounts: [],
        automaticDiscounts: [],
        messages: [],
        suggestions: {},
        source: 'frontend'
      };
    }
    
    // 1. Tentar validação via banco
    try {
      const validationPromises = selectedDiscountCodes.map(async (code) => {
        const { data, error } = await supabase.rpc('check_discount_eligibility', {
          p_categoria_cep: categoria,
          p_tipo_desconto_codigo: code
        });
        
        if (!error && data?.[0]) {
          return { code, result: data[0] };
        }
        return null;
      });
      
      const results = await Promise.all(validationPromises);
      const validResults = results.filter(r => r !== null);
      
      if (validResults.length === selectedDiscountCodes.length) {
        console.log('✅ Validação via banco de dados');
        
        const invalid = validResults.filter(r => !r?.result.elegivel).map(r => r!.code);
        const valid = validResults.filter(r => r?.result.elegivel).map(r => r!.code);
        
        // Obter descontos automáticos
        let automatic: string[] = [];
        try {
          const { data: autoData } = await supabase
            .from('cep_desconto_elegibilidade')
            .select('tipo_desconto_codigo')
            .eq('categoria_cep', categoria)
            .eq('elegivel', true)
            .eq('automatico', true);
          
          automatic = autoData?.map(d => d.tipo_desconto_codigo) || [];
        } catch {
          // Ignorar erro
        }
        
        const messages: string[] = [];
        const suggestions: Record<string, string[]> = {};
        
        // Gerar mensagens para inválidos
        invalid.forEach(code => {
          const result = validResults.find(r => r?.code === code)?.result;
          if (result?.motivo_restricao) {
            messages.push(`${code}: ${result.motivo_restricao}`);
          }
          
          if (result?.sugestoes && result.sugestoes.length > 0) {
            suggestions[code] = result.sugestoes;
          }
        });
        
        return {
          isValid: invalid.length === 0,
          categoria,
          invalidDiscounts: invalid,
          removedDiscounts: invalid,
          automaticDiscounts: automatic,
          messages,
          suggestions,
          source: 'database'
        };
      }
    } catch (dbError) {
      console.warn('⚠️ Erro na validação via banco:', dbError);
    }
    
    // 2. Fallback: validação frontend
    console.log('📱 Validação via frontend');
    
    const frontendResult = FrontendEligibilityService.validateDiscounts(cep, selectedDiscountCodes, allDiscounts);
    
    return {
      ...frontendResult,
      source: 'frontend'
    };
  }
  
  /**
   * Obter informações de debug sobre qual sistema está sendo usado
   */
  static async getSystemStatus(cep: string | undefined): Promise<{
    cepClassification: { categoria: CepCategory | null; source: string; description: string };
    eligibilitySystem: { available: boolean; source: string };
    recommendations: string[];
  }> {
    
    const cepInfo = await this.classifyCepWithDatabase(cep);
    
    // Testar se sistema de elegibilidade do banco está disponível
    let eligibilitySystemAvailable = false;
    try {
      if (cepInfo.categoria) {
        const { data, error } = await supabase.rpc('get_eligible_discounts', {
          p_categoria_cep: cepInfo.categoria
        });
        eligibilitySystemAvailable = !error && data && data.length > 0;
      }
    } catch {
      eligibilitySystemAvailable = false;
    }
    
    const recommendations: string[] = [];
    
    if (cepInfo.source === 'frontend') {
      recommendations.push('⚠️ Usando classificação CEP local. Configure faixas no Painel Admin para maior precisão.');
    }
    
    if (!eligibilitySystemAvailable) {
      recommendations.push('⚠️ Sistema de elegibilidade não configurado. Configure regras no Painel Admin.');
    }
    
    if (eligibilitySystemAvailable && cepInfo.source === 'database') {
      recommendations.push('✅ Sistema totalmente sincronizado com o Painel Administrativo.');
    }
    
    return {
      cepClassification: cepInfo,
      eligibilitySystem: {
        available: eligibilitySystemAvailable,
        source: eligibilitySystemAvailable ? 'database' : 'frontend'
      },
      recommendations
    };
  }
}