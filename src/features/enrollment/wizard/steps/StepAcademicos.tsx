import React, { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SERIES_ANO, valorBaseParaSerie } from "@/features/enrollment/constants";
import { usePublicSeries, getSerieBaseValue, type EscolaType } from "@/features/admin/hooks/useSeries";
import { useEnrollment } from "@/features/enrollment/context/EnrollmentContext";
import { getEscolaInfo } from "@/features/enrollment/constants/escolas";

const schema = z.object({
  serie_ano: z.string().min(1, "Informe a série/ano"),
  turno: z.string().min(1, "Selecione o turno"),
});

export type StepAcademicosValues = z.infer<typeof schema>;



interface Props { onNext: () => void; onPrev: () => void; onSave: (values: StepAcademicosValues) => void; }

const StepAcademicos: React.FC<Props> = ({ onNext, onPrev, onSave }) => {
  const { 
    escola, 
    setEscolaInfo, 
    updateDataUltimaAtualizacao, 
    generateProtocolo,
    protocolo 
  } = useEnrollment();
  
  // Mapear escola selecionada para formato do admin
  const escolaAdmin: EscolaType | undefined = useMemo(() => {
    if (!escola) return undefined;
    return escola === "pelicano" ? "Pelicano" : "Sete de Setembro";
  }, [escola]);
  
  // 🔄 MIGRAÇÃO PROGRESSIVA: Buscar dados dinâmicos do admin filtrados por escola
  const { data: dynamicSeries, isLoading: loadingSeries, error: seriesError } = usePublicSeries(escolaAdmin);
  
  // 🎯 FALLBACK INTELIGENTE: Usar dados estáticos se dinâmicos não disponíveis
  const availableSeries = useMemo(() => {
    if (dynamicSeries && dynamicSeries.length > 0) {
      console.log(`✅ Usando séries dinâmicas para ${escolaAdmin}: ${dynamicSeries.length} séries`);
      return dynamicSeries.sort((a, b) => a.ordem - b.ordem);
    }
    console.log('⚠️ Fallback: Usando séries estáticas');
    // Se não há escola selecionada, mostrar todas as séries estáticas
    return SERIES_ANO.map((nome, index) => ({
      id: `static_${index}`,
      nome,
      ano_serie: nome,
      valor_mensal_com_material: valorBaseParaSerie(nome) || 0,
      ordem: index + 1,
      escola: escolaAdmin || 'Sete de Setembro' as const,
      ativo: true
    }));
  }, [dynamicSeries, escolaAdmin]);

  const [selectedSerieData, setSelectedSerieData] = useState<typeof availableSeries[0] | null>(null);

  const form = useForm<StepAcademicosValues>({
    resolver: zodResolver(schema),
    defaultValues: { serie_ano: "", turno: "" },
    mode: "onChange",
  });

  // Função para obter valor base da série (dinâmica ou estática)
  const getValueForSerie = useMemo(() => (serieInput: string) => {
    if (dynamicSeries && dynamicSeries.length > 0) {
      return getSerieBaseValue(dynamicSeries, serieInput);
    }
    return valorBaseParaSerie(serieInput) || 0;
  }, [dynamicSeries]);




  const onSubmit = form.handleSubmit((values) => {
    // 🎯 SALVAR DADOS COMPLETOS DA SÉRIE SELECIONADA
    const serieCompleta = selectedSerieData || availableSeries.find(s => s.ano_serie === values.serie_ano);
    
    // 📋 CONFIGURAR INFORMAÇÕES DA ESCOLA
    if (escola) {
      const escolaInfo = getEscolaInfo(escola);
      if (escolaInfo) {
        setEscolaInfo(escolaInfo);
      }
    }
    
    // 🏷️ GERAR PROTOCOLO SE NÃO EXISTIR
    if (!protocolo) {
      generateProtocolo();
    }
    
    // ⏰ ATUALIZAR TIMESTAMP
    updateDataUltimaAtualizacao();
    
    const dadosCompletos = {
      ...values,
      // Dados da escola EXPANDIDOS
      escola_matricula: escola,
      escola_nome: escola === "pelicano" ? "IESJE - Unidade Pelicano" : "IESJE - Unidade Sete de Setembro",
      
      // Dados da série COMPLETOS
      serie_dados: serieCompleta ? {
        id: serieCompleta.id,
        nome: serieCompleta.nome,
        ano_serie: serieCompleta.ano_serie,
        valor_mensal_com_material: serieCompleta.valor_mensal_com_material,
        valor_material: serieCompleta.valor_material || (serieCompleta.valor_mensal_com_material * 0.15),
        valor_mensal_sem_material: serieCompleta.valor_mensal_sem_material || (serieCompleta.valor_mensal_com_material * 0.85),
        ordem: serieCompleta.ordem,
        escola: serieCompleta.escola,
        ativo: serieCompleta.ativo
      } : null,
      
      // Timestamps
      data_inicio_processo: new Date().toISOString(),
      data_ultima_atualizacao: new Date().toISOString(),
      
      // Status inicial
      status: "NOVA" as const,
      ano_letivo: new Date().getFullYear(),
      
      // Para compatibilidade com código existente
      valor_mensalidade_base: serieCompleta?.valor_mensal_com_material || 0
    };
    
    console.log('💾 Salvando dados acadêmicos completos:', dadosCompletos);
    
    onSave(dadosCompletos);
    onNext();
  });


  // Validar se escola foi selecionada
  if (!escola) {
    return (
      <div className="space-y-6">
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-yellow-500" />
            <span className="text-sm font-medium text-yellow-800">
              ⚠️ Escola não selecionada
            </span>
          </div>
          <p className="text-sm text-yellow-700 mt-2">
            Para continuar, é necessário selecionar uma escola na primeira etapa. 
            Use o botão "Voltar" para retornar e selecionar a escola.
          </p>
        </div>
        <div className="flex justify-between pt-2">
          <Button type="button" variant="outline" onClick={onPrev}>Voltar</Button>
          <Button disabled>Continuar (Escola obrigatória)</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 📊 Status da Sincronização e Escola */}
      <div className="space-y-2">
        {escola && (
          <div className="flex items-center justify-between p-2 bg-blue-50 rounded-md text-xs">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="font-medium">🏫 Escola selecionada: {escola === "pelicano" ? "Pelicano" : "Sete de Setembro"}</span>
            </div>
          </div>
        )}
        <div className="flex items-center justify-between p-2 bg-muted/20 rounded-md text-xs">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${dynamicSeries?.length > 0 ? 'bg-green-500' : 'bg-yellow-500'}`} />
            <span>
              {dynamicSeries?.length > 0 ? 
                `✅ Séries sincronizadas para ${escolaAdmin} (${dynamicSeries.length} séries)` : 
                `⚠️ Usando dados locais (${SERIES_ANO.length} séries)`
              }
            </span>
          </div>
          {loadingSeries && (
            <div className="animate-pulse text-blue-600">Carregando...</div>
          )}
        </div>
      </div>
      
      <Form {...form}>
        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="serie_ano" render={({ field }) => (
            <FormItem className="sm:col-span-1">
              <FormLabel>Série/Ano</FormLabel>
              <Select value={field.value} onValueChange={(val) => {
                field.onChange(val);
                
                // Encontrar dados completos da série selecionada
                const serieData = availableSeries.find(s => s.ano_serie === val);
                setSelectedSerieData(serieData || null);
              }}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a série/ano" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="z-50">
                  {loadingSeries ? (
                    <div className="p-2 text-center text-sm text-muted-foreground">
                      Carregando séries...
                    </div>
                  ) : availableSeries.map((serie) => (
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
                  {seriesError && (
                    <div className="p-2 text-center text-sm text-destructive">
                      Erro ao carregar. Usando dados locais.
                    </div>
                  )}
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
          
          {/* Detalhamento dos valores da série selecionada */}
          {selectedSerieData && (
            <div className="sm:col-span-2">
              <div className="p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border">
                <h4 className="font-semibold text-sm mb-3 flex items-center">
                  💰 Valores da Série: {selectedSerieData.nome}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                  <div className="flex flex-col items-center p-3 bg-white rounded-md shadow-sm">
                    <span className="text-xs text-muted-foreground mb-1">Mensal c/ Material</span>
                    <span className="font-bold text-lg text-green-600">
                      R$ {selectedSerieData.valor_mensal_com_material?.toFixed(2) || '0,00'}
                    </span>
                  </div>
                  <div className="flex flex-col items-center p-3 bg-white rounded-md shadow-sm">
                    <span className="text-xs text-muted-foreground mb-1">Valor do Material</span>
                    <span className="font-bold text-lg text-blue-600">
                      R$ {selectedSerieData.valor_material?.toFixed(2) || '0,00'}
                    </span>
                  </div>
                  <div className="flex flex-col items-center p-3 bg-white rounded-md shadow-sm">
                    <span className="text-xs text-muted-foreground mb-1">Mensal s/ Material</span>
                    <span className="font-bold text-lg text-purple-600">
                      R$ {selectedSerieData.valor_mensal_sem_material?.toFixed(2) || '0,00'}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  📝 Os valores são definidos pelo administrador e não podem ser alterados
                </p>
              </div>
            </div>
          )}
          
          <div className="sm:col-span-2 flex justify-between pt-2">
            <Button type="button" variant="outline" onClick={onPrev}>Voltar</Button>
            <Button type="submit">Continuar</Button>
          </div>
        </form>
      </Form>

    </div>
  );
};

export default StepAcademicos;
