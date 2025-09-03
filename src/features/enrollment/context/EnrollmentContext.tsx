import React, { createContext, useContext, useMemo, useState, useCallback, useEffect } from "react";
import type { Desconto, Matricula, Student, MatriculaCompleta, EscolaInfo, ResponsavelCompleto } from "../types";
import type { TrilhoNome, CalculoDesconto, TipoDesconto } from "@/lib/supabase";
import { useCalculatedTotals } from "../hooks/useCalculatedTotals";
import { migrateFullState, validateMigratedState, isLegacyState, logMigrationStatus } from "../utils/migrationHelpers";

/**
 * Estado refatorado - Fonte única de verdade com IDs apenas
 * Dados completos são obtidos via hooks centralizados
 */
interface EnrollmentState {
  // Fluxo e controle
  flow?: "rematricula" | "nova";
  step: number;
  
  // Dados da matrícula (objetos completos necessários)
  selectedStudent?: Student | null;
  escola?: "pelicano" | "sete_setembro" | null;
  matricula?: Partial<MatriculaCompleta>;
  enderecoAluno?: {
    cep?: string;
    logradouro?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    cidade?: string;
    uf?: string;
  };
  responsaveis?: {
    principal?: {
      nome_completo?: string;
      cpf?: string;
      telefone_principal?: string;
      email?: string;
      grau_parentesco?: string;
      profissao?: string;
      telefone_secundario?: string;
    };
    secundario?: {
      nome_completo?: string;
      cpf?: string;
      telefone_principal?: string;
      email?: string;
      grau_parentesco?: string;
      profissao?: string;
      telefone_secundario?: string;
    };
  };
  
  // ============================================================================
  // NOVO SISTEMA - APENAS IDs (Fonte única de verdade)
  // ============================================================================
  
  /** ID do trilho selecionado (A, B, C) */
  selectedTrackId: string | null;
  
  /** Array de IDs dos descontos selecionados */
  selectedDiscountIds: string[];
  
  /** Valor base para cálculos */
  valorBase: number;
  
  // ============================================================================
  // DADOS LEGADOS (Manter compatibilidade temporária)
  // ============================================================================
  descontos: Partial<Desconto>[]; // DEPRECATED: Usar selectedDiscountIds
  
  // Cálculos financeiros simplificados (dados obtidos via useCalculatedTotals)
  calculosFinanceiros?: {
    valorBaseComMaterial: number;
    valorBaseSemMaterial: number;
    valorMaterial: number;
    totalDescontoPercentual: number;
    totalDescontoValor: number;
    valorFinal: number;
    capUtilizado: number;
    capMaximo: number;
    capAtingido: boolean;
    descontosDetalhes: {
      codigo: string;
      descricao: string;
      percentual: number;
      valorDesconto: number;
      isBolsaIntegral: boolean;
    }[];
    // ============================================================================
    // FASE 2: INFORMAÇÕES APRIMORADAS DE CAP
    // ============================================================================
    temBolsaIntegral: boolean;
    explicacaoCAP: string;
    cenarioCAP: 'bolsa_integral' | 'bolsa_com_outros' | 'regulares_comerciais';
    ultimaAtualizacao: string;
  };
  // Sistema de Trilhos
  trilhos?: {
    trilho_escolhido?: TrilhoNome | null;
    trilho_sugerido?: TrilhoNome | null;
    descontos_aplicados?: TipoDesconto[];
    calculo_atual?: CalculoDesconto | null;
    valor_base?: number;
    tem_responsavel_secundario?: boolean;
  };
  
  // ============================================================================
  // DADOS EXPANDIDOS PARA RESUMO PROFISSIONAL  
  // ============================================================================
  
  // Informações da escola selecionada
  escolaInfo?: EscolaInfo;
  
  // Protocolo e timestamps
  protocolo?: string;
  dataInicioProcesso?: string;
  dataUltimaAtualizacao?: string;
  
  // Status e aprovações
  statusGeral?: "RASCUNHO" | "PENDENTE_APROVACAO" | "APROVADA" | "REJEITADA";
  aprovacaoStatus?: "PENDENTE" | "PARCIAL" | "COMPLETA";
  
  // Documentação
  documentosNecessarios?: string[];
  documentosPendentes?: string[];
  
