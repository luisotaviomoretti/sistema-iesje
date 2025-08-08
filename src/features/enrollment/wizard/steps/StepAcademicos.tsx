import React, { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const schema = z.object({
  serie_ano: z.string().min(1, "Informe a série/ano"),
  turno: z.string().min(1, "Selecione o turno"),
  valor_mensalidade_base: z.coerce.number().min(0, "Informe o valor base"),
});

export type StepAcademicosValues = z.infer<typeof schema>;

interface FileItem { id: string; name: string; url: string; type: string; }

interface Props { onNext: () => void; onPrev: () => void; onSave: (values: StepAcademicosValues) => void; }

const StepAcademicos: React.FC<Props> = ({ onNext, onPrev, onSave }) => {
  const form = useForm<StepAcademicosValues>({
    resolver: zodResolver(schema),
    defaultValues: { serie_ano: "", turno: "", valor_mensalidade_base: 0 },
    mode: "onChange",
  });

  const [files, setFiles] = useState<FileItem[]>([]);

  const requiredDocs = useMemo(() => [
    { id: "doc-id", label: "Documento de Identidade" },
    { id: "doc-nasc", label: "Certidão de Nascimento" },
    { id: "doc-res", label: "Comprovante de Residência" },
  ], []);

  const statuses: Record<string, "NAO_ENVIADO" | "PENDENTE" | "APROVADO" | "REPROVADO"> = useMemo(() => {
    const map: Record<string, any> = {};
    for (const d of requiredDocs) map[d.id] = files.some((f) => f.id.startsWith(d.id)) ? "PENDENTE" : "NAO_ENVIADO";
    return map;
  }, [requiredDocs, files]);

  const onSubmit = form.handleSubmit((values) => {
    onSave(values);
    onNext();
  });

  const onPick = (docId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    setFiles((prev) => [...prev, { id: `${docId}-${crypto.randomUUID()}`, name: f.name, url, type: f.type }]);
  };

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-3">
          <FormField control={form.control} name="serie_ano" render={({ field }) => (
            <FormItem className="sm:col-span-1">
              <FormLabel>Série/Ano</FormLabel>
              <FormControl>
                <Input placeholder="Ex: 6º ano" {...field} />
              </FormControl>
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
          <ul className="space-y-2">
            {requiredDocs.map((doc) => (
              <li key={doc.id} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{doc.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <label className="sr-only" htmlFor={`file-${doc.id}`}>Anexar</label>
                  <input id={`file-${doc.id}`} type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => onPick(doc.id, e)} />
                  <Button size="sm" variant="secondary" onClick={() => document.getElementById(`file-${doc.id}`)?.click()}>Anexar</Button>
                  <span className={`text-xs px-2 py-1 rounded border ${statuses[doc.id] === "APROVADO" ? "bg-green-500/10" : statuses[doc.id] === "REPROVADO" ? "bg-destructive/10" : statuses[doc.id] === "PENDENTE" ? "bg-secondary" : ""}`}>{statuses[doc.id] || "NAO_ENVIADO"}</span>
                </div>
              </li>
            ))}
          </ul>
          {files.length > 0 && (
            <div className="grid sm:grid-cols-3 gap-3 pt-2">
              {files.map((f) => (
                <div key={f.id} className="rounded-md border p-2 text-xs space-y-2">
                  <div className="truncate font-medium" title={f.name}>{f.name}</div>
                  {f.type.startsWith("image/") ? (
                    <img src={f.url} alt={f.name} className="w-full h-28 object-cover rounded" loading="lazy" />
                  ) : (
                    <div className="text-muted-foreground">Arquivo: {f.type}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StepAcademicos;
