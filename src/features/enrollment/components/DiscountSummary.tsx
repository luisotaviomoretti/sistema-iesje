import React from "react";
import type { Desconto } from "@/features/enrollment/types";
import { calculateTotals } from "@/features/enrollment/utils/discounts";

interface DiscountSummaryProps {
  baseMensal: number;
  descontos: Desconto[];
}

export const DiscountSummary: React.FC<DiscountSummaryProps> = ({ baseMensal, descontos }) => {
  const summary = calculateTotals(baseMensal, descontos);

  return (
    <div className="space-y-3">
      <div className="text-sm text-muted-foreground">
        Valor base: <span className="font-medium">R$ {baseMensal.toFixed(2)}</span>
      </div>
      <ul className="space-y-1 text-sm">
        {summary.items.map((it) => (
          <li key={it.id} className="flex items-center justify-between">
            <span>{it.codigo} • {it.descricao}</span>
            <span className="font-medium">-{it.percentual}%</span>
          </li>
        ))}
      </ul>
      <div className="h-px bg-border" />
      <div className="flex items-center justify-between text-sm">
        <span>Total de descontos</span>
        <span className="font-semibold">{summary.cappedPercent}% {summary.capReached && <em className="text-muted-foreground">(limitado a 60%)</em>}</span>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span>Valor final</span>
        <span className="font-semibold">R$ {summary.finalValue.toFixed(2)}</span>
      </div>
      <div className="text-xs text-muted-foreground">
        Economia mensal: R$ {summary.savingsMonthly.toFixed(2)} • anual: R$ {summary.savingsAnnual.toFixed(2)}
      </div>
    </div>
  );
};
