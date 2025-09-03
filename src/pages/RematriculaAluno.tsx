import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEnrollment } from "@/features/enrollment/context/EnrollmentContext";
import type { Desconto, Student, StatusDesconto } from "@/features/enrollment/types";
import { TIPOS_DESCONTO, SERIES_ANO, proximaSerie, valorBaseParaSerie, getDynamicNextSerie, getDynamicSerieValue } from "@/features/enrollment/constants";
import { usePublicSeries } from "@/features/admin/hooks/useSeries";
import { usePublicDiscountTypes } from "@/features/admin/hooks/useDiscountTypes";
import { mockDescontos, mockResponsaveis, mockStudents, mockMatriculas, mockEnderecos } from "@/data/mock";
import { useToast } from "@/hooks/use-toast";
import { DiscountChecklist } from "@/features/enrollment/components/DiscountChecklist";
import CepInfo from "@/features/enrollment/components/CepInfo";
import { classifyCep, classifyCepWithDynamic, describeCepClassWithDynamic, getCepDiscountPercentage, getCepDiscountCode } from "@/features/enrollment/utils/cep";
import { usePublicCepClassification } from "@/features/admin/hooks/useCepRanges";
// Removed FinalConfirmation in favor of summary flow

const RematriculaAluno = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { selectedStudent, setSelectedStudent, setMatricula, descontos, addDesconto, removeDesconto, matricula, setEnderecoAluno, enderecoAluno } = useEnrollment();
  
  // 🔄 MIGRAÇÃO PROGRESSIVA: Buscar dados dinâmicos
  const { data: dynamicSeries } = usePublicSeries();
  const { data: dynamicDiscountTypes } = usePublicDiscountTypes();
  const { data: dynamicCepClassification } = usePublicCepClassification(cep);
  
  // 🎯 FALLBACK: Dados disponíveis (dinâmicos ou estáticos)
  const availableSeries = useMemo(() => {
    if (dynamicSeries && dynamicSeries.length > 0) {
      return dynamicSeries.sort((a, b) => a.ordem - b.ordem);
    }
    return SERIES_ANO.map((nome, index) => ({
      id: `static_${index}`,
      nome,
      ano_serie: nome,
      valor_mensal_com_material: valorBaseParaSerie(nome) || 0,
      ordem: index + 1,
      escola: 'Sete de Setembro' as const,
      ativo: true
    }));
  }, [dynamicSeries]);

  const aluno: Student | undefined = useMemo(() => {
    if (selectedStudent && selectedStudent.id === id) return selectedStudent;
    return mockStudents.find((s) => s.id === id);
  }, [id, selectedStudent]);

  const serieAtual = useMemo(() => {
    if (!aluno) return undefined;
    const mats = mockMatriculas.filter((m) => m.student_id === aluno.id);
    if (mats.length === 0) return undefined;
    return mats.sort((a, b) => b.ano_letivo - a.ano_letivo)[0].serie_ano;
  }, [aluno]);

  const sugestaoProximaSerie = useMemo(() => {
    // 🔄 MIGRAÇÃO PROGRESSIVA: Usar dados dinâmicos se disponíveis
    return getDynamicNextSerie(serieAtual, dynamicSeries, true);
  }, [serieAtual, dynamicSeries]);

  useEffect(() => {
    // SEO basics
    const title = aluno ? `Rematrícula IESJE - ${aluno.nome_completo}` : "Rematrícula IESJE - Confirmação";
    document.title = title;
    const metaDesc = document.querySelector('meta[name="description"]') || document.createElement("meta");
    metaDesc.setAttribute("name", "description");
    metaDesc.setAttribute("content", "Confirmar e atualizar dados do aluno para rematrícula IESJE, incluindo descontos ativos.");
    document.head.appendChild(metaDesc);
    const canonical = document.querySelector('link[rel="canonical"]') || document.createElement("link");
    canonical.setAttribute("rel", "canonical");
    canonical.setAttribute("href", window.location.href);
    document.head.appendChild(canonical);
  }, [aluno]);

  useEffect(() => {
    if (aluno && (!selectedStudent || selectedStudent.id !== aluno.id)) {
      setSelectedStudent(aluno);
    }
  }, [aluno, selectedStudent, setSelectedStudent]);

  const [openPersonal, setOpenPersonal] = useState(false);
  const [openAcademic, setOpenAcademic] = useState(false);
  const [openDiscount, setOpenDiscount] = useState(false);

  // Comerciais (negociação)
  const [cep, setCep] = useState("");
  const [cepClass, setCepClass] = useState<"" | "fora" | "baixa" | "alta">("");
  const [applyCep, setApplyCep] = useState(false);
  const [adimplente, setAdimplente] = useState(false);
  const [comExtraPercent, setComExtraPercent] = useState<number>(0);
  const [comExtraMotivo, setComExtraMotivo] = useState<string>("");

  // Endereço do aluno
  const [openEndereco, setOpenEndereco] = useState(false);
  type EnderecoData = {
    cep?: string;
    logradouro?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    cidade?: string;
    uf?: string;
  };
  const [endereco, setEndereco] = useState<EnderecoData | null>(null);

  const personalSchema = z.object({
    nome_social: z.string().optional(),
    data_nascimento: z.string().optional(),
    sexo: z.string().optional(),
  });

  const enderecoSchema = z.object({
    cep: z.string().min(8, "Informe o CEP"),
    logradouro: z.string().min(1, "Informe a rua/avenida"),
    numero: z.string().min(1, "Informe o número"),
    complemento: z.string().optional(),
    bairro: z.string().min(1, "Informe o bairro"),
    cidade: z.string().min(1, "Informe a cidade"),
    uf: z.string().min(2, "UF inválida").max(2, "UF inválida"),
  });

  const academicSchema = z.object({
    serie_ano: z.string().min(1, "Informe a série/ano"),
    turno: z.string().min(1, "Selecione o turno"),
    valor_mensalidade_base: z.coerce.number().min(0, "Informe o valor base"),
  });

  const descontoSchema = z.object({
    tipoId: z.string().min(1, "Escolha o tipo"),
  });

  const formPersonal = useForm<z.infer<typeof personalSchema>>({
    resolver: zodResolver(personalSchema),
    defaultValues: {
      nome_social: aluno?.nome_social || "",
      data_nascimento: aluno?.data_nascimento || "",
      sexo: aluno?.sexo || "",
    },
  });

  const formEndereco = useForm<z.infer<typeof enderecoSchema>>({
    resolver: zodResolver(enderecoSchema),
    defaultValues: {
      cep: "",
      logradouro: "",
      numero: "",
      complemento: "",
      bairro: "",
      cidade: "Poços de Caldas",
      uf: "MG",
    },
  });

  const formAcademic = useForm<z.infer<typeof academicSchema>>({
    resolver: zodResolver(academicSchema),
    defaultValues: { serie_ano: matricula?.serie_ano ?? sugestaoProximaSerie ?? "", turno: matricula?.turno ?? "", valor_mensalidade_base: matricula?.valor_mensalidade_base ?? 0 },
  });

  // Preenche automaticamente a mensalidade base ao abrir o modal, se houver série definida e valor zerado
  useEffect(() => {
    const s = formAcademic.getValues("serie_ano");
    const baseAtual = Number(formAcademic.getValues("valor_mensalidade_base") || 0);
    if (openAcademic && s && (!baseAtual || baseAtual === 0)) {
      const base = getDynamicSerieValue(s, dynamicSeries, true);
      if (typeof base === "number" && base > 0) {
        formAcademic.setValue("valor_mensalidade_base", base, { shouldDirty: true, shouldValidate: true });
      }
    }
  }, [openAcademic, dynamicSeries, formAcademic]);

  const formDesconto = useForm<z.infer<typeof descontoSchema>>({
    resolver: zodResolver(descontoSchema),
    defaultValues: { tipoId: "" },
  });

  if (!aluno) {
    return (
      <main className="container py-12">
        <Card>
          <CardHeader>
            <CardTitle>Aluno não encontrado</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <p className="text-muted-foreground">Volte e selecione um aluno para continuar a rematrícula.</p>
            <Button onClick={() => navigate("/identificacao")}>Voltar</Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  const descontosDoAluno: Desconto[] = useMemo(
    () => [...(descontos as Desconto[]), ...mockDescontos.filter((d) => d.student_id === aluno.id)],
    [descontos, aluno.id]
  );

  useEffect(() => {
    const hasCEP = descontosDoAluno.some((d) => d.codigo_desconto === "CEP10" || d.codigo_desconto === "CEP5");
    const hasADIM = descontosDoAluno.some((d) => d.codigo_desconto === "ADIM2");
    setApplyCep(hasCEP);
    setAdimplente(hasADIM);
  }, [descontosDoAluno]);

  useEffect(() => {
    const cx = descontosDoAluno.find((d) => d.codigo_desconto === "COM_EXTRA");
    if (cx) {
      setComExtraPercent(cx.percentual_aplicado || 0);
      setComExtraMotivo(cx.observacoes || "");
    }
  }, [descontosDoAluno]);

  const responsaveis = useMemo(() => mockResponsaveis.filter((r) => r.student_id === aluno.id), [aluno.id]);

  const handleSavePersonal = formPersonal.handleSubmit((values) => {
    setSelectedStudent({ ...aluno, ...values });
    toast({ title: "Dados pessoais atualizados" });
    setOpenPersonal(false);
  });

  const handleSaveEndereco = formEndereco.handleSubmit((values) => {
    setEndereco(values);
    setEnderecoAluno(values);
    setOpenEndereco(false);
    const novoCep = values.cep || "";
    setCep(novoCep);
    const cls = classifyCepWithDynamic(novoCep, dynamicCepClassification, true);
    setCepClass(cls);
    if (applyCep) {
      addOrUpdateCepDiscount(cls);
    }
    const msg = describeCepClassWithDynamic(cls, dynamicCepClassification, true);
    toast({ title: "Endereço atualizado", description: msg });
  });

  const handleSaveAcademic = formAcademic.handleSubmit((values) => {
    setMatricula({ ...values });
    toast({ title: "Dados acadêmicos atualizados" });
    setOpenAcademic(false);
  });

  // ==== Descontos Comerciais helpers ====
  const findTipo = (codigo: string) => TIPOS_DESCONTO.find((t) => t.codigo === codigo);

// classifyCep moved to utils (imported)
  // Prefill from mocks when opening Rematrícula
  useEffect(() => {
    if (!aluno) return;

    // Dados pessoais
    formPersonal.reset({
      nome_social: aluno.nome_social || "",
      data_nascimento: aluno.data_nascimento || "",
      sexo: aluno.sexo || "",
    });

    // Endereço do aluno
    const addr = mockEnderecos.find((e) => e.student_id === aluno.id);
    if (addr) {
      setEndereco({
        cep: addr.cep,
        logradouro: addr.logradouro,
        numero: addr.numero || "",
        complemento: addr.complemento || "",
        bairro: addr.bairro,
        cidade: addr.cidade,
        uf: addr.uf,
      });
      setEnderecoAluno({
        cep: addr.cep,
        logradouro: addr.logradouro,
        numero: addr.numero || "",
        complemento: addr.complemento || "",
        bairro: addr.bairro,
        cidade: addr.cidade,
        uf: addr.uf,
      });
      formEndereco.reset({
        cep: addr.cep,
        logradouro: addr.logradouro,
        numero: addr.numero || "",
        complemento: addr.complemento || "",
        bairro: addr.bairro,
        cidade: addr.cidade,
        uf: addr.uf,
      });
      setCep(addr.cep);
      const cls = classifyCepWithDynamic(addr.cep, dynamicCepClassification, true);
      setCepClass(cls);
    }

    // Acadêmicos (próxima série e valor base)
    if (!matricula || !matricula.serie_ano) {
      const mats = mockMatriculas
        .filter((m) => m.student_id === aluno.id)
        .sort((a, b) => b.ano_letivo - a.ano_letivo);
      const last = mats[0];
      const prox = sugestaoProximaSerie || last?.serie_ano || "";
      const base = typeof prox === "string" ? getDynamicSerieValue(prox, dynamicSeries, true) : 0;
      const turno = last?.turno || "";
      const nextMat = {
        serie_ano: prox,
        turno,
        valor_mensalidade_base: typeof base === "number" ? base : 0,
      };
      setMatricula(nextMat);
      formAcademic.reset(nextMat);
    }
  }, [aluno?.id]);

  const addOrUpdateCepDiscount = (cls: "" | "fora" | "baixa" | "alta") => {
    // remove anteriores
    removeDesconto("CEP10");
    removeDesconto("CEP5");
    
    // 🎯 FALLBACK INTELIGENTE: Usar dados dinâmicos ou estáticos
    const percentual = getCepDiscountPercentage(cls, dynamicCepClassification, true);
    const codigo = getCepDiscountCode(cls, dynamicCepClassification);
    
    if (percentual > 0 && codigo) {
      const tipo = findTipo(codigo);
      if (tipo) {
        addDesconto({
          id: crypto.randomUUID(),
          student_id: aluno.id,
          tipo_desconto_id: tipo.id,
          codigo_desconto: tipo.codigo,
          percentual_aplicado: percentual,
          status_aprovacao: "SOLICITADO" as StatusDesconto,
          data_solicitacao: new Date().toISOString(),
        });
      }
    }
  };

  const onVerifyCep = () => {
    // 🎯 FALLBACK INTELIGENTE: Usar dados dinâmicos ou estáticos
    const cls = classifyCepWithDynamic(cep, dynamicCepClassification, true);
    setCepClass(cls);
    if (!cls) {
      toast({ title: "CEP inválido", description: "Informe um CEP com 8 dígitos." });
      return;
    }
    
    const msg = describeCepClassWithDynamic(cls, dynamicCepClassification, true);
    const dynamicIndicator = dynamicCepClassification?.categoria === cls ? " (Dados sincronizados)" : " (Dados locais)";
    
    toast({ 
      title: "Verificação de CEP", 
      description: `${msg}${dynamicIndicator}` 
    });
    if (applyCep) addOrUpdateCepDiscount(cls);
  };

  const onToggleCep = (checked: boolean) => {
    setApplyCep(checked);
    if (checked) {
      if (!cepClass) {
        toast({ title: "Verifique o CEP", description: "Confirme o CEP para aplicar o desconto por CEP." });
        return;
      }
      addOrUpdateCepDiscount(cepClass);
      toast({ title: "Desconto por CEP aplicado" });
    } else {
      removeDesconto("CEP10");
      removeDesconto("CEP5");
      toast({ title: "Desconto por CEP removido" });
    }
  };

  const onToggleAdimplente = (checked: boolean) => {
    setAdimplente(checked);
    if (checked) {
      // evita duplicar
      removeDesconto("ADIM2");
      const tipo = findTipo("ADIM2");
      if (tipo) {
        addDesconto({
          id: crypto.randomUUID(),
          student_id: aluno.id,
          tipo_desconto_id: tipo.id,
          codigo_desconto: tipo.codigo,
          percentual_aplicado: tipo.percentual_fixo ?? 2,
          status_aprovacao: "SOLICITADO" as StatusDesconto,
          data_solicitacao: new Date().toISOString(),
        });
        toast({ title: "Adimplente perfeito aplicado (2%)" });
      }
    } else {
      removeDesconto("ADIM2");
      toast({ title: "Adimplente perfeito removido" });
    }
  };

  const onApplyComExtra = () => {
    const pct = Number(comExtraPercent || 0);
    if (isNaN(pct) || pct <= 0 || pct > 20) {
      toast({ title: "Percentual inválido", description: "Informe um percentual entre 0 e 20%.", variant: "destructive" });
      return;
    }
    if (!comExtraMotivo?.trim()) {
      toast({ title: "Informe o motivo", description: "Descreva o motivo do desconto adicional.", variant: "destructive" });
      return;
    }
    // remove anterior
    removeDesconto("COM_EXTRA");
    const tipo = findTipo("COM_EXTRA");
    if (tipo && aluno) {
      addDesconto({
        id: crypto.randomUUID(),
        student_id: aluno.id,
        tipo_desconto_id: tipo.id,
        codigo_desconto: tipo.codigo,
        percentual_aplicado: pct,
        status_aprovacao: "SOLICITADO" as StatusDesconto,
        data_solicitacao: new Date().toISOString(),
        observacoes: comExtraMotivo.trim(),
      });
      toast({ title: "Desconto comercial extra aplicado", description: "A Diretoria Administrativa avaliará de forma mais contundente este desconto." });
    }
  };

  const handleSolicitarDesconto = formDesconto.handleSubmit(({ tipoId }) => {
    const tipo = TIPOS_DESCONTO.find((t) => t.id === tipoId);
    if (!tipo) return;
    const novo: Partial<Desconto> = {
      id: crypto.randomUUID(),
      student_id: aluno.id,
      tipo_desconto_id: tipo.id,
      codigo_desconto: tipo.codigo,
      percentual_aplicado: tipo.percentual_fixo ?? 0,
      status_aprovacao: "SOLICITADO" as StatusDesconto,
      data_solicitacao: new Date().toISOString(),
    };
    addDesconto(novo);
    toast({ title: "Solicitação enviada", description: `${tipo.descricao}` });
    setOpenDiscount(false);
    formDesconto.reset();
  });

  return (
    <main className="container py-8 space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold">{aluno.nome_completo}</h1>
          <p className="text-sm text-muted-foreground">CPF: {aluno.cpf}</p>
        </div>
        <Badge variant="secondary">REMATRÍCULA</Badge>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Dados Pessoais</CardTitle>
            <Button size="sm" variant="secondary" onClick={() => setOpenPersonal(true)}>Editar</Button>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div><span className="text-muted-foreground">Nome social: </span>{aluno.nome_social || "—"}</div>
            <div><span className="text-muted-foreground">Data de nascimento: </span>{aluno.data_nascimento || "—"}</div>
            <div><span className="text-muted-foreground">Sexo: </span>{aluno.sexo || "—"}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Endereço do Aluno</CardTitle>
            <Button size="sm" variant="secondary" onClick={() => setOpenEndereco(true)}>Editar</Button>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div><span className="text-muted-foreground">CEP: </span>{endereco?.cep || "—"}</div>
            <div><span className="text-muted-foreground">Logradouro: </span>{endereco?.logradouro || "—"}{endereco?.numero ? `, ${endereco.numero}` : ""}</div>
            <div><span className="text-muted-foreground">Bairro: </span>{endereco?.bairro || "—"}</div>
            <div><span className="text-muted-foreground">Cidade/UF: </span>{endereco ? `${endereco.cidade} - ${endereco.uf}` : "—"}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Acadêmicos</CardTitle>
            <Button size="sm" variant="secondary" onClick={() => setOpenAcademic(true)}>Editar</Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1 text-sm">
              <div><span className="text-muted-foreground">Série/Ano: </span>{matricula?.serie_ano || "—"}</div>
              <div><span className="text-muted-foreground">Turno: </span>{matricula?.turno || "—"}</div>
              <div><span className="text-muted-foreground">Mensalidade Base: </span>{matricula?.valor_mensalidade_base ? `R$ ${Number(matricula.valor_mensalidade_base).toFixed(2)}` : "—"}</div>
            </div>
            
            {/* 📊 Status da Sincronização */}
            <div className="pt-2 border-t flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center space-x-1">
                <div className={`w-1.5 h-1.5 rounded-full ${dynamicSeries?.length > 0 ? 'bg-green-500' : 'bg-yellow-500'}`} />
                <span>
                  {dynamicSeries?.length > 0 ? 
                    `✅ Séries sincronizadas (${dynamicSeries.length})` : 
                    `⚠️ Usando dados locais (${SERIES_ANO.length})`
                  }
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Responsáveis</CardTitle>
            {/* Poderíamos adicionar edição futura aqui */}
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {responsaveis.length === 0 && <p className="text-muted-foreground">Nenhum responsável cadastrado.</p>}
            {responsaveis.map((r) => (
              <div key={r.id} className="rounded-md border p-3">
                <div className="font-medium">{r.nome_completo}</div>
                <div className="text-xs text-muted-foreground">CPF: {r.cpf} • Tipo: {r.tipo}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Descontos Ativos</CardTitle>
            <Button size="sm" onClick={() => setOpenDiscount(true)}>Solicitar Novo Desconto</Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {descontosDoAluno.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum desconto ativo para este aluno.</p>
            )}
            {descontosDoAluno.map((d) => {
              const tipo = TIPOS_DESCONTO.find((t) => t.id === d.tipo_desconto_id || t.codigo === d.codigo_desconto);
              const status = d.status_aprovacao;
              return (
                <div key={d.id} className="flex items-start justify-between rounded-lg border p-3">
                  <div>
                    <div className="font-medium">{tipo?.descricao || d.codigo_desconto}</div>
                    <div className="text-xs text-muted-foreground">
                      Percentual: {d.percentual_aplicado}% • Solicitação: {new Date(d.data_solicitacao).toLocaleDateString()} • Validade: {d.data_vencimento ? new Date(d.data_vencimento).toLocaleDateString() : "—"}
                    </div>
                  </div>
                  <Badge variant={status === "APROVADO" ? "default" : status === "REJEITADO" ? "destructive" : "secondary"}>{status}</Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Descontos Comerciais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <CepInfo cep={cep} compact />
            <div>
              <Label>CEP do Aluno</Label>
              <div className="mt-1 flex gap-2">
                <Input placeholder="00000-000" value={cep} onChange={(e) => setCep(e.target.value)} />
                <Button type="button" variant="secondary" onClick={onVerifyCep}>Verificar CEP</Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {cepClass === "fora" && "Fora de Poços de Caldas — 10% elegível"}
                {cepClass === "baixa" && "Poços (bairro menor renda) — 5% elegível"}
                {cepClass === "alta" && "Poços (bairro maior renda) — sem desconto por CEP"}
                {!cepClass && "Informe e verifique o CEP para checar o benefício."}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-3">
                <Switch checked={applyCep} onCheckedChange={onToggleCep} disabled={!cepClass || cepClass === "alta"} />
                <div>
                  <div className="text-sm font-medium">Aplicar desconto por CEP</div>
                  <div className="text-xs text-muted-foreground">
                    {cepClass === "fora" && "Elegível: Fora de Poços (10%)"}
                    {cepClass === "baixa" && "Elegível: Bairro de menor renda (5%)"}
                    {(cepClass === "alta" || !cepClass) && "Sem elegibilidade por CEP para este endereço"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={adimplente} onCheckedChange={onToggleAdimplente} />
                <div>
                  <div className="text-sm font-medium">Adimplente perfeito (2%)</div>
                  <div className="text-xs text-muted-foreground">Pagamentos sempre no vencimento</div>
                </div>
              </div>
            </div>
            <div className="h-px bg-border" />
            <div className="space-y-2">
              <div className="text-sm font-medium">Desconto comercial extra (negociação)</div>
              <div className="grid gap-2 sm:grid-cols-3">
                <div>
                  <Label htmlFor="comextra">Percentual (%)</Label>
                  <Input id="comextra" type="number" min={0} max={20} step={1} value={comExtraPercent} onChange={(e) => setComExtraPercent(Number(e.target.value))} />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="motivo">Motivo do desconto</Label>
                  <Textarea id="motivo" rows={2} placeholder="Descreva o motivo da negociação" value={comExtraMotivo} onChange={(e) => setComExtraMotivo(e.target.value)} />
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">Ao aplicar, a Diretoria Administrativa avaliará de forma mais contundente o desconto.</p>
                <Button type="button" onClick={onApplyComExtra}>
                  Aplicar/Atualizar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Checklists de Documentos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {descontosDoAluno.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum desconto para validar.</p>
            )}
            {descontosDoAluno.map((d) => (
              <DiscountChecklist key={d.id} desconto={d} />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Confirmação</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Revise os dados acima e avance para o resumo final.</p>
            <Button
              onClick={() => navigate(`/rematricula/${id}/resumo`)}
              disabled={!selectedStudent || !matricula?.serie_ano || !matricula?.turno || Number(matricula?.valor_mensalidade_base || 0) <= 0}
            >
              Confirmar
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Modal Dados Pessoais */}
      <Dialog open={openPersonal} onOpenChange={setOpenPersonal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar dados pessoais</DialogTitle>
          </DialogHeader>
          <Form {...formPersonal}>
            <form onSubmit={handleSavePersonal} className="space-y-4">
              <FormField
                control={formPersonal.control}
                name="nome_social"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome social</FormLabel>
                    <FormControl>
                      <Input placeholder="Opcional" {...field} />
                    </FormControl>
                    <FormDescription>Como o aluno prefere ser chamado.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={formPersonal.control}
                name="data_nascimento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de nascimento</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={formPersonal.control}
                name="sexo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sexo</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="M">Masculino</SelectItem>
                        <SelectItem value="F">Feminino</SelectItem>
                        <SelectItem value="O">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="secondary" onClick={() => setOpenPersonal(false)}>Cancelar</Button>
                <Button type="submit">Salvar</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Modal Endereço */}
      <Dialog open={openEndereco} onOpenChange={setOpenEndereco}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar endereço do aluno</DialogTitle>
          </DialogHeader>
          <Form {...formEndereco}>
            <form onSubmit={handleSaveEndereco} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField control={formEndereco.control} name="cep" render={({ field }) => (
                  <FormItem>
                    <FormLabel>CEP</FormLabel>
                    <FormControl>
                      <Input placeholder="00000-000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={formEndereco.control} name="bairro" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bairro</FormLabel>
                    <FormControl>
                      <Input placeholder="Bairro" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={formEndereco.control} name="logradouro" render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Logradouro</FormLabel>
                    <FormControl>
                      <Input placeholder="Rua/Avenida" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={formEndereco.control} name="numero" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número</FormLabel>
                    <FormControl>
                      <Input placeholder="Nº" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={formEndereco.control} name="complemento" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Complemento</FormLabel>
                    <FormControl>
                      <Input placeholder="Apto, bloco, etc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={formEndereco.control} name="cidade" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cidade</FormLabel>
                    <FormControl>
                      <Input placeholder="Cidade" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={formEndereco.control} name="uf" render={({ field }) => (
                  <FormItem>
                    <FormLabel>UF</FormLabel>
                    <FormControl>
                      <Input placeholder="UF" maxLength={2} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <DialogFooter>
                <Button type="button" variant="secondary" onClick={() => setOpenEndereco(false)}>Cancelar</Button>
                <Button type="submit">Salvar</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Modal Acadêmicos */}
      <Dialog open={openAcademic} onOpenChange={setOpenAcademic}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar dados acadêmicos</DialogTitle>
          </DialogHeader>
          
          {/* 📊 Status da Sincronização */}
          <div className="flex items-center justify-between p-2 bg-muted/20 rounded-md text-xs mb-4">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${dynamicSeries?.length > 0 ? 'bg-green-500' : 'bg-yellow-500'}`} />
              <span>
                {dynamicSeries?.length > 0 ? 
                  `✅ Séries sincronizadas (${dynamicSeries.length} séries)` : 
                  `⚠️ Usando dados locais (${SERIES_ANO.length} séries)`
                }
              </span>
            </div>
          </div>
          <Form {...formAcademic}>
            <form onSubmit={handleSaveAcademic} className="space-y-4">
              <FormField
                control={formAcademic.control}
                name="serie_ano"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Série/Ano</FormLabel>
                    <Select value={field.value} onValueChange={(val) => {
                      field.onChange(val);
                      const base = getDynamicSerieValue(val, dynamicSeries, true);
                      if (typeof base === "number" && base > 0) {
                        formAcademic.setValue("valor_mensalidade_base", base, { shouldDirty: true, shouldValidate: true });
                      }
                    }}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="z-50">
                        {availableSeries.map((serie) => (
                          <SelectItem key={serie.id || serie.ano_serie} value={serie.ano_serie}>
                            <div className="flex items-center justify-between w-full">
                              <span>{serie.nome}</span>
                              <div className="flex items-center space-x-1 ml-2">
                                <Badge variant="outline" className="text-xs">
                                  R$ {serie.valor_mensal_com_material?.toFixed(2) || '0.00'}
                                </Badge>
                                {dynamicSeries?.length > 0 && (
                                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                    {serie.escola}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {serieAtual ? `Atual: ${serieAtual}. ` : ""}
                      {sugestaoProximaSerie ? `Sugerido: ${sugestaoProximaSerie}.` : ""}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={formAcademic.control}
                name="valor_mensalidade_base"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor mensalidade base (R$)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="Ex: 820.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={formAcademic.control}
                name="turno"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Turno</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Manhã">Manhã</SelectItem>
                        <SelectItem value="Tarde">Tarde</SelectItem>
                        <SelectItem value="Noite">Noite</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="secondary" onClick={() => setOpenAcademic(false)}>Cancelar</Button>
                <Button type="submit">Salvar</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Modal Solicitar Desconto */}
      <Dialog open={openDiscount} onOpenChange={setOpenDiscount}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitar novo desconto</DialogTitle>
          </DialogHeader>
          <Form {...formDesconto}>
            <form onSubmit={handleSolicitarDesconto} className="space-y-4">
              <FormField
                control={formDesconto.control}
                name="tipoId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de desconto</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TIPOS_DESCONTO.filter((t) => t.ativo).map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.codigo} • {t.descricao}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>Será aplicada a regra de aprovação definida para o tipo selecionado.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="secondary" onClick={() => setOpenDiscount(false)}>Cancelar</Button>
                <Button type="submit">Solicitar</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default RematriculaAluno;
