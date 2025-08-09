import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEnrollment } from "@/features/enrollment/context/EnrollmentContext";
import { DiscountSummary } from "@/features/enrollment/components/DiscountSummary";
import { calculateTotals } from "@/features/enrollment/utils/discounts";
import { generateProposalPdf } from "@/features/enrollment/utils/proposal-pdf";
import { Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
const FinalConfirmation: React.FC = () => {
  const { selectedStudent, matricula, descontos } = useEnrollment();
  const { toast } = useToast();

  const baseMensal = Number(matricula?.valor_mensalidade_base || 0);
  const descontosList = useMemo(() => descontos as any[], [descontos]);
  const summary = useMemo(() => calculateTotals(baseMensal, descontosList as any), [baseMensal, descontosList]);

  const disabled = !selectedStudent || !matricula?.serie_ano || !matricula?.turno || baseMensal <= 0;

  const handleConfirm = () => {
    toast({ title: "Matrícula confirmada", description: "Dados salvos localmente. Conecte ao Supabase para persistir." });
  };
  const handleDraft = () => {
    toast({ title: "Rascunho salvo", description: "Rascunho mantido no estado local." });
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
        <DiscountSummary baseMensal={baseMensal} descontos={descontosList as any} />
        <div className="flex flex-wrap gap-2 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => generateProposalPdf({ flow: "rematricula", student: selectedStudent as any, matricula: matricula as any, descontos: descontosList as any, baseMensal })}
          >
            <Download className="mr-2 h-4 w-4" />
            Download Proposta
          </Button>
          <Button onClick={handleConfirm} disabled={disabled}>Confirmar Matrícula</Button>
          <Button onClick={handleDraft} variant="secondary">Salvar Rascunho</Button>
          <Button onClick={handleCancel} variant="ghost">Cancelar</Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default FinalConfirmation;
