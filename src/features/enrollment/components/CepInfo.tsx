import React, { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { classifyCep, describeCepClass, formatCep } from "@/features/enrollment/utils/cep";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CepInfoProps {
  cep?: string | null;
  editable?: boolean;
  onChangeCep?: (value: string) => void;
  compact?: boolean;
}

const CepInfo: React.FC<CepInfoProps> = ({ cep, editable = false, onChangeCep, compact = false }) => {
  const cls = useMemo(() => classifyCep(cep), [cep]);
  const text = useMemo(() => describeCepClass(cls), [cls]);
  const formatted = useMemo(() => formatCep(cep), [cep]);

  if (editable) {
    return (
      <div className={compact ? "space-y-1" : "space-y-2"}>
        <Label>CEP do Aluno</Label>
        <div className="flex gap-2 items-center">
          <Input
            placeholder="00000-000"
            value={formatted}
            onChange={(e) => onChangeCep?.(e.target.value)}
          />
          <Badge variant={cls === "fora" ? "default" : cls === "baixa" ? "secondary" : cls === "alta" ? "outline" : "secondary"}>
            {cls || "—"}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">{text}</p>
      </div>
    );
  }

  return (
    <div className={compact ? "flex items-center justify-between gap-3" : "space-y-1"}>
      <div className="text-sm">
        <span className="text-muted-foreground">CEP:</span> {formatted || "—"}
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={cls === "fora" ? "default" : cls === "baixa" ? "secondary" : cls === "alta" ? "outline" : "secondary"}>
          {cls || "—"}
        </Badge>
        {!compact && <span className="text-xs text-muted-foreground">{text}</span>}
      </div>
    </div>
  );
};

export default CepInfo;
