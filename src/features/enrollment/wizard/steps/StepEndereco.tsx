import React, { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useEnrollment } from "@/features/enrollment/context/EnrollmentContext";
import { useToast } from "@/hooks/use-toast";
import { 
  classifyCep, 
  describeCepClass, 
  classifyCepWithDynamic, 
  describeCepClassWithDynamic, 
  getCepDiscountPercentage,
  fetchAddress,
  isPocosDeCaldas,
  autoClassifyByCidade,
  type AddressInfo
} from "@/features/enrollment/utils/cep";
import { usePublicCepClassification } from "@/features/admin/hooks/useCepRanges";

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
  const { selectedStudent, enderecoAluno, setEnderecoAluno } = useEnrollment();
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
  const [addressInfo, setAddressInfo] = useState<AddressInfo | null>(null);
  const [autoClassification, setAutoClassification] = useState<string>("");
  const lastCepRef = useRef<string>("");
  const cepValue = form.watch("cep");
  
  // 🔄 MIGRAÇÃO PROGRESSIVA: Buscar dados dinâmicos do admin
  const { data: dynamicClassification, isLoading: cepLoading } = usePublicCepClassification(cepValue);

  useEffect(() => {
    const raw = cepValue || "";
    const digits = raw.replace(/\D/g, "");
    if (digits.length !== 8 || lastCepRef.current === digits) return;

    lastCepRef.current = digits;
    setIsFetchingCep(true);

    (async () => {
      try {
        // 🚀 FASE 2: Usar nova função fetchAddress
        const addr = await fetchAddress(digits);

        if (addr) {
          // Armazenar informações do endereço
          setAddressInfo(addr);
          
          // 🎯 NOVA LÓGICA: Classificação automática baseada na cidade
          const autoClass = autoClassifyByCidade(addr.cidade);
          setAutoClassification(autoClass);
          
          // Preencher formulário
          form.setValue("logradouro", addr.logradouro, { shouldDirty: true });
          form.setValue("bairro", addr.bairro, { shouldDirty: true });
          form.setValue("cidade", addr.cidade, { shouldDirty: true });
          form.setValue("uf", addr.uf, { shouldDirty: true });
          
          // Toast com classificação automática
          const isPocos = isPocosDeCaldas(addr.cidade);
          const message = isPocos 
            ? "Endereço preenchido. CEP de Poços de Caldas - você poderá selecionar a classificação no painel administrativo."
            : `Endereço preenchido. CEP fora de Poços de Caldas (${addr.cidade}) - classificação automática aplicada.`;
          
          toast({ 
            title: "Endereço preenchido", 
            description: message
          });
        } else {
          setAddressInfo(null);
          setAutoClassification("");
          toast({ 
            title: "CEP não encontrado", 
            description: "Verifique o CEP informado.", 
            variant: "destructive" 
          });
        }
      } catch (e) {
        setAddressInfo(null);
        setAutoClassification("");
        toast({ 
          title: "Erro ao buscar CEP", 
          description: "Tente novamente mais tarde.", 
          variant: "destructive" 
        });
      } finally {
        setIsFetchingCep(false);
      }
    })();
  }, [cepValue]);

// Classificação de CEP com dados dinâmicos; aplicação de desconto ocorrerá manualmente na etapa "Descontos".
  const onSubmit = form.handleSubmit((values) => {
    setEnderecoAluno(values);
    
    // 🎯 FALLBACK INTELIGENTE: Usar dados dinâmicos ou estáticos
    const cls = classifyCepWithDynamic(values.cep, dynamicClassification, true);
    const descMsg = describeCepClassWithDynamic(cls, dynamicClassification, true);
    const percentual = getCepDiscountPercentage(cls, dynamicClassification, true);
    
    const elegivel = percentual > 0;
    const dinamicIndicator = dynamicClassification?.categoria === cls ? " (Dados sincronizados)" : " (Dados locais)";
    const complemento = elegivel ? ` Você poderá aplicar o desconto por CEP na etapa "Descontos".${dinamicIndicator}` : dinamicIndicator;
    
    toast({ 
      title: "Endereço salvo", 
      description: `${descMsg}${complemento}` 
    });
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
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  {cepLoading ? "Classificando..." : (
                    addressInfo ? (
                      autoClassification === "fora" ? (
                        <span className="text-orange-600 font-medium">
                          🌍 Fora de Poços de Caldas ({addressInfo.cidade})
                        </span>
                      ) : isPocosDeCaldas(addressInfo.cidade) ? (
                        <span className="text-blue-600 font-medium">
                          🏠 Poços de Caldas - Selecione a classificação no admin
                        </span>
                      ) : (
                        describeCepClassWithDynamic(classifyCepWithDynamic(cepValue, dynamicClassification, true), dynamicClassification, true)
                      )
                    ) : (
                      describeCepClassWithDynamic(classifyCepWithDynamic(cepValue, dynamicClassification, true), dynamicClassification, true)
                    )
                  )}
                </div>
                {cepValue && (
                  <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      autoClassification === "fora" ? 'bg-orange-500' :
                      dynamicClassification?.categoria ? 'bg-green-500' : 'bg-yellow-500'
                    }`} />
                    <span>{
                      autoClassification === "fora" ? '🎯 Auto' :
                      dynamicClassification?.categoria ? '✅ Dinâmico' : '⚠️ Estático'
                    }</span>
                  </div>
                )}
              </div>
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
