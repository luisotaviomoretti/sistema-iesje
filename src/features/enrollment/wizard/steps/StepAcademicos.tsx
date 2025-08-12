import React, { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SERIES_ANO, valorBaseParaSerie } from "@/features/enrollment/constants";

const schema = z.object({
  serie_ano: z.string().min(1, "Informe a série/ano"),
  turno: z.string().min(1, "Selecione o turno"),
  valor_mensalidade_base: z.coerce.number().min(0, "Informe o valor base"),
});

export type StepAcademicosValues = z.infer<typeof schema>;



interface Props { onNext: () => void; onPrev: () => void; onSave: (values: StepAcademicosValues) => void; }

const StepAcademicos: React.FC<Props> = ({ onNext, onPrev, onSave }) => {
  const form = useForm<StepAcademicosValues>({
    resolver: zodResolver(schema),
    defaultValues: { serie_ano: "", turno: "", valor_mensalidade_base: 0 },
    mode: "onChange",
  });

  

  const requiredDocs = useMemo(() => [
    { id: "doc-id", label: "Documento de Identidade" },
    { id: "doc-nasc", label: "Certidão de Nascimento" },
    { id: "doc-res", label: "Comprovante de Residência" },
  ], []);


  const onSubmit = form.handleSubmit((values) => {
    onSave(values);
    onNext();
  });


  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-3">
          <FormField control={form.control} name="serie_ano" render={({ field }) => (
            <FormItem className="sm:col-span-1">
              <FormLabel>Série/Ano</FormLabel>
              <Select value={field.value} onValueChange={(val) => {
                field.onChange(val);
                const base = valorBaseParaSerie(val);
                if (typeof base === "number") {
                  form.setValue("valor_mensalidade_base", base, { shouldDirty: true, shouldValidate: true });
                }
              }}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a série/ano" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="z-50">
                  {SERIES_ANO.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="turno" render={({ field }) => (
            <FormItem className="sm:col-span-1">
              <FormLabel>Turno</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="z-50">
                  <SelectItem value="Manhã">Manhã</SelectItem>
                  <SelectItem value="Tarde">Tarde</SelectItem>
                  <SelectItem value="Noite">Noite</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="valor_mensalidade_base" render={({ field }) => (
            <FormItem className="sm:col-span-1">
              <FormLabel>Valor base (R$)</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <div className="sm:col-span-3 flex justify-between pt-2">
            <Button type="button" variant="outline" onClick={onPrev}>Voltar</Button>
            <Button type="submit">Continuar</Button>
          </div>
        </form>
      </Form>

      <Card>
        <CardContent className="p-4 space-y-3">
          <h3 className="font-semibold">Documentos obrigatórios</h3>
          <p className="text-sm text-muted-foreground">O envio de anexos está desativado neste sistema no momento.</p>
          <ul className="list-disc pl-5 space-y-1">
            {requiredDocs.map((doc) => (
              <li key={doc.id} className="text-sm">{doc.label}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default StepAcademicos;
