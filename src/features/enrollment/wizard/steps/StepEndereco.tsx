import React, { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useEnrollment } from "@/features/enrollment/context/EnrollmentContext";
import { useToast } from "@/hooks/use-toast";
import { TIPOS_DESCONTO } from "@/features/enrollment/constants";
import type { StatusDesconto } from "@/features/enrollment/types";

const enderecoSchema = z.object({
  cep: z.string().min(8, "Informe o CEP"),
  logradouro: z.string().min(1, "Informe o logradouro"),
  numero: z.string().min(1, "Informe o número"),
  complemento: z.string().optional(),
  bairro: z.string().min(1, "Informe o bairro"),
  cidade: z.string().min(1, "Informe a cidade"),
  uf: z.string().min(2, "UF inválida").max(2, "UF inválida"),
});

export type EnderecoAluno = z.infer<typeof enderecoSchema>;

interface Props { onPrev: () => void; onNext: () => void }

const StepEndereco: React.FC<Props> = ({ onPrev, onNext }) => {
  const { selectedStudent, enderecoAluno, setEnderecoAluno, addDesconto, removeDesconto } = useEnrollment();
  const { toast } = useToast();

  const form = useForm<EnderecoAluno>({
    resolver: zodResolver(enderecoSchema),
    defaultValues: {
      cep: enderecoAluno?.cep || "",
      logradouro: enderecoAluno?.logradouro || "",
      numero: enderecoAluno?.numero || "",
      complemento: enderecoAluno?.complemento || "",
      bairro: enderecoAluno?.bairro || "",
      cidade: enderecoAluno?.cidade || "Poços de Caldas",
      uf: enderecoAluno?.uf || "MG",
    },
  });

  // CEP auto-fill state and effect
  const [isFetchingCep, setIsFetchingCep] = useState(false);
  const lastCepRef = useRef<string>("");
  const cepValue = form.watch("cep");

  useEffect(() => {
    const raw = cepValue || "";
    const digits = raw.replace(/\D/g, "");
    if (digits.length !== 8 || lastCepRef.current === digits) return;

    lastCepRef.current = digits;
    setIsFetchingCep(true);

    const fetchViaCep = async () => {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      if (!res.ok) throw new Error("viacep");
      const data = await res.json();
      if (data?.erro) return null;
      return {
        logradouro: data?.logradouro || "",
        bairro: data?.bairro || "",
        cidade: data?.localidade || "",
        uf: data?.uf || "",
      } as const;
    };

    const fetchBrasilApi = async () => {
      const res = await fetch(`https://brasilapi.com.br/api/cep/v1/${digits}`);
      if (!res.ok) throw new Error("brasilapi");
      const data = await res.json();
      return {
        logradouro: data?.street || "",
        bairro: data?.neighborhood || "",
        cidade: data?.city || "",
        uf: data?.state || "",
      } as const;
    };

    (async () => {
      try {
        let addr = await fetchViaCep();
        if (!addr) addr = await fetchBrasilApi();

        if (addr) {
          form.setValue("logradouro", addr.logradouro, { shouldDirty: true });
          form.setValue("bairro", addr.bairro, { shouldDirty: true });
          form.setValue("cidade", addr.cidade, { shouldDirty: true });
          form.setValue("uf", addr.uf, { shouldDirty: true });
          toast({ title: "Endereço preenchido", description: "Preenchido automaticamente via CEP." });
        } else {
          toast({ title: "CEP não encontrado", description: "Verifique o CEP informado.", variant: "destructive" });
        }
      } catch (e) {
        toast({ title: "Erro ao buscar CEP", description: "Tente novamente mais tarde.", variant: "destructive" });
      } finally {
        setIsFetchingCep(false);
      }
    })();
  }, [cepValue]);

  const classifyCep = (raw: string): "" | "fora" | "baixa" | "alta" => {
    const digits = (raw || "").replace(/\D/g, "");
    if (digits.length < 8) return "";
    const isPocos = digits.startsWith("377");
    if (!isPocos) return "fora";
    const baixaPrefixes = ["37712", "37713"]; // placeholder — substituir com base oficial (Supabase futuramente)
    if (baixaPrefixes.some((p) => digits.startsWith(p))) return "baixa";
    return "alta";
  };

  const findTipo = (codigo: string) => TIPOS_DESCONTO.find((t) => t.codigo === codigo);

  const addOrUpdateCepDiscount = (cls: "" | "fora" | "baixa" | "alta") => {
    removeDesconto("CEP10");
    removeDesconto("CEP5");
    if (!selectedStudent) return;

    if (cls === "fora") {
      const tipo = findTipo("CEP10");
      if (tipo) {
        addDesconto({
          id: crypto.randomUUID(),
          student_id: selectedStudent.id,
          tipo_desconto_id: tipo.id,
          codigo_desconto: tipo.codigo,
          percentual_aplicado: tipo.percentual_fixo ?? 10,
          status_aprovacao: "SOLICITADO" as StatusDesconto,
          data_solicitacao: new Date().toISOString(),
        });
      }
    } else if (cls === "baixa") {
      const tipo = findTipo("CEP5");
      if (tipo) {
        addDesconto({
          id: crypto.randomUUID(),
          student_id: selectedStudent.id,
          tipo_desconto_id: tipo.id,
          codigo_desconto: tipo.codigo,
          percentual_aplicado: tipo.percentual_fixo ?? 5,
          status_aprovacao: "SOLICITADO" as StatusDesconto,
          data_solicitacao: new Date().toISOString(),
        });
      }
    }
  };

  const onSubmit = form.handleSubmit((values) => {
    setEnderecoAluno(values);
    const cls = classifyCep(values.cep);
    let descMsg = "CEP inválido";
    if (cls === "fora") descMsg = "Fora de Poços de Caldas — elegível a 10% (CEP10)";
    else if (cls === "baixa") descMsg = "Poços (bairro de menor renda) — elegível a 5% (CEP5)";
    else if (cls === "alta") descMsg = "Poços (bairro de maior renda) — sem desconto por CEP";

    if (!selectedStudent) {
      toast({ title: "Endereço salvo", description: `${descMsg}. Selecione o aluno na etapa 1 para aplicar o desconto automaticamente.` });
      onNext();
      return;
    }

    if (!cls) {
      toast({ title: "Endereço salvo", description: descMsg });
      onNext();
      return;
    }

    addOrUpdateCepDiscount(cls);
    toast({ title: "Endereço salvo", description: `${descMsg}. Desconto comercial aplicado automaticamente.` });
    onNext();
  });

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="cep" render={({ field }) => (
            <FormItem>
              <FormLabel>CEP</FormLabel>
              <FormControl>
                <Input
                  placeholder="00000-000"
                  maxLength={9}
                  value={field.value}
                  onChange={(e) => {
                    const digits = (e.target.value || "").replace(/\D/g, "").slice(0, 8)
                    const formatted = digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits
                    field.onChange(formatted)
                  }}
                  onBlur={field.onBlur}
                  disabled={isFetchingCep}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="logradouro" render={({ field }) => (
            <FormItem className="sm:col-span-2">
              <FormLabel>Logradouro</FormLabel>
              <FormControl>
                <Input placeholder="Rua/Avenida" disabled={isFetchingCep} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="numero" render={({ field }) => (
            <FormItem>
              <FormLabel>Número</FormLabel>
              <FormControl>
                <Input placeholder="123" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="complemento" render={({ field }) => (
            <FormItem>
              <FormLabel>Complemento</FormLabel>
              <FormControl>
                <Input placeholder="Apto, bloco..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="bairro" render={({ field }) => (
            <FormItem>
              <FormLabel>Bairro</FormLabel>
              <FormControl>
                <Input placeholder="Bairro" disabled={isFetchingCep} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="cidade" render={({ field }) => (
            <FormItem>
              <FormLabel>Cidade</FormLabel>
              <FormControl>
                <Input placeholder="Cidade" disabled={isFetchingCep} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="uf" render={({ field }) => (
            <FormItem>
              <FormLabel>UF</FormLabel>
              <FormControl>
                <Input placeholder="UF" maxLength={2} disabled={isFetchingCep} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <div className="sm:col-span-2 flex items-center justify-between pt-2">
            <Button type="button" variant="outline" onClick={onPrev}>Voltar</Button>
            <Button type="submit">Prosseguir</Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default StepEndereco;
