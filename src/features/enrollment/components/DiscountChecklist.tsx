import { useMemo, useState } from "react";
import type { Desconto } from "@/features/enrollment/types";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { usePublicDiscountTypes } from "@/features/admin/hooks/useDiscountTypes";
import { getChecklistForCodigo, getDynamicChecklistForCode } from "@/features/enrollment/utils/discounts";

interface DiscountChecklistProps {
  desconto: Desconto;
}

export const DiscountChecklist: React.FC<DiscountChecklistProps> = ({ desconto }) => {
  // 🔄 MIGRAÇÃO PROGRESSIVA: Buscar dados dinâmicos do admin
  const { data: dynamicDiscountTypes, isLoading } = usePublicDiscountTypes();
  
  // 🎯 FALLBACK INTELIGENTE: Gerar checklist com dados dinâmicos ou estáticos
  const items = useMemo(() => {
    return getDynamicChecklistForCode(
      desconto.codigo_desconto, 
      dynamicDiscountTypes, 
      true // fallback para estático
    );
  }, [desconto.codigo_desconto, dynamicDiscountTypes]);
  
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  
  // Status da sincronização
  const isDynamic = useMemo(() => {
    return dynamicDiscountTypes?.some(t => t.codigo === desconto.codigo_desconto) ?? false;
  }, [dynamicDiscountTypes, desconto.codigo_desconto]);

  const allValid = items.length > 0 && items.every((it) => checked[it.id]);

  return (
    <div className="rounded-lg border p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-medium flex items-center space-x-2">
          <span>{desconto.codigo_desconto} • Checklist de documentação</span>
          {isDynamic && (
            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
              Admin
            </Badge>
          )}
          {isLoading && (
            <div className="animate-pulse text-blue-600 text-xs">Carregando...</div>
          )}
        </div>
        <Badge variant={allValid ? "default" : "secondary"}>
          {allValid ? "Documentação validada" : "Pendente"}
        </Badge>
      </div>
      <ul className="space-y-2">
        {items.map((it) => (
          <li key={it.id} className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              <Checkbox
                id={`ck-${desconto.id}-${it.id}`}
                checked={!!checked[it.id]}
                onCheckedChange={(v) => setChecked((s) => ({ ...s, [it.id]: Boolean(v) }))}
              />
              <label htmlFor={`ck-${desconto.id}-${it.id}`} className="text-sm leading-6">
                {it.label}
              </label>
            </div>
            <div className="shrink-0 text-xs text-muted-foreground">Anexos desativados</div>
          </li>
        ))}
      </ul>
      
      {/* 📊 Status da Sincronização */}
      <div className="pt-2 border-t flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center space-x-1">
          <div className={`w-1.5 h-1.5 rounded-full ${isDynamic ? 'bg-green-500' : 'bg-yellow-500'}`} />
          <span>
            {isDynamic ? 
              `✅ Documentos sincronizados com admin` : 
              `⚠️ Usando lista padrão`
            }
          </span>
        </div>
        {items.length > 0 && (
          <span>{items.filter(it => checked[it.id]).length}/{items.length} documentos</span>
        )}
      </div>
    </div>
  );
};