  // Observações gerais
  observacoesGerais?: string;
}

/**
 * Ações refatoradas - Sistema baseado em IDs + hooks centralizados
 */
interface EnrollmentActions {
  // ============================================================================
  // AÇÕES BÁSICAS (mantidas)
  // ============================================================================
  setFlow: (f: EnrollmentState["flow"]) => void;
  setSelectedStudent: (s: Student | null) => void;
  setEscola: (escola: EnrollmentState["escola"]) => void;
  setMatricula: (m: Partial<MatriculaCompleta>) => void;
  setEnderecoAluno: (e: NonNullable<EnrollmentState["enderecoAluno"]>) => void;
  setResponsaveis: (r: NonNullable<EnrollmentState["responsaveis"]>) => void;
  nextStep: () => void;
  prevStep: () => void;
  reset: () => void;
  
  // ============================================================================
  // NOVO SISTEMA - AÇÕES BASEADAS EM IDs
  // ============================================================================
  
  /** Selecionar trilho por ID */
  setSelectedTrack: (trackId: string | null) => void;
  
  /** Limpar trilho selecionado */
  clearSelectedTrack: () => void;
  
  /** Adicionar ID de desconto */
  addDiscountId: (discountId: string) => void;
  
  /** Remover ID de desconto */
  removeDiscountId: (discountId: string) => void;
  
  /** Limpar todos os descontos */
  clearAllDiscounts: () => void;
  
  /** Definir valor base para cálculos */
  setValorBase: (valor: number) => void;
  
  /** Validar compatibilidade de desconto com trilho */
  validateDiscountCompatibility: (discountId: string) => boolean;
  
  /** Verificar se pode adicionar mais descontos */
  canAddMoreDiscounts: () => boolean;
  
  // ============================================================================
  // AÇÕES LEGADAS (compatibilidade temporária)
  // ============================================================================
  
  /** @deprecated Usar addDiscountId */
  addDesconto: (d: Partial<Desconto>) => void;
  
  /** @deprecated Usar removeDiscountId */
  removeDesconto: (codigo: string) => void;
  
  /** @deprecated Usar removeDiscountId */
  removeDescontoById: (id: string) => void;
  
  /** @deprecated Usar setSelectedTrack */
  setTrilhoEscolhido: (trilho: TrilhoNome | null) => void;
  
  /** @deprecated Sistema não usa mais */
  setTrilhoSugerido: (trilho: TrilhoNome | null) => void;
  
  /** @deprecated Sistema não usa mais */
  setDescontosAplicados: (descontos: TipoDesconto[]) => void;
  
  /** @deprecated Sistema não usa mais */
  setCalculoAtual: (calculo: CalculoDesconto | null) => void;
  
  /** @deprecated Sistema não usa mais */
  setTemResponsavelSecundario: (tem: boolean) => void;
  
  /** @deprecated Sistema não usa mais */
  updateTrilhos: (updates: Partial<NonNullable<EnrollmentState["trilhos"]>>) => void;
  
  // ============================================================================
  // AÇÕES PARA DADOS EXPANDIDOS
  // ============================================================================
  
  // Escola
  setEscolaInfo: (info: EscolaInfo) => void;
  
  // Protocolo e timestamps
  setProtocolo: (protocolo: string) => void;
  setDataInicioProcesso: (data: string) => void;
  updateDataUltimaAtualizacao: () => void;
  
  // Status
  setStatusGeral: (status: EnrollmentState["statusGeral"]) => void;
  setAprovacaoStatus: (status: EnrollmentState["aprovacaoStatus"]) => void;
  
  // Documentação
  setDocumentosNecessarios: (docs: string[]) => void;
  setDocumentosPendentes: (docs: string[]) => void;
  
  // Observações
  setObservacoesGerais: (obs: string) => void;
  
  // Função utilitária para gerar protocolo único
  generateProtocolo: () => string;
  
  // ============================================================================
  // AÇÕES PARA CÁLCULOS (refatoradas)
  // ============================================================================
  
  /** @deprecated Cálculos são feitos automaticamente via useCalculatedTotals */
  calculateAndStoreFinancials: () => void;
  
