import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useEnrollment } from "@/features/enrollment/context/EnrollmentContext";
import { DiscountSummary } from "@/features/enrollment/components/DiscountSummary";
import { calculateTotals } from "@/features/enrollment/utils/discounts";
import { generateProposalPdf } from "@/features/enrollment/utils/proposal-pdf";
import { usePublicDiscountTypes } from "@/features/admin/hooks/useDiscountTypes";
import { useMaxDiscountLimit } from "@/features/admin/hooks/useEnrollmentConfig";
import { TIPOS_DESCONTO, MAX_DESCONTO_TOTAL } from "@/features/enrollment/constants";
import { Download, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
const FinalConfirmation: React.FC = () => {
  // ============================================================================
  // NOVO SISTEMA UNIFICADO - FONTE ÚNCIA DE VERDADE
  // ============================================================================
  const { 
    selectedStudent, 
    matricula,
    // Dados do novo sistema centralizado
    selectedTrackId,
    selectedDiscountIds,
    calculatedTotals,
    trackData,
    discountsData,
    isLoading,
    calculationValid,
    
    // Dados antigos para compatibilidade
    descontos, 
    trilhos 
  } = useEnrollment();
  const { toast } = useToast();
  
  // 🔄 MIGRAÇÃO PROGRESSIVA: Dados dinâmicos do admin (DEPRECATED)
  const { data: dynamicDiscountTypes } = usePublicDiscountTypes();
  const { data: maxDiscountLimit } = useMaxDiscountLimit();
  
  // 🎯 FALLBACK INTELIGENTE (DEPRECATED - apenas para compatibilidade)
  const discountTypes = useMemo(() => {
    return dynamicDiscountTypes?.length > 0 ? dynamicDiscountTypes : TIPOS_DESCONTO;
  }, [dynamicDiscountTypes]);
  
  // ============================================================================
  // NOVO SISTEMA: Usar dados do hook centralizado
  // ============================================================================
  
  // Dados do trilho vem direto do hook (FONTE ÚNCIA DE VERDADE)
  const effectiveMaxDiscount = calculatedTotals?.trilho_info?.cap || 60;
  const trilhoName = calculatedTotals?.trilho_info 
    ? `${calculatedTotals.trilho_info.nome} (${calculatedTotals.trilho_info.cap ? `Máx. ${calculatedTotals.trilho_info.cap}%` : 'Sem limite'})` 
    : 'Nenhum selecionado';
    
  // FALLBACK: Compatibilidade com sistema antigo durante transição
  const fallbackMaxDiscount = useMemo(() => {
    if (trilhos?.trilho_escolhido === 'A') {
      return 100; // Trilho A - Sem limite
    } else if (trilhos?.trilho_escolhido === 'B') {
      return 25; // Trilho B - CAP de 25%
    }
    return maxDiscountLimit ?? MAX_DESCONTO_TOTAL;
  }, [trilhos?.trilho_escolhido, maxDiscountLimit]);
  
  const fallbackTrilhoName = useMemo(() => {
    switch (trilhos?.trilho_escolhido) {
      case 'A': return 'Especial (Sem limite)';
      case 'B': return 'Combinado (Máx. 25%)';
      case 'C': return 'Normal (Máx. 60%)';
      default: return 'Nenhum selecionado';
    }
  }, [trilhos?.trilho_escolhido]);

  const baseMensal = Number(matricula?.valor_mensalidade_base || 0);
  const descontosList = useMemo(() => descontos as any[], [descontos]);
  
  // ============================================================================
  // NOVO SISTEMA: CÁLCULOS UNIFICADOS (FONTE ÚNCIA DE VERDADE)
  // ============================================================================
  const summary = calculatedTotals || {
    totalPercent: 0,
    totalAmount: 0,
    finalAmount: baseMensal,
    monthlyDiscount: 0,
    yearlyDiscount: 0,
    capApplied: false
  };
  
  // FALLBACK: Sistema antigo para compatibilidade durante transição
  const fallbackSummary = useMemo(() => {
    return calculateTotals(baseMensal, descontosList as any, discountTypes, fallbackMaxDiscount);
  }, [baseMensal, descontosList, discountTypes, fallbackMaxDiscount]);

  const disabled = !selectedStudent || !matricula?.serie_ano || !matricula?.turno || baseMensal <= 0;

  const handleConfirm = () => {
    toast({ title: "Matrícula confirmada", description: "Dados salvos localmente. Conecte ao Supabase para persistir." });
  };
  const handleCancel = () => {
    toast({ title: "Operação cancelada" });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Confirmação Final</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm">
          <div>Aluno: <span className="font-medium">{selectedStudent?.nome_completo || "—"}</span></div>
          <div>Série/Ano • Turno: <span className="font-medium">{matricula?.serie_ano || "—"} • {matricula?.turno || "—"}</span></div>
        </div>
        
        {/* ============================================================================ */}
        {/* NOVO SISTEMA: Mostrar informações do trilho */}
        {/* ============================================================================ */}
        {calculatedTotals?.trilho_info && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Trilho:</span>
              <Badge variant="default">
                {trilhoName}
              </Badge>
              {calculatedTotals.trilho_info.cap_aplicado && (
                <Badge variant="outline" className="text-orange-700 border-orange-300">
                  CAP Aplicado
                </Badge>
              )}
            </div>
            
            {/* Mostrar cálculos do novo sistema */}
            <div className="p-3 bg-green-50 border border-green-200 rounded-md text-sm">
              <div className="font-medium text-green-800 mb-2">✅ Cálculos Unificados</div>
              <div className="grid grid-cols-2 gap-2">
                <div>Subtotal: {calculatedTotals.subtotal_percentual}%</div>
                <div>Aplicado: {calculatedTotals.percentual_aplicado}%</div>
                <div>Valor Final: R$ {calculatedTotals.valor_final.toFixed(2)}</div>
                <div>Desconto: R$ {calculatedTotals.valor_desconto.toFixed(2)}</div>
              </div>
            </div>
          </div>
        )}
        
        {/* FALLBACK: Sistema antigo durante transição */}
        {!calculatedTotals?.trilho_info && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Trilho (Sistema Antigo):</span>
              <Badge variant={trilhos?.trilho_escolhido ? "outline" : "outline"}>
                {fallbackTrilhoName}
              </Badge>
            </div>
            
            {/* Alertar se há diferença entre o cálculo esperado */}
            {trilhos?.trilho_escolhido && fallbackSummary.totalPercent > fallbackMaxDiscount && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  O total de descontos ({fallbackSummary.totalPercent}%) excede o limite do {fallbackTrilhoName} ({fallbackMaxDiscount}%).
                  Será aplicado o valor máximo permitido.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
        
        <DiscountSummary baseMensal={baseMensal} descontos={descontosList as any} />
        <div className="flex flex-wrap gap-2 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => generateProposalPdf({ 
              flow: "rematricula", 
              student: selectedStudent as any, 
              matricula: matricula as any, 
              descontos: descontosList as any, 
              baseMensal,
              discountTypes,
              maxDiscountLimit: calculatedTotals?.trilho_info?.cap || fallbackMaxDiscount
            })}
          >
            <Download className="mr-2 h-4 w-4" />
            Download Proposta
          </Button>
          <Button onClick={handleConfirm} disabled={disabled}>Confirmar Matrícula</Button>
          <Button onClick={handleCancel} variant="ghost">Cancelar</Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default FinalConfirmation;
