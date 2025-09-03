import React, { useMemo } from "react";
import type { Desconto } from "@/features/enrollment/types";
import { calculateTotals } from "@/features/enrollment/utils/discounts";
import { usePublicDiscountTypes } from "@/features/admin/hooks/useDiscountTypes";
import { useMaxDiscountLimit } from "@/features/admin/hooks/useEnrollmentConfig";
import { TIPOS_DESCONTO, MAX_DESCONTO_TOTAL } from "@/features/enrollment/constants";
import { useEnrollment } from "@/features/enrollment/context/EnrollmentContext";
import { Badge } from "@/components/ui/badge";

interface DiscountSummaryProps {
  baseMensal: number;
  descontos: Desconto[];
}

export const DiscountSummary: React.FC<DiscountSummaryProps> = ({ baseMensal, descontos }) => {
  // ============================================================================
  // NOVO SISTEMA: COMPONENTE PRESENTACIONAL + DADOS CENTRALIZADOS
  // ============================================================================
  const { 
    // Dados do novo sistema unificado
    calculatedTotals,
    trackData,
    discountsData,
    isLoading,
    calculationValid,
    
    // Dados antigos para compatibilidade
    trilhos 
  } = useEnrollment();
  
  // FALLBACK: Dados dinâmicos do admin (APENAS para sistema antigo)
  const { data: dynamicDiscountTypes } = usePublicDiscountTypes();
  const { data: maxDiscountLimit } = useMaxDiscountLimit();
  
  // FALLBACK: Sistema antigo (DEPRECATED)
  const discountTypes = useMemo(() => {
    return dynamicDiscountTypes?.length > 0 ? dynamicDiscountTypes : TIPOS_DESCONTO;
  }, [dynamicDiscountTypes]);
  
  const effectiveMaxDiscount = useMemo(() => {
    if (trilhos?.trilho_escolhido === 'A') return 100;
    else if (trilhos?.trilho_escolhido === 'B') return 25;
    return maxDiscountLimit ?? MAX_DESCONTO_TOTAL;
  }, [trilhos?.trilho_escolhido, maxDiscountLimit]);
  
  const fallbackSummary = useMemo(() => {
    return calculateTotals(baseMensal, descontos, discountTypes, effectiveMaxDiscount);
  }, [baseMensal, descontos, discountTypes, effectiveMaxDiscount]);
  
  // ============================================================================
  // RENDERIZAÇÃO DUAL: Novo sistema + Fallback
  // ============================================================================
  
  // Verificar se temos dados do novo sistema
  const hasNewSystemData = calculatedTotals && calculationValid;

  return (
    <div className="space-y-3">
      <div className="text-sm text-muted-foreground">
        Valor base: <span className="font-medium">R$ {baseMensal.toFixed(2)}</span>
      </div>
      
      {/* ============================================================================ */}
      {/* NOVO SISTEMA: Usar dados dos hooks centralizados */}
      {/* ============================================================================ */}
      {hasNewSystemData ? (
        <div className="space-y-3">
          {/* Cabeçalho do novo sistema */}
          <div className="flex items-center gap-2">
            <Badge variant="default" className="bg-green-600">
              ✅ Sistema Unificado
            </Badge>
            {isLoading && (
              <Badge variant="outline" className="animate-pulse">
                Calculando...
              </Badge>
            )}
          </div>
          
          {/* Lista de descontos do novo sistema */}
          <ul className="space-y-1 text-sm">
            {calculatedTotals.descontos?.map((discount) => (
              <li key={discount.id} className="flex items-center justify-between">
                <span>{discount.codigo} • {discount.nome}</span>
                <span className="font-medium">-{discount.percentual_efetivo}%</span>
              </li>
            ))}
          </ul>
          
          <div className="h-px bg-border" />
          
          {/* Totais do novo sistema */}
          <div className="flex items-center justify-between text-sm">
            <span>Total de descontos</span>
            <span className="font-semibold">
              {calculatedTotals.percentual_aplicado}%
              {calculatedTotals.trilho_info?.cap_aplicado && (
                <em className="text-muted-foreground ml-2">
                  (limitado a {calculatedTotals.trilho_info.cap}%)
                  <span className="text-green-600 ml-1">✨</span>
                </em>
              )}
            </span>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span>Valor final</span>
            <span className="font-semibold">R$ {calculatedTotals.valor_final.toFixed(2)}</span>
          </div>
          
          <div className="text-xs text-muted-foreground">
            Economia mensal: R$ {calculatedTotals.valor_desconto.toFixed(2)} • anual: R$ {calculatedTotals.economia_anual.toFixed(2)}
          </div>
          
          {/* Informações do trilho */}
          {calculatedTotals.trilho_info && (
            <div className="text-xs text-green-700 bg-green-50 p-2 rounded border">
              <strong>Trilho {calculatedTotals.trilho_info.id}:</strong> {calculatedTotals.trilho_info.nome} 
              {calculatedTotals.trilho_info.cap ? `(CAP ${calculatedTotals.trilho_info.cap}%)` : '(Sem limite)'}
            </div>
          )}
        </div>
      ) : (
        /* ============================================================================ */
        /* SISTEMA ANTIGO: Fallback para compatibilidade */
        /* ============================================================================ */
        <div className="space-y-3">
          {/* Cabeçalho do sistema antigo */}
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-orange-300 text-orange-700">
              ⚠️ Sistema Antigo
            </Badge>
          </div>
          
          {/* Lista de descontos do sistema antigo */}
          <ul className="space-y-1 text-sm">
            {fallbackSummary.items.map((it) => (
              <li key={it.id} className="flex items-center justify-between">
                <span>{it.codigo} • {it.descricao}</span>
                <span className="font-medium">-{it.percentual}%</span>
              </li>
            ))}
          </ul>
          
          <div className="h-px bg-border" />
          
          {/* Totais do sistema antigo */}
          <div className="flex items-center justify-between text-sm">
            <span>Total de descontos</span>
            <span className="font-semibold">
              {fallbackSummary.cappedPercent}% 
              {fallbackSummary.capReached && (
                <em className="text-muted-foreground">
                  (limitado a {effectiveMaxDiscount}%)
                  {effectiveMaxDiscount !== MAX_DESCONTO_TOTAL && (
                    <span className="text-blue-600 ml-1">✨</span>
                  )}
                </em>
              )}
            </span>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span>Valor final</span>
            <span className="font-semibold">R$ {fallbackSummary.finalValue.toFixed(2)}</span>
          </div>
          
          <div className="text-xs text-muted-foreground">
            Economia mensal: R$ {fallbackSummary.savingsMonthly.toFixed(2)} • anual: R$ {fallbackSummary.savingsAnnual.toFixed(2)}
          </div>
        </div>
      )}
    </div>
  );
};