  /** @deprecated Cálculos são feitos automaticamente via useCalculatedTotals */
  recalculateFinancials: () => void;
}

const EnrollmentContext = createContext<(EnrollmentState & EnrollmentActions) | undefined>(
  undefined
);

export const EnrollmentProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  // ============================================================================
  // ESTADO REFATORADO - Apenas IDs + dados essenciais
  // ============================================================================
  const [state, setState] = useState<EnrollmentState>({ 
    step: 0,
    
    // Novo sistema baseado em IDs
    selectedTrackId: null,
    selectedDiscountIds: [],
    valorBase: 0,
    
    // Dados legados (compatibilidade temporária)
    descontos: [],
    trilhos: {
      trilho_escolhido: null,
      trilho_sugerido: null,
      descontos_aplicados: [],
      calculo_atual: null,
      valor_base: 0,
      tem_responsavel_secundario: false
    },
    // Inicializar novos campos
    statusGeral: "RASCUNHO",
    aprovacaoStatus: "PENDENTE",
    documentosNecessarios: [],
    documentosPendentes: [],
    dataInicioProcesso: new Date().toISOString(),
  });

  // ============================================================================
  // HOOK ÚNICO CENTRALIZADO - EVITA DUPLICAÇÃO E HOOK ORDER VIOLATION
  // ============================================================================
  
  // Hook ÚNICO para cálculos unificados - JÁ INCLUI trackData e discountsData internamente
  const { 
    totals: calculatedTotals, 
    isCalculating, 
    error: calculationError,
    isValid: calculationValid,
    hasWarnings,
    recalculate,
    // Dados adicionais do hook
    trackData,
    discountsData
  } = useCalculatedTotals(
    state.selectedTrackId || null,
    state.selectedDiscountIds || [],
    state.valorBase || 0
  );
  
  // Estados derivados para compatibilidade
  const isLoading = isCalculating;
  const hasErrors = !!(calculationError);

  // ============================================================================
  // MIGRAÇÃO AUTOMÁTICA - SISTEMA ANTIGO → NOVO
  // ============================================================================
  
  useEffect(() => {
    // Verificar se o estado atual precisa de migração
    if (isLegacyState(state)) {
      console.log('🔄 Detectado formato antigo, iniciando migração automática...');
      logMigrationStatus(state);
      
      try {
        const migratedState = migrateFullState(state);
        const validation = validateMigratedState(migratedState);
        
        if (validation.isValid) {
          console.log('✅ Migração bem-sucedida:', validation);
          
          // Aplicar estado migrado
          setState(prevState => ({
            ...prevState,
            selectedTrackId: migratedState.selectedTrackId,
            selectedDiscountIds: migratedState.selectedDiscountIds,
            valorBase: migratedState.valorBase,
          }));
          
          if (validation.warnings.length > 0) {
            console.warn('⚠️ Avisos na migração:', validation.warnings);
          }
        } else {
          console.error('❌ Migração falhou:', validation.errors);
        }
      } catch (error) {
        console.error('❌ Erro durante migração automática:', error);
      }
    }
  }, [state.descontos, state.trilhos, state.selectedDiscountIds]); // Executar quando dados relevantes mudarem
  
  // Sincronização automática do valor base
  useEffect(() => {
    const valorMatricula = Number(state.matricula?.serie_dados?.valor_mensal_sem_material || 0);
    if (valorMatricula > 0 && state.valorBase !== valorMatricula) {
      console.log('🔄 Sincronizando valor base:', valorMatricula);
      setState(s => ({ ...s, valorBase: valorMatricula }));
    }
  }, [state.matricula?.serie_dados?.valor_mensal_sem_material]); // ← REMOVIDO state.valorBase das dependências!

  const setFlow = useCallback<EnrollmentActions["setFlow"]>((f) => {
    setState((s) => (s.flow === f ? s : { ...s, flow: f }));
  }, []);

  const setSelectedStudent = useCallback<EnrollmentActions["setSelectedStudent"]>((selectedStudent) => {
    setState((s) => ({ ...s, selectedStudent }));
  }, []);

  const setEscola = useCallback<EnrollmentActions["setEscola"]>((escola) => {
    setState((s) => ({ ...s, escola }));
  }, []);

  const setMatricula = useCallback<EnrollmentActions["setMatricula"]>((m) => {
    setState((s) => ({ ...s, matricula: { ...s.matricula, ...m } }));
  }, []);

