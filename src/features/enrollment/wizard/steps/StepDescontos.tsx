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
import CepInfo from "@/features/enrollment/components/CepInfo";
import TrackSelection from "@/features/enrollment/components/TrackSelection";
import { Switch } from "@/components/ui/switch";
import { useEnrollment } from "@/features/enrollment/context/EnrollmentContext";
import { TIPOS_DESCONTO } from "@/features/enrollment/constants";
import { usePublicDiscountTypes } from "@/features/admin/hooks/useDiscountTypes";
import type { Desconto } from "@/features/enrollment/types";
import { Trash2, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { generateProposalPdf } from "@/features/enrollment/utils/proposal-pdf";
import { classifyCep, describeCepClass, classifyCepWithDynamic, describeCepClassWithDynamic, getCepDiscountPercentage, getCepDiscountCode } from "@/features/enrollment/utils/cep";
import { usePublicCepClassification } from "@/features/admin/hooks/useCepRanges";
import { useFilteredEligibleDiscounts, useValidateDiscounts, type CepCategory } from "@/features/enrollment/hooks/useEligibleDiscounts";
import { getCategoryShortDescription } from "@/features/enrollment/utils/cepClassifier";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, AlertTriangle, CheckCircle } from "lucide-react";
const schema = z.object({ tipoId: z.string().min(1, "Selecione um tipo") });

interface Props { onPrev: () => void; onFinish: () => void; baseMensal: number; }

