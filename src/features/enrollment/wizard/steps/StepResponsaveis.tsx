import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useEnrollment } from "@/features/enrollment/context/EnrollmentContext";


const respSchema = z.object({
  nome_completo: z.string().min(3, "Informe o nome do responsável"),
  cpf: z.string().min(11, "Informe o CPF"),
  telefone_principal: z.string().min(8, "Informe um telefone"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  // Novos campos expandidos - TODOS OPCIONAIS
  grau_parentesco: z.string().optional().or(z.literal("")),
  profissao: z.string().optional().or(z.literal("")),
  telefone_secundario: z.string().optional().or(z.literal("")),
});

// Schema para responsável secundário - todos os campos opcionais
const respSecundarioSchema = z.object({
  nome_completo: z.string().optional().or(z.literal("")),
  cpf: z.string().optional().or(z.literal("")),
  telefone_principal: z.string().optional().or(z.literal("")),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  // Novos campos expandidos opcionais
  grau_parentesco: z.string().optional().or(z.literal("")),
  profissao: z.string().optional().or(z.literal("")),
  telefone_secundario: z.string().optional().or(z.literal("")),
}).optional();

export type StepRespValues = {
  principal: z.infer<typeof respSchema>;
  secundario?: z.infer<typeof respSecundarioSchema>;
};

interface Props { onNext: () => void; onPrev: () => void; }

const StepResponsaveis: React.FC<Props> = ({ onNext, onPrev }) => {
  const { responsaveis, setResponsaveis, updateDataUltimaAtualizacao } = useEnrollment();
  const [isExpandedPrincipal, setIsExpandedPrincipal] = useState(false);
  const [isExpandedSecundario, setIsExpandedSecundario] = useState(false);
  const form = useForm<StepRespValues>({
    resolver: zodResolver(z.object({ principal: respSchema, secundario: respSecundarioSchema })),
    defaultValues: {
      principal: { 
        nome_completo: responsaveis?.principal?.nome_completo || "", 
        cpf: responsaveis?.principal?.cpf || "", 
        telefone_principal: responsaveis?.principal?.telefone_principal || "", 
        email: responsaveis?.principal?.email || "",
        grau_parentesco: responsaveis?.principal?.grau_parentesco || "",
        profissao: responsaveis?.principal?.profissao || "",
        telefone_secundario: responsaveis?.principal?.telefone_secundario || ""
      },
      secundario: { 
        nome_completo: responsaveis?.secundario?.nome_completo || "", 
        cpf: responsaveis?.secundario?.cpf || "", 
        telefone_principal: responsaveis?.secundario?.telefone_principal || "", 
        email: responsaveis?.secundario?.email || "",
        grau_parentesco: responsaveis?.secundario?.grau_parentesco || "",
        profissao: responsaveis?.secundario?.profissao || "",
        telefone_secundario: responsaveis?.secundario?.telefone_secundario || ""
      },
    },
    mode: "onChange",
  });

  const onSubmit = form.handleSubmit((values) => { 
    console.log('💾 Salvando dados dos responsáveis:', values);
    setResponsaveis(values as any); 
    updateDataUltimaAtualizacao();
    onNext(); 
  });

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

          {/* Campos Adicionais - Colapsível */}
          <div className="sm:col-span-2">
            <Collapsible open={isExpandedPrincipal} onOpenChange={setIsExpandedPrincipal}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" type="button" className="w-full justify-start text-sm text-muted-foreground">
                  {isExpandedPrincipal ? <ChevronDown className="h-4 w-4 mr-2" /> : <ChevronRight className="h-4 w-4 mr-2" />}
                  Informações Adicionais (Opcional)
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 mt-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <FormField control={form.control} name="principal.grau_parentesco" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Parentesco</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Pai">Pai</SelectItem>
                          <SelectItem value="Mãe">Mãe</SelectItem>
                          <SelectItem value="Avô">Avô</SelectItem>
                          <SelectItem value="Avó">Avó</SelectItem>
                          <SelectItem value="Tio">Tio</SelectItem>
                          <SelectItem value="Tia">Tia</SelectItem>
                          <SelectItem value="Responsável Legal">Responsável Legal</SelectItem>
                          <SelectItem value="Outro">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="principal.profissao" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Profissão</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Engenheiro" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="principal.telefone_secundario" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone Adicional</FormLabel>
                      <FormControl>
                        <Input placeholder="(35) 99999-9999" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2 flex items-center space-x-2">
            <h3 className="font-semibold">Responsável Secundário</h3>
            <span className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded">(Opcional)</span>
          </div>
          <FormField control={form.control} name="secundario.nome_completo" render={({ field }) => (
            <FormItem>
              <FormLabel>Nome completo <span className="text-muted-foreground">(opcional)</span></FormLabel>
              <FormControl>
                <Input placeholder="Deixe vazio se não houver" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="secundario.cpf" render={({ field }) => (
            <FormItem>
              <FormLabel>CPF <span className="text-muted-foreground">(opcional)</span></FormLabel>
              <FormControl>
                <Input placeholder="000.000.000-00" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="secundario.telefone_principal" render={({ field }) => (
            <FormItem>
              <FormLabel>Telefone <span className="text-muted-foreground">(opcional)</span></FormLabel>
              <FormControl>
                <Input placeholder="(35) 99999-9999" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="secundario.email" render={({ field }) => (
            <FormItem>
              <FormLabel>Email <span className="text-muted-foreground">(opcional)</span></FormLabel>
              <FormControl>
                <Input type="email" placeholder="exemplo@email.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          {/* Campos Adicionais para Secundário - Colapsível */}
          <div className="sm:col-span-2">
            <Collapsible open={isExpandedSecundario} onOpenChange={setIsExpandedSecundario}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" type="button" className="w-full justify-start text-sm text-muted-foreground">
                  {isExpandedSecundario ? <ChevronDown className="h-4 w-4 mr-2" /> : <ChevronRight className="h-4 w-4 mr-2" />}
                  Informações Adicionais do Secundário (Opcional)
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 mt-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <FormField control={form.control} name="secundario.grau_parentesco" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Parentesco</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Pai">Pai</SelectItem>
                          <SelectItem value="Mãe">Mãe</SelectItem>
                          <SelectItem value="Avô">Avô</SelectItem>
                          <SelectItem value="Avó">Avó</SelectItem>
                          <SelectItem value="Tio">Tio</SelectItem>
                          <SelectItem value="Tia">Tia</SelectItem>
                          <SelectItem value="Responsável Legal">Responsável Legal</SelectItem>
                          <SelectItem value="Outro">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="secundario.profissao" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Profissão</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Professora" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="secundario.telefone_secundario" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone Adicional</FormLabel>
                      <FormControl>
                        <Input placeholder="(35) 99999-9999" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
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