const setEnderecoAluno = useCallback<EnrollmentActions["setEnderecoAluno"]>((e) => {
  setState((s) => ({ ...s, enderecoAluno: { ...(s.enderecoAluno ?? {}), ...e } }));
}, []);

const setResponsaveis = useCallback<EnrollmentActions["setResponsaveis"]>((r) => {
  setState((s) => ({ ...s, responsaveis: { ...(s.responsaveis ?? {}), ...r } }));
}, []);

  const addDesconto = useCallback<EnrollmentActions["addDesconto"]>((d) => {
    setState((s) => ({ ...s, descontos: [...s.descontos, d] }));
  }, []);

  const removeDesconto = useCallback<EnrollmentActions["removeDesconto"]>((codigo) => {
    setState((s) => ({ ...s, descontos: s.descontos.filter((x) => x.codigo_desconto !== codigo) }));
  }, []);

  const removeDescontoById = useCallback<EnrollmentActions["removeDescontoById"]>((id) => {
    setState((s) => ({ ...s, descontos: s.descontos.filter((x) => x.id !== id) }));
  }, []);

  const nextStep = useCallback<EnrollmentActions["nextStep"]>(() => {
    setState((s) => ({ ...s, step: s.step + 1 }));
  }, []);

  const prevStep = useCallback<EnrollmentActions["prevStep"]>(() => {
    setState((s) => ({ ...s, step: Math.max(0, s.step - 1) }));
  }, []);

  const reset = useCallback<EnrollmentActions["reset"]>(() => {
    setState({ 
      step: 0, 
      // Novo sistema baseado em IDs
      selectedTrackId: null,
      selectedDiscountIds: [],
      valorBase: 0,
      // Dados legados (compatibilidade)
      descontos: [],
      trilhos: {
        trilho_escolhido: null,
        trilho_sugerido: null,
        descontos_aplicados: [],
        calculo_atual: null,
        valor_base: 0,
        tem_responsavel_secundario: false
      },
      // Reset dos outros campos
      statusGeral: "RASCUNHO",
      aprovacaoStatus: "PENDENTE",
      documentosNecessarios: [],
      documentosPendentes: [],
      dataInicioProcesso: new Date().toISOString(),
      dataUltimaAtualizacao: undefined,
      protocolo: undefined,
      escolaInfo: undefined,
      observacoesGerais: undefined,
    });
  }, []);

  // ============================================================================
  // NOVAS AÇÕES DO SISTEMA BASEADO EM IDs
  // ============================================================================

  const setSelectedTrack = useCallback<EnrollmentActions["setSelectedTrack"]>((trackId) => {
    setState(s => ({ 
      ...s, 
      selectedTrackId: trackId,
      // Sincronizar com sistema legado para compatibilidade
      trilhos: {
        ...s.trilhos,
        trilho_escolhido: trackId as any
      }
    }));
  }, []);

  const clearSelectedTrack = useCallback<EnrollmentActions["clearSelectedTrack"]>(() => {
    setState(s => ({ 
      ...s, 
      selectedTrackId: null,
      trilhos: {
        ...s.trilhos,
        trilho_escolhido: null
      }
    }));
  }, []);

  const addDiscountId = useCallback<EnrollmentActions["addDiscountId"]>((discountId) => {
    setState(s => {
      // Evitar duplicatas
      if (s.selectedDiscountIds.includes(discountId)) {
        return s;
      }
      return {
        ...s,
        selectedDiscountIds: [...s.selectedDiscountIds, discountId]
      };
    });
  }, []);

  const removeDiscountId = useCallback<EnrollmentActions["removeDiscountId"]>((discountId) => {
    setState(s => ({
      ...s,
      selectedDiscountIds: s.selectedDiscountIds.filter(id => id !== discountId)
    }));
  }, []);

  const clearAllDiscounts = useCallback<EnrollmentActions["clearAllDiscounts"]>(() => {
    setState(s => ({ 
      ...s, 
      selectedDiscountIds: [],
      // Limpar legado também
      descontos: []
    }));
  }, []);

  const setValorBase = useCallback<EnrollmentActions["setValorBase"]>((valor) => {
    setState(s => ({ ...s, valorBase: valor }));
  }, []);

  const validateDiscountCompatibility = useCallback<EnrollmentActions["validateDiscountCompatibility"]>((discountId) => {
    // DEBUG: Log da validação
    console.log('🔧 validateDiscountCompatibility:', {
      discountId,
      hasTrackData: !!trackData,
      hasDiscountsData: !!discountsData,
      discountsDataIds: discountsData?.map(d => d.id) || []
    });
    
    // Usar dados dos hooks para validação em tempo real
    if (!trackData || !discountsData) {
      console.log('✅ Validação: Dados não carregados, permitindo (true)');
      return true;
    }
    
    const discountData = discountsData.find(d => d?.id === discountId);
    if (!discountData) {
      console.log('⚠️ Validação: Desconto não encontrado nos dados dos hooks, mas permitindo (true)');
      // TEMPORÁRIO: Permitir mesmo se não encontrar nos hooks (pode estar nos dados estáticos)
      return true;
    }

    // Validação básica usando dados do hook useTrackData
    const isCompatible = trackData.restricoes?.tipos_desconto_excluidos 
      ? !trackData.restricoes.tipos_desconto_excluidos.includes(discountData.codigo)
      : true;
      
    console.log('🎯 Validação final:', { isCompatible, discountCode: discountData.codigo });

    return isCompatible;
  }, [trackData, discountsData]);

  const canAddMoreDiscounts = useCallback<EnrollmentActions["canAddMoreDiscounts"]>(() => {
    // Verificar se não excede limites razoáveis
    if (state.selectedDiscountIds.length >= 10) return false;
    
    // Se há bolsa integral, não permitir mais descontos
    if (calculatedTotals?.descontos.some(d => d.percentual_original === 100)) {
      return false;
    }

    return true;
  }, [state.selectedDiscountIds.length, calculatedTotals]);

  // Ações para trilhos
  const setTrilhoEscolhido = useCallback<EnrollmentActions["setTrilhoEscolhido"]>((trilho) => {
    setState((s) => ({
      ...s,
      trilhos: { ...s.trilhos, trilho_escolhido: trilho }
    }));
  }, []);

  const setTrilhoSugerido = useCallback<EnrollmentActions["setTrilhoSugerido"]>((trilho) => {
    setState((s) => ({
      ...s,
      trilhos: { ...s.trilhos, trilho_sugerido: trilho }
    }));
  }, []);

  const setDescontosAplicados = useCallback<EnrollmentActions["setDescontosAplicados"]>((descontos) => {
    setState((s) => ({
      ...s,
      trilhos: { ...s.trilhos, descontos_aplicados: descontos }
    }));
  }, []);

  const setCalculoAtual = useCallback<EnrollmentActions["setCalculoAtual"]>((calculo) => {
    setState((s) => ({
      ...s,
      trilhos: { ...s.trilhos, calculo_atual: calculo }
    }));
  }, []);

  const setTemResponsavelSecundario = useCallback<EnrollmentActions["setTemResponsavelSecundario"]>((tem) => {
    setState((s) => ({
      ...s,
      trilhos: { ...s.trilhos, tem_responsavel_secundario: tem }
    }));
  }, []);

  const updateTrilhos = useCallback<EnrollmentActions["updateTrilhos"]>((updates) => {
    setState((s) => ({
      ...s,
      trilhos: { ...s.trilhos, ...updates }
    }));
  }, []);

  // ============================================================================
  // IMPLEMENTAÇÃO DAS NOVAS AÇÕES
  // ============================================================================

  // Escola
  const setEscolaInfo = useCallback<EnrollmentActions["setEscolaInfo"]>((info) => {
    setState((s) => ({ ...s, escolaInfo: info }));
  }, []);

  // Protocolo e timestamps
  const setProtocolo = useCallback<EnrollmentActions["setProtocolo"]>((protocolo) => {
    setState((s) => ({ ...s, protocolo }));
  }, []);

  const setDataInicioProcesso = useCallback<EnrollmentActions["setDataInicioProcesso"]>((data) => {
    setState((s) => ({ ...s, dataInicioProcesso: data }));
  }, []);

  const updateDataUltimaAtualizacao = useCallback<EnrollmentActions["updateDataUltimaAtualizacao"]>(() => {
    setState((s) => ({ ...s, dataUltimaAtualizacao: new Date().toISOString() }));
  }, []);

  // Status
  const setStatusGeral = useCallback<EnrollmentActions["setStatusGeral"]>((status) => {
    setState((s) => ({ ...s, statusGeral: status }));
  }, []);

  const setAprovacaoStatus = useCallback<EnrollmentActions["setAprovacaoStatus"]>((status) => {
    setState((s) => ({ ...s, aprovacaoStatus: status }));
  }, []);

  // Documentação
  const setDocumentosNecessarios = useCallback<EnrollmentActions["setDocumentosNecessarios"]>((docs) => {
    setState((s) => ({ ...s, documentosNecessarios: docs }));
  }, []);

  const setDocumentosPendentes = useCallback<EnrollmentActions["setDocumentosPendentes"]>((docs) => {
    setState((s) => ({ ...s, documentosPendentes: docs }));
  }, []);

  // Observações
  const setObservacoesGerais = useCallback<EnrollmentActions["setObservacoesGerais"]>((obs) => {
    setState((s) => ({ ...s, observacoesGerais: obs }));
  }, []);

  // Função utilitária para gerar protocolo único
  const generateProtocolo = useCallback<EnrollmentActions["generateProtocolo"]>(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const time = String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0');
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    
    const protocolo = `IESJE${year}${month}${day}${time}${random}`;
    setProtocolo(protocolo);
    return protocolo;
  }, [setProtocolo]);

  // ============================================================================
  // FUNÇÕES LEGACY - MIGRAR DADOS PARA NOVO SISTEMA
  // ============================================================================
  
  /** @deprecated - Agora os cálculos são feitos automaticamente via useCalculatedTotals */
  const calculateAndStoreFinancials = useCallback<EnrollmentActions["calculateAndStoreFinancials"]>(() => {
    console.log('⚠️ DEPRECATED: calculateAndStoreFinancials - Cálculos são feitos via hooks');
    
    // Migrar dados legados para novo sistema se necessário
    const valorBaseSemMaterial = Number(state.matricula?.serie_dados?.valor_mensal_sem_material || 0);
    
    if (valorBaseSemMaterial > 0 && state.valorBase !== valorBaseSemMaterial) {
      setState(s => ({ ...s, valorBase: valorBaseSemMaterial }));
    }

    // Criar calculosFinanceiros a partir dos dados dos hooks (compatibilidade)
    if (calculatedTotals && !hasErrors) {
      const valorComMaterial = Number(state.matricula?.serie_dados?.valor_mensal_com_material || 0);
      const valorMaterial = Number(state.matricula?.serie_dados?.valor_material || 0);

      const calculosFinanceiros = {
        valorBaseComMaterial: valorComMaterial,
        valorBaseSemMaterial: calculatedTotals.valor_base,
        valorMaterial: valorMaterial,
        totalDescontoPercentual: calculatedTotals.percentual_aplicado,
        totalDescontoValor: calculatedTotals.valor_desconto,
        valorFinal: calculatedTotals.valor_final + valorMaterial,
        capUtilizado: calculatedTotals.percentual_aplicado,
        capMaximo: calculatedTotals.trilho_info.cap,
        capAtingido: calculatedTotals.trilho_info.cap_aplicado,
        descontosDetalhes: calculatedTotals.descontos.map(d => ({
          codigo: d.codigo,
          descricao: d.nome,
          percentual: d.percentual_aplicado,
          valorDesconto: d.valor_desconto,
          isBolsaIntegral: d.percentual_original === 100
        })),
        // Informações do novo sistema
        trilhoInfo: calculatedTotals.trilho_info,
        validacao: calculatedTotals.validacao,
        explicacaoCAP: `${calculatedTotals.trilho_info.nome} - CAP ${calculatedTotals.trilho_info.cap}%`,
        cenarioCAP: calculatedTotals.trilho_info.permite_bolsa_integral ? 'bolsa_integral' : 'regulares_comerciais',
        ultimaAtualizacao: calculatedTotals.metadata.calculado_em
      };

      setState(s => ({ ...s, calculosFinanceiros }));
    }
  }, [state.matricula, calculatedTotals, hasErrors, state.valorBase]);

  /** @deprecated - Cálculos são recalculados automaticamente quando dados mudam */
  const recalculateFinancials = useCallback<EnrollmentActions["recalculateFinancials"]>(() => {
    console.log('⚠️ DEPRECATED: recalculateFinancials - Use o hook recalculate');
    recalculate();
  }, [recalculate]);

  const value = useMemo(
    () => ({
      // Estado básico
      ...state,
      
      // ============================================================================
      // DADOS DOS HOOKS CENTRALIZADOS (FONTE ÚNICA DE VERDADE)
      // ============================================================================
      
      // Dados calculados em tempo real
      calculatedTotals,
      trackData,
      discountsData,
      
      // Estados dos hooks
      isLoading,
      hasErrors,
      calculationValid,
      hasWarnings,
      
      // ============================================================================
      // AÇÕES BÁSICAS
      // ============================================================================
      setFlow,
      setSelectedStudent,
      setEscola,
      setMatricula,
      setEnderecoAluno,
      setResponsaveis,
      nextStep,
      prevStep,
      reset,
      
      // ============================================================================
      // NOVAS AÇÕES DO SISTEMA BASEADO EM IDs
      // ============================================================================
      
      setSelectedTrack,
      clearSelectedTrack,
      addDiscountId,
      removeDiscountId,
      clearAllDiscounts,
      setValorBase,
      validateDiscountCompatibility,
      canAddMoreDiscounts,
      
      // Recalcular (do hook)
      recalculate,
      
      // ============================================================================
      // AÇÕES LEGADAS (compatibilidade temporária)
      // ============================================================================
      
      /** @deprecated Usar addDiscountId */
      addDesconto,
      /** @deprecated Usar removeDiscountId */
      removeDesconto,
      /** @deprecated Usar removeDiscountId */
      removeDescontoById,
      
      /** @deprecated Usar setSelectedTrack */
      setTrilhoEscolhido,
      /** @deprecated Sistema não usa mais */
      setTrilhoSugerido,
      /** @deprecated Sistema não usa mais */
      setDescontosAplicados,
      /** @deprecated Sistema não usa mais */
      setCalculoAtual,
      /** @deprecated Sistema não usa mais */
      setTemResponsavelSecundario,
      /** @deprecated Sistema não usa mais */
      updateTrilhos,
      
      // ============================================================================
      // OUTRAS AÇÕES
      // ============================================================================
      setEscolaInfo,
      setProtocolo,
      setDataInicioProcesso,
      updateDataUltimaAtualizacao,
      setStatusGeral,
      setAprovacaoStatus,
      setDocumentosNecessarios,
      setDocumentosPendentes,
      setObservacoesGerais,
      generateProtocolo,
      // Novas ações de cálculos centralizados
      calculateAndStoreFinancials,
      recalculateFinancials,
    }),
    [
      state, 
      setFlow, 
      setSelectedStudent, 
      setEscola, 
      setMatricula, 
      setEnderecoAluno, 
      setResponsaveis, 
      addDesconto, 
      removeDesconto, 
      removeDescontoById, 
      nextStep, 
      prevStep, 
      reset,
      setTrilhoEscolhido,
      setTrilhoSugerido,
      setDescontosAplicados,
      setCalculoAtual,
      setValorBase,
      setTemResponsavelSecundario,
      updateTrilhos,
      // Novas dependências
      setEscolaInfo,
      setProtocolo,
      setDataInicioProcesso,
      updateDataUltimaAtualizacao,
      setStatusGeral,
      setAprovacaoStatus,
      setDocumentosNecessarios,
      setDocumentosPendentes,
      setObservacoesGerais,
      generateProtocolo,
      // Novas dependências de cálculos centralizados
      calculateAndStoreFinancials,
      recalculateFinancials,
    ]
  );
  return <EnrollmentContext.Provider value={value}>{children}</EnrollmentContext.Provider>;
};

export const useEnrollment = () => {
  const ctx = useContext(EnrollmentContext);
  if (!ctx) throw new Error("useEnrollment deve ser usado dentro de EnrollmentProvider");
  return ctx;
};
