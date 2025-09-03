import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { TipoDesconto } from '@/features/admin/hooks/useDiscountTypes';

export type CepCategory = 'alta' | 'baixa' | 'fora';

export interface EligibleDiscount extends TipoDesconto {
  elegivel: boolean;
  motivo_restricao: string | null;
}

interface EligibilityCheck {
  elegivel: boolean;
  motivo_restricao: string | null;
  sugestoes: string[];
}

export function useEligibleDiscounts(cepCategory: CepCategory | null) {
  return useQuery<EligibleDiscount[]>({
    queryKey: ['eligible-discounts', cepCategory],
    queryFn: async () => {
      console.log('🔍 useEligibleDiscounts - Categoria CEP:', cepCategory);
      
      if (!cepCategory) {
        console.log('⚠️ Sem categoria CEP - retornando todos os descontos como elegíveis');
        // Se não há categoria, retornar todos os descontos como elegíveis
        const { data: discounts, error } = await supabase
          .from('tipos_desconto')
          .select('*')
          .eq('ativo', true)
          .order('categoria')
          .order('codigo');

        if (error) {
          console.error('❌ Erro ao buscar tipos_desconto:', error);
          throw error;
        }
        
        console.log(`✅ Retornando ${discounts?.length || 0} descontos (todos elegíveis por padrão)`);
        return discounts.map(d => ({ ...d, elegivel: true, motivo_restricao: null }));
      }

      // Chamar função RPC para obter descontos com elegibilidade
      console.log('📡 Chamando RPC get_eligible_discounts com categoria:', cepCategory);
      const { data, error } = await supabase.rpc('get_eligible_discounts', {
        p_categoria_cep: cepCategory
      });

      if (error) {
        console.error('❌ Erro ao chamar get_eligible_discounts:', error);
        throw error;
      }
      
      const eligible = data?.filter(d => d.elegivel) || [];
      const ineligible = data?.filter(d => !d.elegivel) || [];
      
      console.log(`✅ Retorno da RPC - Total: ${data?.length || 0}, Elegíveis: ${eligible.length}, Bloqueados: ${ineligible.length}`);
      console.log('📊 Descontos elegíveis:', eligible.map(d => d.codigo));
      console.log('🚫 Descontos bloqueados:', ineligible.map(d => ({ codigo: d.codigo, motivo: d.motivo_restricao })));
      
      return data || [];
    },
    enabled: true,
    staleTime: 5 * 60 * 1000, // 5 minutos
    cacheTime: 10 * 60 * 1000, // 10 minutos
  });
}

export function useDiscountCompatibility(
  discountCode: string | null,
  cepCategory: CepCategory | null
) {
  return useQuery<EligibilityCheck>({
    queryKey: ['discount-compatibility', discountCode, cepCategory],
    queryFn: async () => {
      if (!discountCode || !cepCategory) {
        return { elegivel: true, motivo_restricao: null, sugestoes: [] };
      }

      const { data, error } = await supabase.rpc('check_discount_eligibility', {
        p_categoria_cep: cepCategory,
        p_tipo_desconto_codigo: discountCode
      });

      if (error) throw error;
      
      // A função retorna um array, pegamos o primeiro item
      return data?.[0] || { elegivel: true, motivo_restricao: null, sugestoes: [] };
    },
    enabled: !!discountCode && !!cepCategory,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
  });
}

// Hook para obter apenas descontos elegíveis (filtrados)
export function useFilteredEligibleDiscounts(cepCategory: CepCategory | null) {
  const { data: allDiscounts, ...queryResult } = useEligibleDiscounts(cepCategory);
  
  const eligibleDiscounts = allDiscounts?.filter(d => d.elegivel) || [];
  const ineligibleDiscounts = allDiscounts?.filter(d => !d.elegivel) || [];
  
  return {
    ...queryResult,
    data: allDiscounts,
    eligibleDiscounts,
    ineligibleDiscounts,
    totalDiscounts: allDiscounts?.length || 0,
    eligibleCount: eligibleDiscounts.length,
    ineligibleCount: ineligibleDiscounts.length,
  };
}

// Hook para validar múltiplos descontos de uma vez
export function useValidateDiscounts(
  discountCodes: string[],
  cepCategory: CepCategory | null
) {
  return useQuery<Map<string, EligibilityCheck>>({
    queryKey: ['validate-discounts', discountCodes, cepCategory],
    queryFn: async () => {
      if (!cepCategory || discountCodes.length === 0) {
        return new Map();
      }

      const results = new Map<string, EligibilityCheck>();
      
      // Fazer validações em paralelo
      const promises = discountCodes.map(async (code) => {
        const { data, error } = await supabase.rpc('check_discount_eligibility', {
          p_categoria_cep: cepCategory,
          p_tipo_desconto_codigo: code
        });
        
        if (!error && data?.[0]) {
          results.set(code, data[0]);
        } else {
          results.set(code, { elegivel: true, motivo_restricao: null, sugestoes: [] });
        }
      });
      
      await Promise.all(promises);
      return results;
    },
    enabled: discountCodes.length > 0 && !!cepCategory,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
  });
}