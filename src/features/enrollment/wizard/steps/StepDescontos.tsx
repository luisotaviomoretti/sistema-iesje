import React, { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DiscountChecklist } from "@/features/enrollment/components/DiscountChecklist";
import { DiscountSummary } from "@/features/enrollment/components/DiscountSummary";
import { useEnrollment } from "@/features/enrollment/context/EnrollmentContext";
import { TIPOS_DESCONTO } from "@/features/enrollment/constants";
import type { Desconto } from "@/features/enrollment/types";
import { Trash2 } from "lucide-react";

const schema = z.object({ tipoId: z.string().min(1, "Selecione um tipo") });

interface Props { onPrev: () => void; onFinish: () => void; baseMensal: number; }

const StepDescontos: React.FC<Props> = ({ onPrev, onFinish, baseMensal }) => {
  const { descontos, addDesconto, selectedStudent, removeDescontoById } = useEnrollment();
  const [local, setLocal] = useState<Desconto[]>(descontos as any);

  const form = useForm<{ tipoId: string }>({ resolver: zodResolver(schema), defaultValues: { tipoId: "" } });

  const handleAdd = form.handleSubmit(({ tipoId }) => {
    const tipo = TIPOS_DESCONTO.find((t) => t.id === tipoId);
    if (!tipo || !selectedStudent) return;
    const d: Desconto = {
      id: crypto.randomUUID(),
      student_id: selectedStudent.id,
      tipo_desconto_id: tipo.id,
      codigo_desconto: tipo.codigo,
      percentual_aplicado: tipo.percentual_fixo || 0,
      status_aprovacao: "SOLICITADO",
      data_solicitacao: new Date().toISOString(),
    } as any;
    addDesconto(d);
    setLocal((l) => [...l, d]);
    form.reset();
  });

  const canFinish = useMemo(() => baseMensal > 0, [baseMensal]);

  const handleRemove = (d: Desconto) => {
    setLocal((l) => l.filter((x) => x.id !== d.id));
    removeDescontoById(d.id);
  };

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={handleAdd} className="grid sm:grid-cols-3 gap-4">
          <FormField control={form.control} name="tipoId" render={({ field }) => (
            <FormItem className="sm:col-span-2">
              <FormLabel>Solicitar desconto</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="z-50">
                  {TIPOS_DESCONTO.filter((t) => t.ativo).map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.codigo} • {t.descricao}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>Tipos aplicáveis exigem documentação conforme checklist.</FormDescription>
              <FormMessage />
            </FormItem>
          )} />
          <div className="sm:col-span-1 flex items-end">
            <Button type="submit" className="w-full">Adicionar</Button>
          </div>
        </form>
      </Form>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Descontos selecionados</h3>
          <Badge variant="secondary">{local.length}</Badge>
        </div>
        {local.length === 0 && <p className="text-sm text-muted-foreground">Nenhum desconto selecionado.</p>}
        <div className="space-y-3">
          {local.map((d) => (
            <div key={d.id} className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-2"
                aria-label="Excluir desconto"
                type="button"
                onClick={() => handleRemove(d)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <DiscountChecklist desconto={d} />
            </div>
          ))}
        </div>
      </section>

      <section>
        <DiscountSummary baseMensal={baseMensal} descontos={local as any} />
      </section>

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onPrev}>Voltar</Button>
        <Button onClick={onFinish} disabled={!canFinish}>Concluir</Button>
      </div>
    </div>
  );
};

export default StepDescontos;
