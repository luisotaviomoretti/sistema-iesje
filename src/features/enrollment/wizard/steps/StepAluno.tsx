import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cpfIsValid } from "@/features/enrollment/utils/validation";
import { useEnrollment } from "@/features/enrollment/context/EnrollmentContext";
import type { Student } from "@/features/enrollment/types";

const schema = z.object({
  escola: z.enum(["pelicano", "sete_setembro"], {
    required_error: "Selecione a escola"
  }),
  nome_completo: z.string().min(3, "Informe o nome completo"),
  cpf: z.string().refine(cpfIsValid, "CPF inválido"),
  rg: z.string().optional().or(z.literal("")),
  data_nascimento: z.string().optional().or(z.literal("")),
  sexo: z.string().optional().or(z.literal("")),
});

export type StepAlunoValues = z.infer<typeof schema>;

interface Props {
  onNext: () => void;
}

const StepAluno: React.FC<Props> = ({ onNext }) => {
  const { selectedStudent, setSelectedStudent, escola, setEscola, setFlow } = useEnrollment();

  const form = useForm<StepAlunoValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      escola: escola || undefined,
      nome_completo: selectedStudent?.nome_completo || "",
      cpf: selectedStudent?.cpf || "",
      rg: selectedStudent?.rg || "",
      data_nascimento: selectedStudent?.data_nascimento || "",
      sexo: selectedStudent?.sexo || "",
    },
    mode: "onChange",
  });

  useEffect(() => setFlow("nova"), [setFlow]);

  const onSubmit = form.handleSubmit((values) => {
    const { escola, ...studentData } = values;
    const student: Student = {
      id: selectedStudent?.id || crypto.randomUUID(),
      ...studentData,
    } as Student;
    setEscola(escola);
    setSelectedStudent(student);
    onNext();
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
        <FormField control={form.control} name="escola" render={({ field }) => (
          <FormItem className="sm:col-span-2">
            <FormLabel>Escola *</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a escola" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="pelicano">Pelicano</SelectItem>
                <SelectItem value="sete_setembro">Sete de Setembro</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="nome_completo" render={({ field }) => (
          <FormItem>
            <FormLabel>Nome completo</FormLabel>
            <FormControl>
              <Input placeholder="Ex: Maria Silva" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="cpf" render={({ field }) => (
          <FormItem>
            <FormLabel>CPF</FormLabel>
            <FormControl>
              <Input placeholder="000.000.000-00" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="rg" render={({ field }) => (
          <FormItem>
            <FormLabel>RG</FormLabel>
            <FormControl>
              <Input placeholder="Opcional" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="data_nascimento" render={({ field }) => (
          <FormItem>
            <FormLabel>Data de nascimento</FormLabel>
            <FormControl>
              <Input type="date" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <div className="sm:col-span-2 flex justify-end">
          <Button type="submit">Continuar</Button>
        </div>
      </form>
    </Form>
  );
};

export default StepAluno;