const StepDescontos: React.FC<Props> = ({ onPrev, onFinish, baseMensal }) => {
  // ============================================================================
  // NOVO SISTEMA - HOOKS CENTRALIZADOS + ESTADO MÍNIMO
  // ============================================================================
  
  const { 
    // Dados do novo sistema
    selectedTrackId,
    selectedDiscountIds,
    calculatedTotals,
    trackData,
    discountsData,
    isLoading: contextLoading,
    calculationValid,
    
    // Ações do novo sistema  
    setSelectedTrack,
    addDiscountId,
    removeDiscountId,
    setValorBase,
    validateDiscountCompatibility,
    canAddMoreDiscounts,
    
    // Dados básicos (mantidos)
    selectedStudent, 
    matricula, 
    enderecoAluno,
    
    // Ações legadas (compatibilidade temporária)
    addDesconto,
    removeDescontoById,
  } = useEnrollment();
  
  // Estados locais para compatibilidade durante transição
  const [local, setLocal] = useState<Desconto[]>([]);
  
  // Sincronizar com dados do contexto
  useEffect(() => {
    if (discountsData && discountsData.length > 0) {
      const contextDiscounts = discountsData.map(data => ({
        id: data.id,
        student_id: selectedStudent?.id || '',
        tipo_desconto_id: data.id,
        codigo_desconto: data.codigo,
        percentual_aplicado: data.percentual_efetivo,
        status_aprovacao: 'SOLICITADO',
        data_solicitacao: new Date().toISOString(),
      } as Desconto));
      setLocal(contextDiscounts);
    } else {
      setLocal([]);
    }
  }, [discountsData, selectedStudent?.id]);
  
  // Sincronizar valor base com context
  useEffect(() => {
    if (baseMensal > 0) {
      setValorBase(baseMensal);
    }
  }, [baseMensal, setValorBase]);
  
  // 🔄 BUSCAR DADOS DO ADMIN
  const { data: dynamicDiscountTypes, isLoading: loadingDiscountTypes, error: discountTypesError } = usePublicDiscountTypes();
  const { data: dynamicCepClassification, isLoading: loadingCep } = usePublicCepClassification(enderecoAluno?.cep);
  
  // 🎯 CLASSIFICAÇÃO CEP SIMPLES E DIRETA
  const cepInfo = useMemo(() => {
    if (!enderecoAluno?.cep) {
      return { categoria: null, isPocosDeCaldasrenda: false, isAltaRenda: false, isBaixaRenda: false };
    }
    
    const cepLimpo = enderecoAluno.cep.replace(/\D/g, '');
    if (cepLimpo.length !== 8) {
      return { categoria: null, isPocosDeCaldasrenda: false, isAltaRenda: false, isBaixaRenda: false };
    }
    
    const cepNumerico = parseInt(cepLimpo);
    
    // Definir as faixas de Poços de Caldas
    const isAltaRenda = (cepNumerico >= 37701000 && cepNumerico <= 37703999);
    const isBaixaRenda = (cepNumerico >= 37704000 && cepNumerico <= 37708999);
    const isPocosDeCaldasrenda = isAltaRenda || isBaixaRenda;
    
    let categoria: 'alta' | 'baixa' | 'fora' | null = null;
    if (isAltaRenda) categoria = 'alta';
    else if (isBaixaRenda) categoria = 'baixa';
    else categoria = 'fora';
    
    console.log('🏠 CEP Classificado:', {
      cep: enderecoAluno.cep,
      cepNumerico,
      categoria,
      isPocosDeCaldasrenda,
      isAltaRenda,
      isBaixaRenda
    });
    
    console.log('🔍 DEBUG DETALHADO:', {
      'CEP original': enderecoAluno.cep,
      'CEP limpo': cepLimpo,
      'CEP numérico': cepNumerico,
      'É Alta Renda?': isAltaRenda,
      'É Baixa Renda?': isBaixaRenda, 
      'É de Poços?': isPocosDeCaldasrenda,
      'Categoria final': categoria
    });
    
    return { categoria, isPocosDeCaldasrenda, isAltaRenda, isBaixaRenda };
  }, [enderecoAluno?.cep]);
  
  const { categoria: cepCategory, isPocosDeCaldasrenda, isAltaRenda, isBaixaRenda } = cepInfo;
  
  // 🎯 REGRAS SIMPLES E DIRETAS (EXATAMENTE COMO SOLICITADO)
  const availableDiscountTypes = useMemo(() => {
    const allDiscounts = dynamicDiscountTypes?.length > 0 ? dynamicDiscountTypes : TIPOS_DESCONTO;
    
    console.log('🔥 INICIANDO FILTRO DE DESCONTOS:', {
      totalDescontos: allDiscounts.length,
      isPocosDeCaldasrenda,
      isAltaRenda, 
      isBaixaRenda,
      cepAtual: enderecoAluno?.cep,
      categoria: cepCategory
    });
    
    console.log('🚨 ATENÇÃO: USANDO APENAS LÓGICA INTERNA - IGNORANDO HOOKS EXTERNOS');

    return allDiscounts.filter(discount => {
      const codigo = discount.codigo;
      
      console.log(`🧪 Testando desconto ${codigo}:`);
      
      // REGRA ESPECÍFICA PARA CEP5: NUNCA para CEP fora de Poços
      if (codigo === 'CEP5') {
        console.log(`🔍 TESTANDO CEP5 ESPECIFICAMENTE:`, {
          codigo,
          cepAtual: enderecoAluno?.cep,
          isPocosDeCaldasrenda,
          isAltaRenda,
          isBaixaRenda,
          categoria: cepCategory
        });
        
        if (!isPocosDeCaldasrenda) {
          console.log(`❌❌❌ BLOQUEANDO CEP5 - CEP FORA DE POÇOS (${enderecoAluno?.cep}) ❌❌❌`);
          console.log(`🚫 CEP5 NUNCA DEVE APARECER PARA CEP FORA DE POÇOS!`);
          return false;
        }
        if (isAltaRenda) {
          console.log(`❌ BLOQUEANDO CEP5 - ALTA RENDA (${enderecoAluno?.cep})`);
          return false;
        }
        if (isBaixaRenda) {
          console.log(`✅ PERMITINDO CEP5 - BAIXA RENDA (${enderecoAluno?.cep})`);
          return true;
        }
      }
      
      // REGRA 1: CEP de Poços de Caldas → NUNCA mostrar RES
      if (isPocosDeCaldasrenda && codigo === 'RES') {
        console.log('❌ Bloqueando RES - CEP de Poços de Caldas');
        return false;
      }
      
      // REGRA 2: CEP de Poços ALTA RENDA → NUNCA mostrar RES nem códigos que começam com CEP
      if (isAltaRenda) {
        if (codigo === 'RES') {
          console.log('❌ Bloqueando RES - Alta Renda');
          return false;
        }
        if (codigo.startsWith('CEP')) {
          console.log(`❌ Bloqueando ${codigo} - Alta Renda não pode ter descontos CEP`);
          return false;
        }
      }
      
      // REGRA 3: CEP de Poços BAIXA RENDA → NUNCA mostrar RES, MAS DEVE mostrar códigos CEP
      if (isBaixaRenda) {
        if (codigo === 'RES') {
          console.log('❌ Bloqueando RES - Baixa Renda');
          return false;
        }
        if (codigo.startsWith('CEP')) {
          console.log(`✅ Permitindo ${codigo} - Baixa Renda pode ter descontos CEP`);
          return true;
        }
      }
      
      // REGRA 4: CEP FORA de Poços → Pode ter RES e CEP10, MAS NUNCA CEP5
      if (!isPocosDeCaldasrenda) {
        if (codigo === 'CEP5') {
          console.log(`❌ NUNCA CEP5 PARA FORA DE POÇOS! (${enderecoAluno?.cep})`);
          return false;
        }
        console.log(`✅ Permitindo ${codigo} - Fora de Poços`);
        return true;
      }
      
      // Para outros descontos que não são RES nem CEP*, permitir normalmente
      console.log(`✅ Permitindo ${codigo} - regra geral`);
      return true;
    });
  }, [dynamicDiscountTypes, isPocosDeCaldasrenda, isAltaRenda, isBaixaRenda]);
  
  // 🎯 ESTATÍSTICAS SIMPLES
  const allDiscounts = dynamicDiscountTypes?.length > 0 ? dynamicDiscountTypes : TIPOS_DESCONTO;
  const eligibilityStats = {
    total: allDiscounts.length,
    eligible: availableDiscountTypes.length,
    blocked: allDiscounts.length - availableDiscountTypes.length,
    automatic: 0
  };
  
  // 🎯 DESCONTOS BLOQUEADOS (para mostrar na interface)
  const blockedDiscounts = allDiscounts.filter(d => 
    !availableDiscountTypes.some(a => a.codigo === d.codigo)
  );
  
  // 🎯 DESCONTOS AUTOMÁTICOS SIMPLES
  const automaticDiscounts = useMemo(() => {
    if (isBaixaRenda) return ['CEP5'];
    if (!isPocosDeCaldasrenda) return ['CEP10'];
    return [];
  }, [isBaixaRenda, isPocosDeCaldasrenda]);

  const form = useForm<{ tipoId: string }>({ resolver: zodResolver(schema), defaultValues: { tipoId: "" } });
  const { toast } = useToast();
  const watchedTipoId = form.watch("tipoId");
  const selectedTipo = useMemo(() => availableDiscountTypes.find((t) => t.id === watchedTipoId), [watchedTipoId, availableDiscountTypes]);
  const isDuplicate = useMemo(() => {
    if (!selectedTipo) return false;
    return selectedDiscountIds.some(id => {
      const discountData = discountsData?.find(d => d.id === id);
      return discountData?.codigo === selectedTipo.codigo;
    });
  }, [selectedTipo, selectedDiscountIds, discountsData]);
  const handleAdd = form.handleSubmit(({ tipoId }) => {
    const tipo = availableDiscountTypes.find((t) => t.id === tipoId);
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
    
    // 🎯 VALIDAÇÃO: Já foi filtrado, mas vamos fazer dupla verificação
    console.log(`➕ Adicionando desconto: ${tipo.codigo} para CEP ${enderecoAluno?.cep}`)
    
    // Se chegou aqui, o desconto é elegível e pode ser adicionado
    // DEBUG: Verificar dados antes da validação
    console.log('🔍 DEBUG VALIDAÇÃO:', {
      tipoId: tipo.id,
      tipoCodigo: tipo.codigo,
      discountsData: discountsData,
      trackData: trackData,
      selectedTrackId: selectedTrackId
    });
    
    // Usar novo sistema baseado em IDs
    const isCompatible = validateDiscountCompatibility(tipo.id);
    console.log('🎯 RESULTADO VALIDAÇÃO:', { tipoId: tipo.id, isCompatible });
    
    if (!isCompatible) {
      console.log('❌ DESCONTO BLOQUEADO POR VALIDAÇÃO:', tipo.codigo);
      toast({ title: "Desconto incompatível", description: `${tipo.codigo} não é compatível com o trilho selecionado.`, variant: "destructive" });
      return;
    }
    
    console.log('✅ ADICIONANDO DESCONTO:', tipo.codigo);
    addDiscountId(tipo.id);
    console.log('📋 IDs APÓS ADIÇÃO:', selectedDiscountIds);
    form.reset();
    toast({ title: "Desconto adicionado", description: `${tipo.codigo} • ${tipo.descricao}` });
  });

  const canFinish = useMemo(() => baseMensal > 0, [baseMensal]);

  const comExtra = useMemo(() => {
    const comExtraId = selectedDiscountIds.find(id => {
      const discountData = discountsData?.find(d => d.id === id);
      return discountData?.codigo === "COM_EXTRA";
    });
    if (comExtraId) {
      const discountData = discountsData?.find(d => d.id === comExtraId);
      return discountData ? {
        id: comExtraId,
        codigo_desconto: discountData.codigo,
        percentual_aplicado: discountData.percentual_efetivo,
        observacoes: discountData.metadata?.observacoes || ''
      } : null;
    }
    return null;
  }, [selectedDiscountIds, discountsData]);
  const [comExtraPct, setComExtraPct] = useState<number>(0);
  const [comExtraMotivo, setComExtraMotivo] = useState<string>("");

  useEffect(() => {
    if (comExtra) {
      setComExtraPct(comExtra.percentual_aplicado || 0);
      setComExtraMotivo(comExtra.observacoes || "");
    }
  }, [comExtra?.id]);

  // 🎯 VALIDAÇÃO SIMPLES EM TEMPO REAL: Remover descontos que não deveriam estar
  useEffect(() => {
    if (!cepCategory) return;
    
    const toRemoveIds: string[] = [];
    
    selectedDiscountIds.forEach(discountId => {
      const discountData = discountsData?.find(d => d.id === discountId);
      if (!discountData) return;
      
      const codigo = discountData.codigo;
      let shouldRemove = false;
      
      // Aplicar as mesmas regras do filtro
      if (isPocosDeCaldasrenda && codigo === 'RES') {
        shouldRemove = true;
        console.log('🚫 Removendo RES - CEP de Poços');
      }
      
      if (isAltaRenda && (codigo === 'RES' || codigo.startsWith('CEP'))) {
        shouldRemove = true;
        console.log(`🚫 Removendo ${codigo} - Alta Renda`);
      }
      
      if (isBaixaRenda && codigo === 'RES') {
        shouldRemove = true;
        console.log('🚫 Removendo RES - Baixa Renda');
      }
      
      if (shouldRemove) {
        toRemoveIds.push(discountId);
      }
    });
    
    if (toRemoveIds.length > 0) {
      toRemoveIds.forEach(discountId => {
        removeDiscountId(discountId);
      });
      
      const categoryDesc = isAltaRenda ? 'Alta Renda' : isBaixaRenda ? 'Baixa Renda' : 'Fora de Poços';
      
      toast({
        title: `${toRemoveIds.length} desconto(s) removido(s)`,
        description: `Descontos incompatíveis com ${categoryDesc} foram removidos automaticamente`,
        variant: "destructive",
      });
    }
  }, [cepCategory, isPocosDeCaldasrenda, isAltaRenda, isBaixaRenda, selectedDiscountIds, discountsData, removeDiscountId, toast]);

  const handleRemove = (discountId: string) => {
    removeDiscountId(discountId);
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
    const tipo = availableDiscountTypes.find((t) => t.codigo === "COM_EXTRA");
    if (!tipo || !selectedStudent) return;
    if (comExtra) {
      // remove existente primeiro
      handleRemove(comExtra.id);
    }
    
    // Usar novo sistema baseado em IDs
    addDiscountId(tipo.id);
    toast({ title: "Desconto comercial extra aplicado", description: "A Diretoria Administrativa avaliará de forma mais contundente este desconto." });
  };

  // === Desconto por CEP com dados dinâmicos (toggle) ===
  const cepClass = useMemo(() => {
    return classifyCepWithDynamic(enderecoAluno?.cep, dynamicCepClassification, true);
  }, [enderecoAluno?.cep, dynamicCepClassification]);
  
  const cepDiscountPercentage = useMemo(() => {
    return getCepDiscountPercentage(cepClass, dynamicCepClassification, true);
  }, [cepClass, dynamicCepClassification]);
  
  const cepDiscountCode = useMemo(() => {
    return getCepDiscountCode(cepClass, dynamicCepClassification);
  }, [cepClass, dynamicCepClassification]);
  
  const hasCepDiscount = useMemo(() => {
    return selectedDiscountIds.some(id => {
      const discountData = discountsData?.find(d => d.id === id);
      return discountData?.codigo === "CEP10" || discountData?.codigo === "CEP5";
    });
  }, [selectedDiscountIds, discountsData]);
  
  const isCepEligible = cepDiscountPercentage > 0;
  const findTipo = (codigo: string) => availableDiscountTypes.find((t) => t.codigo === codigo);

  const removeCepDiscounts = () => {
    const toRemoveIds = selectedDiscountIds.filter(id => {
      const discountData = discountsData?.find(d => d.id === id);
      return discountData?.codigo === "CEP10" || discountData?.codigo === "CEP5";
    });
    if (toRemoveIds.length) {
      toRemoveIds.forEach(id => removeDiscountId(id));
    }
  };

  const applyCepDiscount = () => {
    if (!selectedStudent) {
      toast({ title: "Selecione o aluno", description: "Você precisa selecionar um aluno.", variant: "destructive" });
      return;
    }
    if (!isCepEligible) {
      const description = describeCepClassWithDynamic(cepClass, dynamicCepClassification, true);
      toast({ title: "Não elegível por CEP", description, variant: "destructive" });
      return;
    }
    const code = cepDiscountCode;
    if (!code) return;
    
    const tipo = findTipo(code);
    if (!tipo) return;
    removeCepDiscounts();
    // Usar novo sistema baseado em IDs
    addDiscountId(tipo.id);
    
    const description = describeCepClassWithDynamic(cepClass, dynamicCepClassification, true);
    const dynamicIndicator = dynamicCepClassification?.categoria === cepClass ? " (Dados sincronizados)" : " (Dados locais)";
    toast({ 
      title: "Desconto por CEP aplicado", 
      description: `${description}${dynamicIndicator}` 
    });
  };

  const onToggleCep = (checked: boolean) => {
    if (checked) {
      applyCepDiscount();
    } else {
      removeCepDiscounts();
      toast({ title: "Desconto por CEP removido" });
    }
  };

  // Trilho é gerenciado automaticamente pelo novo sistema através de selectedTrackId

  return (
    <div className="space-y-6">
      <div className="rounded-md border p-3">
        <CepInfo cep={enderecoAluno?.cep} compact />
      </div>
      
      {/* SELEÇÃO DE TRILHO */}
      <div className="space-y-2">
        <Label>Selecione o Trilho de Desconto</Label>
        <TrackSelection 
          selectedTrack={selectedTrackId}
          onTrackSelect={(trackId) => setSelectedTrack(trackId)}
          descontos={local as any}
          valorBase={baseMensal}
        />
      </div>
      
      {/* 📊 Status do Sistema - REGRAS SIMPLES ATIVAS */}
      <div className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded-md text-xs">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-green-800">
            ✅ Regras de elegibilidade ativas: {availableDiscountTypes.length} descontos disponíveis
            {cepCategory && (
              <span className="ml-2 font-medium">
                ({isAltaRenda ? 'Alta Renda' : isBaixaRenda ? 'Baixa Renda' : isPocosDeCaldasrenda ? 'Poços' : 'Fora de Poços'})
              </span>
            )}
          </span>
        </div>
        {loadingDiscountTypes && (
          <div className="animate-pulse text-blue-600">Carregando...</div>
        )}
      </div>

      {/* 🎯 REGRAS APLICADAS */}
      {cepCategory && (
        <Alert className="border-blue-200 bg-blue-50">
          <Info className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <div className="font-medium">Regras aplicadas para seu CEP:</div>
              
              {isPocosDeCaldasrenda && (
                <div className="text-sm">
                  <span className="font-medium text-red-600">Bloqueado:</span> RES (exclusivo para outras cidades)
                </div>
              )}
              
              {isAltaRenda && (
                <div className="text-sm">
                  <span className="font-medium text-red-600">Bloqueados:</span> RES e descontos CEP* (área de alta renda)
                </div>
              )}
              
              {isBaixaRenda && (
                <div className="text-sm">
                  <span className="font-medium text-green-600">Disponível:</span> Descontos CEP* (área de menor renda)
                </div>
              )}
              
              {!isPocosDeCaldasrenda && (
                <div className="text-sm">
                  <span className="font-medium text-green-600">Disponível:</span> RES e descontos CEP* (fora de Poços)
                </div>
              )}
              
              {/* Descontos automáticos */}
              {automaticDiscounts.length > 0 && (
                <div className="text-sm text-blue-700 border-t pt-2">
                  <CheckCircle className="h-3 w-3 inline mr-1" />
                  Desconto automático disponível: {automaticDiscounts.join(', ')}
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* ⚠️ SISTEMA NÃO CONFIGURADO */}
      {!cepCategory && enderecoAluno?.cep && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              <p className="font-medium">Sistema de classificação CEP não configurado</p>
              <p className="text-sm">CEP <code>{enderecoAluno.cep}</code> não pode ser classificado. Todos os descontos estão disponíveis.</p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* ⚠️ ALERTA DE DESCONTOS BLOQUEADOS */}
      {blockedDiscounts.length > 0 && cepCategory && (
        <Alert variant="destructive" className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">
                {blockedDiscounts.length} desconto(s) bloqueado(s) pelas regras de elegibilidade:
              </p>
              <div className="flex flex-wrap gap-2">
                {blockedDiscounts.map(discount => (
                  <Badge key={discount.codigo} variant="outline" className="text-xs bg-orange-50 text-orange-700">
                    {discount.codigo} - {discount.descricao || discount.nome}
                  </Badge>
                ))}
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}
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
                  {loadingDiscountTypes ? (
                    <div className="p-2 text-center text-sm text-muted-foreground">
                      Carregando tipos de desconto...
                    </div>
                  ) : (
                    <>
                      {/* Mostrar apenas descontos elegíveis (já filtrados pelas regras) */}
                      {availableDiscountTypes.filter((t) => t.ativo).map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{t.codigo} • {t.descricao || t.nome}</span>
                            {automaticDiscounts.includes(t.codigo) && (
                              <Badge variant="default" className="text-xs">
                                Automático
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </>
                  )}
                  {discountTypesError && (
                    <div className="p-2 text-center text-sm text-destructive">
                      Erro ao carregar. Usando dados locais.
                    </div>
                  )}
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
          <Badge variant="secondary">{selectedDiscountIds.length}</Badge>
        </div>
        {selectedDiscountIds.length === 0 && <p className="text-sm text-muted-foreground">Nenhum desconto selecionado.</p>}
        <div className="space-y-3">
          {selectedDiscountIds.map((discountId) => {
            const discountData = discountsData?.find(d => d.id === discountId);
            if (!discountData) return null;
            
            // Criar objeto desconto compatível para DiscountChecklist
            const discountCompat: Desconto = {
              id: discountId,
              student_id: selectedStudent?.id || '',
              tipo_desconto_id: discountId,
              codigo_desconto: discountData.codigo,
              percentual_aplicado: discountData.percentual_efetivo,
              status_aprovacao: 'SOLICITADO',
              data_solicitacao: new Date().toISOString(),
            } as any;
            
            return (
              <div key={discountId} className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-2"
                  aria-label="Excluir desconto"
                  type="button"
                  onClick={() => handleRemove(discountId)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <DiscountChecklist desconto={discountCompat} />
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="font-semibold">Desconto por CEP</h3>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Switch checked={hasCepDiscount} onCheckedChange={onToggleCep} disabled={!isCepEligible} />
            <div>
              <div className="text-sm font-medium">Aplicar desconto por CEP</div>
              <div className="text-xs text-muted-foreground">{describeCepClass(cepClass)}</div>
            </div>
          </div>
          {isCepEligible && (
            <Badge variant="secondary">{cepClass === "fora" ? "10% (CEP10)" : "5% (CEP5)"}</Badge>
          )}
        </div>
        {!isCepEligible && (
          <p className="text-xs text-muted-foreground">Sem elegibilidade por CEP no endereço informado.</p>
        )}
        <div className="h-px bg-border" />
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
        {/* DiscountSummary agora usa dados do contexto através dos hooks */}
        <DiscountSummary baseMensal={baseMensal} descontos={local as any} />
        
        {/* Mostrar cálculos do novo sistema se disponíveis */}
        {calculatedTotals && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
            <h4 className="font-medium text-green-800 mb-2">✅ Cálculos Unificados (Novo Sistema)</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Subtotal:</span> {calculatedTotals.subtotal_percentual}%
              </div>
              <div>
                <span className="text-gray-600">Aplicado:</span> {calculatedTotals.percentual_aplicado}%
              </div>
              <div>
                <span className="text-gray-600">Valor Final:</span> R$ {calculatedTotals.valor_final.toFixed(2)}
              </div>
              <div>
                <span className="text-gray-600">Trilho:</span> {calculatedTotals.trilho_info?.nome} (CAP: {calculatedTotals.trilho_info?.cap || 'Ilimitado'}%)
              </div>
            </div>
          </div>
        )}
        
        {!canFinish && (
          <p className="text-sm text-muted-foreground mt-2">
            Informe o valor base da mensalidade no passo "Acadêmicos" para concluir.
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
