import React, { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { classifyCep, describeCepClass, formatCep, classifyCepWithDynamic, describeCepClassWithDynamic } from "@/features/enrollment/utils/cep";
import { usePublicCepClassification } from "@/features/admin/hooks/useCepRanges";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CepInfoProps {
  cep?: string | null;
  editable?: boolean;
  onChangeCep?: (value: string) => void;
  compact?: boolean;
}

const CepInfo: React.FC<CepInfoProps> = ({ cep, editable = false, onChangeCep, compact = false }) => {
  // 🔄 MIGRAÇÃO PROGRESSIVA: Buscar dados dinâmicos do admin
  // TEMPORARIAMENTE DESABILITADO: const { data: dynamicClassification, isLoading } = usePublicCepClassification(cep);
  const dynamicClassification = null;
  const isLoading = false;
  
  // 🎯 FALLBACK INTELIGENTE: Usar dados dinâmicos ou estáticos
  const cls = useMemo(() => {
    return classifyCepWithDynamic(cep, dynamicClassification, true);
  }, [cep, dynamicClassification]);
  
  const text = useMemo(() => {
    return describeCepClassWithDynamic(cls, dynamicClassification, true);
  }, [cls, dynamicClassification]);
  
  const formatted = useMemo(() => formatCep(cep), [cep]);
  
  // Status da sincronização
  const isDynamic = useMemo(() => {
    return dynamicClassification?.categoria === cls && !isLoading;
  }, [dynamicClassification, cls, isLoading]);

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
            {isLoading ? "..." : (cls || "—")}
          </Badge>
          {isDynamic && (
            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
              Admin
            </Badge>
          )}
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{text}</p>
          {cep && (
            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
              <div className={`w-1.5 h-1.5 rounded-full ${isDynamic ? 'bg-green-500' : 'bg-yellow-500'}`} />
              <span>{isDynamic ? '✅ Dinâmico' : '⚠️ Estático'}</span>
            </div>
          )}
        </div>
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
          {isLoading ? "..." : (cls || "—")}
        </Badge>
        {isDynamic && (
          <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
            Admin
          </Badge>
        )}
        {!compact && <span className="text-xs text-muted-foreground">{text}</span>}
        {!compact && cep && (
          <div className="flex items-center space-x-1 text-xs text-muted-foreground">
            <div className={`w-1.5 h-1.5 rounded-full ${isDynamic ? 'bg-green-500' : 'bg-yellow-500'}`} />
            <span>{isDynamic ? '✅ Dinâmico' : '⚠️ Estático'}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default CepInfo;
