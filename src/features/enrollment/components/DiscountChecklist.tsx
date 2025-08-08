import { useMemo, useState } from "react";
import type { Desconto } from "@/features/enrollment/types";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { getChecklistForCodigo } from "@/features/enrollment/utils/discounts";

interface DiscountChecklistProps {
  desconto: Desconto;
}

export const DiscountChecklist: React.FC<DiscountChecklistProps> = ({ desconto }) => {
  const items = useMemo(() => getChecklistForCodigo(desconto.codigo_desconto), [desconto.codigo_desconto]);
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const allValid = items.length > 0 && items.every((it) => checked[it.id]);

  return (
    <div className="rounded-lg border p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-medium">
          {desconto.codigo_desconto} • Checklist de documentação
        </div>
        <Badge variant={allValid ? "default" : "secondary"}>{allValid ? "Documentação validada" : "Pendente"}</Badge>
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
            <div className="shrink-0">
              <label className="sr-only" htmlFor={`file-${desconto.id}-${it.id}`}>Anexar</label>
              <input
                id={`file-${desconto.id}-${it.id}`}
                type="file"
                className="hidden"
                onChange={() => setChecked((s) => ({ ...s, [it.id]: true }))}
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => document.getElementById(`file-${desconto.id}-${it.id}`)?.click()}
              >
                Anexar
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};
