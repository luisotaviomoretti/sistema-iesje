import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useEnrollment } from "@/features/enrollment/context/EnrollmentContext";


const respSchema = z.object({
  nome_completo: z.string().min(3, "Informe o nome do responsável"),
  cpf: z.string().min(11, "Informe o CPF"),
  telefone_principal: z.string().min(8, "Informe um telefone"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
});

const respOptionalSchema = respSchema.partial();

export type StepRespValues = {
  principal: z.infer<typeof respSchema>;
  secundario?: z.infer<typeof respOptionalSchema>;
};

interface Props { onNext: () => void; onPrev: () => void; }

const StepResponsaveis: React.FC<Props> = ({ onNext, onPrev }) => {
  const { responsaveis, setResponsaveis } = useEnrollment();
  const form = useForm<StepRespValues>({
    resolver: zodResolver(z.object({ principal: respSchema, secundario: respOptionalSchema.optional() })),
    defaultValues: {
      principal: { nome_completo: responsaveis?.principal?.nome_completo || "", cpf: responsaveis?.principal?.cpf || "", telefone_principal: responsaveis?.principal?.telefone_principal || "", email: responsaveis?.principal?.email || "" },
      secundario: { nome_completo: responsaveis?.secundario?.nome_completo || "", cpf: responsaveis?.secundario?.cpf || "", telefone_principal: responsaveis?.secundario?.telefone_principal || "", email: responsaveis?.secundario?.email || "" },
    },
    mode: "onChange",
  });

  const onSubmit = form.handleSubmit((values) => { setResponsaveis(values as any); onNext(); });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-6">
        <section className="grid gap-4 sm:grid-cols-2">
          <h3 className="sm:col-span-2 font-semibold">Responsável Principal</h3>
          <FormField control={form.control} name="principal.nome_completo" render={({ field }) => (
            <FormItem>
              <FormLabel>Nome completo</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="principal.cpf" render={({ field }) => (
            <FormItem>
              <FormLabel>CPF</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="principal.telefone_principal" render={({ field }) => (
            <FormItem>
              <FormLabel>Telefone</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="principal.email" render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <h3 className="sm:col-span-2 font-semibold">Responsável Secundário (opcional)</h3>
          <FormField control={form.control} name="secundario.nome_completo" render={({ field }) => (
            <FormItem>
              <FormLabel>Nome completo</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="secundario.cpf" render={({ field }) => (
            <FormItem>
              <FormLabel>CPF</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="secundario.telefone_principal" render={({ field }) => (
            <FormItem>
              <FormLabel>Telefone</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="secundario.email" render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </section>

        <div className="flex justify-between">
          <Button type="button" variant="outline" onClick={onPrev}>Voltar</Button>
          <Button type="submit">Continuar</Button>
        </div>
      </form>
    </Form>
  );
};

export default StepResponsaveis;
