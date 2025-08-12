import React, { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DiscountChecklist } from "@/features/enrollment/components/DiscountChecklist";
import { DiscountSummary } from "@/features/enrollment/components/DiscountSummary";
import { useEnrollment } from "@/features/enrollment/context/EnrollmentContext";
import { TIPOS_DESCONTO } from "@/features/enrollment/constants";
import type { Desconto } from "@/features/enrollment/types";
import { Trash2, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { generateProposalPdf } from "@/features/enrollment/utils/proposal-pdf";
const schema = z.object({ tipoId: z.string().min(1, "Selecione um tipo") });

interface Props { onPrev: () => void; onFinish: () => void; baseMensal: number; }

const StepDescontos: React.FC<Props> = ({ onPrev, onFinish, baseMensal }) => {
  const { descontos, addDesconto, selectedStudent, removeDescontoById, matricula } = useEnrollment();
  const [local, setLocal] = useState<Desconto[]>(descontos as any);

  const form = useForm<{ tipoId: string }>({ resolver: zodResolver(schema), defaultValues: { tipoId: "" } });
  const { toast } = useToast();
  const watchedTipoId = form.watch("tipoId");
  const selectedTipo = useMemo(() => TIPOS_DESCONTO.find((t) => t.id === watchedTipoId), [watchedTipoId]);
  const isDuplicate = useMemo(() => !!(selectedTipo && local.some((d) => d.codigo_desconto === selectedTipo.codigo)), [selectedTipo, local]);
  const handleAdd = form.handleSubmit(({ tipoId }) => {
    const tipo = TIPOS_DESCONTO.find((t) => t.id === tipoId);
    if (!tipo) return;
    if (!selectedStudent) {
      toast({
        title: "Selecione o aluno",
        description: "Você precisa selecionar um aluno para solicitar desconto.",
        variant: "destructive",
      });
      return;
    }
    if (local.some((x) => x.codigo_desconto === tipo.codigo)) {
      toast({ title: "Desconto já adicionado", description: `${tipo.codigo} • ${tipo.descricao}`, variant: "destructive" });
      return;
    }
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
    toast({ title: "Desconto adicionado", description: `${tipo.codigo} • ${tipo.descricao}` });
  });

  const canFinish = useMemo(() => baseMensal > 0, [baseMensal]);

  const comExtra = useMemo(() => local.find((d) => d.codigo_desconto === "COM_EXTRA"), [local]);
  const [comExtraPct, setComExtraPct] = useState<number>(0);
  const [comExtraMotivo, setComExtraMotivo] = useState<string>("");

  useEffect(() => {
    if (comExtra) {
      setComExtraPct(comExtra.percentual_aplicado || 0);
      setComExtraMotivo(comExtra.observacoes || "");
    }
  }, [comExtra?.id]);

  const handleRemove = (d: Desconto) => {
    setLocal((l) => l.filter((x) => x.id !== d.id));
    removeDescontoById(d.id);
  };

  const handleApplyComExtra = () => {
    const pct = Number(comExtraPct || 0);
    if (isNaN(pct) || pct <= 0 || pct > 20) {
      toast({ title: "Percentual inválido", description: "Informe um percentual entre 0 e 20%.", variant: "destructive" });
      return;
    }
    if (!comExtraMotivo?.trim()) {
      toast({ title: "Informe o motivo", description: "Descreva o motivo do desconto adicional.", variant: "destructive" });
      return;
    }
    const tipo = TIPOS_DESCONTO.find((t) => t.codigo === "COM_EXTRA");
    if (!tipo || !selectedStudent) return;
    if (comExtra) {
      // remove existente primeiro
      handleRemove(comExtra);
    }
    const d: Desconto = {
      id: crypto.randomUUID(),
      student_id: selectedStudent.id,
      tipo_desconto_id: tipo.id,
      codigo_desconto: tipo.codigo,
      percentual_aplicado: pct,
      status_aprovacao: "SOLICITADO",
      data_solicitacao: new Date().toISOString(),
      observacoes: comExtraMotivo.trim(),
    } as any;
    addDesconto(d);
    setLocal((l) => [...l, d]);
    toast({ title: "Desconto comercial extra aplicado", description: "A Diretoria Administrativa avaliará de forma mais contundente este desconto." });
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
              {isDuplicate && (
                <p className="text-sm text-destructive">Este desconto já foi adicionado.</p>
              )}
              <FormMessage />
            </FormItem>
          )} />
          <div className="sm:col-span-1 flex items-end">
            <Button type="submit" className="w-full" disabled={!selectedStudent || !watchedTipoId || isDuplicate}>Adicionar</Button>
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

      <section className="space-y-3">
        <h3 className="font-semibold">Desconto comercial extra (negociação)</h3>
        <div className="grid gap-2 sm:grid-cols-3">
          <div>
            <Label htmlFor="pct-extra">Percentual (%)</Label>
            <Input id="pct-extra" type="number" min={0} max={20} step={1} value={comExtraPct} onChange={(e) => setComExtraPct(Number(e.target.value))} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="motivo-extra">Motivo do desconto</Label>
            <Textarea id="motivo-extra" rows={2} placeholder="Descreva o motivo da negociação" value={comExtraMotivo} onChange={(e) => setComExtraMotivo(e.target.value)} />
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">Ao aplicar, a Diretoria Administrativa avaliará de forma mais contundente o desconto.</p>
          <Button type="button" onClick={handleApplyComExtra} disabled={!selectedStudent}>Aplicar/Atualizar</Button>
        </div>
      </section>

      <section>
        <DiscountSummary baseMensal={baseMensal} descontos={local as any} />
        {!canFinish && (
          <p className="text-sm text-muted-foreground mt-2">
            Informe o valor base da mensalidade no passo “Acadêmicos” para concluir.
          </p>
        )}
      </section>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2">
        <Button variant="outline" onClick={onPrev}>Voltar</Button>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => generateProposalPdf({ flow: "nova", student: selectedStudent as any, matricula: matricula as any, descontos: local as any, baseMensal })}
            disabled={!canFinish}
          >
            <Download className="mr-2 h-4 w-4" />
            Download Proposta
          </Button>
          <Button onClick={onFinish} disabled={!canFinish}>Confirmar</Button>
        </div>
      </div>
    </div>
  );
};

export default StepDescontos;
