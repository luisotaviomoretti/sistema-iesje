import React, { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  RefreshCw,
  AlertCircle,
  CheckCircle,
} from "lucide-react"

import { TrackSelector } from "@/features/enrollment/components/TrackCard"
import { CapProgressBar } from "@/features/enrollment/components/CapProgressBar"
import { RealTimeCalculator, type CalculationResult } from "@/features/enrollment/components/RealTimeCalculator"
import { DiscountFilter } from "@/features/enrollment/components/DiscountFilter"
import { DiscountChecklist } from "@/features/enrollment/components/DiscountChecklist"
import CepInfo from "@/features/enrollment/components/CepInfo"

import { useEnrollment } from "@/features/enrollment/context/EnrollmentContext"
import { usePublicTrilhos } from "@/features/admin/hooks/useTrilhos"
import { useDescontosCompativeis } from "@/features/admin/hooks/useTrilhos"
import { useCurrentCapConfig } from "@/features/admin/hooks/useTrilhos"
import { usePublicDiscountTypes } from "@/features/admin/hooks/useDiscountTypes"
import { usePublicCepClassification } from "@/features/admin/hooks/useCepRanges"

import { useToast } from "@/hooks/use-toast"
import { generateProposalPdf } from "@/features/enrollment/utils/proposal-pdf"
import { getCepDiscountPercentage, getCepDiscountCode } from "@/features/enrollment/utils/cep"
import type { Desconto } from "@/features/enrollment/types"
import type { TrilhoDesconto } from "@/lib/supabase"

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

interface SerieValues {
  valorComMaterial: number
  valorMaterial: number
  valorSemMaterial: number
}

interface StepDescontosV2Props {
  onPrev: () => void
  onFinish: () => void
  serieValues: SerieValues
}

interface WizardStep {
  id: string
  title: string
  description: string
  completed: boolean
}

// ============================================================================
// COMPONENTE PRINCIPAL - STEP DESCONTOS V2 (COM TRILHOS)
// ============================================================================

const StepDescontosV2: React.FC<StepDescontosV2Props> = ({ 
  onPrev, 
  onFinish, 
  serieValues 
}) => {
  // Hooks do contexto
  const { 
    descontos, 
    addDesconto, 
    removeDesconto,
    removeDescontoById,
    setTrilhoEscolhido,
    updateTrilhos,
    updateDataUltimaAtualizacao,
    selectedStudent, 
    matricula, 
    enderecoAluno,
    escola,
    // FASE 3: Conectar ao sistema centralizado
    calculateAndStoreFinancials,
    recalculateFinancials
  } = useEnrollment()
  
  const { toast } = useToast()

  // Estados locais
  const [currentStep, setCurrentStep] = useState<string>('track-selection')
  const [selectedTrack, setSelectedTrack] = useState<string | null>(null)
  const [selectedDiscounts, setSelectedDiscounts] = useState<Desconto[]>(descontos as Desconto[])
  const [calculation, setCalculation] = useState<CalculationResult>({
    valorBase: serieValues.valorSemMaterial,
    totalDesconto: 0,
    valorDesconto: 0,
    valorFinal: serieValues.valorSemMaterial,
    economia: 0,
    isValid: true,
    warnings: [],
    breakdown: []
  })

  // Queries para dados dinâmicos
  const { data: trilhos, isLoading: loadingTrilhos } = usePublicTrilhos()

  // 🧹 LIMPEZA: Limpar descontos antigos ao entrar no step
  useEffect(() => {
    console.log('🧹 StepDescontosV2 - Limpando descontos antigos do contexto');
    
    // Limpar todos os descontos do contexto para começar do zero
    descontos.forEach(desconto => {
      if (desconto.codigo_desconto) {
        removeDesconto(desconto.codigo_desconto);
      }
      if (desconto.id) {
        removeDescontoById(desconto.id);
      }
    });
    
    // Resetar estados locais também
    setSelectedDiscounts([]);
    setSelectedTrack(null);
    setCurrentStep('track-selection');
    
  }, []); // Executar apenas ao montar o componente
  const { data: capConfig, isLoading: loadingCaps } = useCurrentCapConfig()
  const { data: discountTypes, isLoading: loadingDiscounts } = usePublicDiscountTypes()
  const { data: compatibleDiscounts, isLoading: loadingCompatible } = useDescontosCompativeis(selectedTrack as any)
  // 🚫 DESABILITADO: Classificação dinâmica conflitante
  // const { data: cepClassification } = usePublicCepClassification(enderecoAluno?.cep)
  const cepClassification = null

  // ===================================================================== 
  // 🎯 REGRAS SIMPLES HARDCODED (SOLICITADO PELO USUÁRIO)
  // =====================================================================

  // Filtrar descontos baseado nas regras simples de CEP
  const filteredDiscounts = useMemo(() => {
    if (!discountTypes || !enderecoAluno?.cep) return discountTypes || []
    
    const cep = enderecoAluno.cep.replace(/\D/g, '')
    
    // Classificar CEP
    const isPocosDeCaldasrenda = cep.startsWith('377')
    const isAltaRenda = cep >= '37701000' && cep <= '37703999'  
    const isBaixaRenda = cep >= '37704000' && cep <= '37708999'
    
    console.log('🏠 StepDescontosV2 - CEP Classificado:', {
      cep: enderecoAluno.cep,
      isPocosDeCaldasrenda,
      isAltaRenda, 
      isBaixaRenda
    })

    return discountTypes.filter(discount => {
      const codigo = discount.codigo

      // REGRA 1: CEP de Poços → NUNCA mostrar RES
      if (codigo === 'RES' && isPocosDeCaldasrenda) {
        console.log(`❌ StepDescontosV2 - Bloqueando ${codigo} - Poços de Caldas não pode ter RES`)
        return false
      }

      // REGRA 2: CEP Alta Renda → NUNCA mostrar RES nem CEP*
      if (isAltaRenda) {
        if (codigo === 'RES' || codigo.startsWith('CEP')) {
          console.log(`❌ StepDescontosV2 - Bloqueando ${codigo} - Alta Renda`)
          return false
        }
      }

      // REGRA 3: CEP Baixa Renda → NUNCA mostrar RES, MAS pode mostrar CEP*
      if (isBaixaRenda && codigo === 'RES') {
        console.log(`❌ StepDescontosV2 - Bloqueando ${codigo} - Baixa Renda não pode ter RES`)
        return false
      }

      // REGRA ESPECÍFICA PARA CEP5: NUNCA para CEP fora de Poços
      if (codigo === 'CEP5' && !isPocosDeCaldasrenda) {
        console.log(`❌❌❌ StepDescontosV2 - BLOQUEANDO CEP5 - CEP FORA DE POÇOS (${enderecoAluno.cep}) ❌❌❌`)
        return false
      }

      // REGRA ESPECÍFICA PARA CEP10: NUNCA para CEP de Poços
      if (codigo === 'CEP10' && isPocosDeCaldasrenda) {
        console.log(`❌❌❌ StepDescontosV2 - BLOQUEANDO CEP10 - CEP DE POÇOS (${enderecoAluno.cep}) ❌❌❌`)
        return false  
      }

      console.log(`✅ StepDescontosV2 - Permitindo ${codigo}`)
      return true
    })
  }, [discountTypes, enderecoAluno?.cep])

  // Definir passos do wizard
  const wizardSteps: WizardStep[] = [
    {
      id: 'track-selection',
      title: 'Escolha do Trilho',
      description: 'Selecione o trilho que melhor se adequa ao seu perfil',
      completed: !!selectedTrack
    },
    {
      id: 'discount-selection',
      title: 'Seleção de Descontos',
      description: 'Escolha os descontos aplicáveis dentro do trilho selecionado',
      completed: selectedDiscounts.length > 0
    },
    {
      id: 'confirmation',
      title: 'Confirmação',
      description: 'Revise e confirme os descontos selecionados',
      completed: calculation.isValid
    }
  ]

  // Calcular cap disponível baseado no trilho selecionado
  const availableCap = useMemo(() => {
    if (!selectedTrack || !capConfig) return 0
    
    switch (selectedTrack) {
      case 'especial':
        return capConfig.cap_especial_maximo || 100
      case 'combinado':
        return capConfig.cap_with_secondary || 25
      case 'comercial':
        return capConfig.cap_without_secondary || 12
      default:
        return 0
    }
  }, [selectedTrack, capConfig])

  // Preparar trilhos com informações adicionais (APENAS TRILHO A e B)
  const trilhosComExemplos = useMemo(() => {
    if (!trilhos) return []
    
    // 🎯 FILTRAR APENAS TRILHO A (especial) e TRILHO B (combinado)
    return trilhos
      .filter(trilho => trilho.nome === 'especial' || trilho.nome === 'combinado')
      .map(trilho => ({
        ...trilho,
        exemplos_desconto: trilho.nome === 'especial' 
          ? ['Apenas 1 Especial', '(PASS ou ABI)', '(COL ou PBS)']
          : trilho.nome === 'combinado'
          ? ['1 Regular', '+ 1 Negociação', '(ex: IIR + CEP)']
          : []
      }))
  }, [trilhos])


  // Handlers
  const handleTrackSelection = (trackName: string) => {
    setSelectedTrack(trackName)
    setSelectedDiscounts([]) // Limpar descontos ao trocar trilho
    setCurrentStep('discount-selection')
    
    toast({
      title: "Trilho selecionado",
      description: `Trilho ${trackName.toUpperCase()} ativado. Agora você pode selecionar os descontos compatíveis.`
    })
  }

  const handleDiscountToggle = (discount: any, enabled: boolean) => {
    if (enabled) {
      // Adicionar desconto
      const newDiscount: Desconto = {
        id: crypto.randomUUID(),
        student_id: selectedStudent?.id || '',
        tipo_desconto_id: discount.id,
        codigo_desconto: discount.codigo,
        percentual_aplicado: discount.percentual_fixo || 0,
        status_aprovacao: "SOLICITADO",
        data_solicitacao: new Date().toISOString(),
      } as Desconto

      setSelectedDiscounts(prev => [...prev, newDiscount])
      addDesconto(newDiscount)
    } else {
      // Remover desconto
      const discountToRemove = selectedDiscounts.find(d => d.codigo_desconto === discount.codigo)
      if (discountToRemove) {
        setSelectedDiscounts(prev => prev.filter(d => d.id !== discountToRemove.id))
        removeDescontoById(discountToRemove.id)
      }
    }
  }

  const handleCalculationUpdate = (result: CalculationResult) => {
    setCalculation(result)
  }

  const handleConfirm = () => {
    if (!calculation.isValid) {
      toast({
        title: "Configuração inválida",
        description: "Corrija os problemas identificados antes de continuar.",
        variant: "destructive"
      })
      return
    }

    console.log('💾 StepDescontosV2 - Salvando no contexto:', {
      trilho: selectedTrack,
      descontos: selectedDiscounts.length,
      descontosDetalhes: selectedDiscounts.map(d => ({ codigo: d.codigo_desconto, id: d.id }))
    });

    try {
      // 1️⃣ Salvar trilho escolhido no contexto
      if (selectedTrack) {
        setTrilhoEscolhido(selectedTrack as any);
        updateTrilhos({
          trilho_escolhido: selectedTrack as any,
          descontos_aplicados: compatibleDiscounts || [],
          // ❌ REMOVIDO: calculo_atual que estava interferindo nos cálculos centralizados
          // O cálculo correto será feito pela função calculateAndStoreFinancials()
        });
      }

      // 2️⃣ Salvar todos os descontos selecionados no contexto
      selectedDiscounts.forEach(desconto => {
        console.log('💾 Adicionando desconto ao contexto:', desconto.codigo_desconto);
        addDesconto({
          ...desconto,
          data_solicitacao: new Date().toISOString(),
          status_aprovacao: "SOLICITADO"
        });
      });

      // 3️⃣ FASE 3: CALCULAR FINANCEIROS COM SISTEMA CENTRALIZADO
      console.log('🔥 StepDescontosV2: Disparando cálculo centralizado após salvar descontos...');
      calculateAndStoreFinancials();

      // 4️⃣ Atualizar timestamp
      updateDataUltimaAtualizacao();

      // 5️⃣ Toast de sucesso
      toast({
        title: "Descontos confirmados! ✅",
        description: `${selectedDiscounts.length} desconto(s) aplicado(s) no trilho ${selectedTrack?.toUpperCase()}.`
      });

      // 6️⃣ Prosseguir para próxima etapa
      onFinish();
      
    } catch (error) {
      console.error('❌ Erro ao salvar descontos:', error);
      toast({
        title: "Erro ao salvar",
        description: "Houve um problema ao salvar os descontos. Tente novamente.",
        variant: "destructive"
      });
    }
  }

  const canProceed = useMemo(() => {
    switch (currentStep) {
      case 'track-selection':
        return !!selectedTrack
      case 'discount-selection':
        return selectedDiscounts.length > 0 || selectedTrack === 'comercial' // Comercial pode não ter descontos
      case 'confirmation':
        return calculation.isValid && serieValues.valorSemMaterial > 0
      default:
        return false
    }
  }, [currentStep, selectedTrack, selectedDiscounts, calculation, serieValues.valorSemMaterial])

  // ============================================================================
  // RENDERIZAÇÃO DOS PASSOS
  // ============================================================================

  const renderTrackSelection = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Escolha seu Trilho de Desconto</h2>
        <p className="text-muted-foreground">
          Selecione apenas <strong>UMA</strong> opção que melhor se adequa ao seu perfil
        </p>
      </div>

      {loadingTrilhos ? (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Carregando trilhos disponíveis...</span>
        </div>
      ) : (
        <TrackSelector
          trilhos={trilhosComExemplos}
          selectedTrack={selectedTrack}
          onSelectTrack={handleTrackSelection}
          className="mt-8"
        />
      )}

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Importante:</strong> A escolha do trilho determina quais tipos de desconto 
          você poderá aplicar e o limite máximo de desconto total (cap).
        </AlertDescription>
      </Alert>
    </div>
  )

  const renderDiscountSelection = () => (
    <div className="space-y-6">
      {/* Header com trilho selecionado */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Seleção de Descontos</h2>
          <p className="text-muted-foreground">
            Trilho {selectedTrack?.toUpperCase()} selecionado
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setCurrentStep('track-selection')}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Alterar Trilho
        </Button>
      </div>

      {/* Breakdown de valores da série */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            💰 Estrutura de Valores da Mensalidade
          </CardTitle>
          <CardDescription>
            Descontos são aplicados apenas sobre o valor sem material
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col items-center p-4 bg-white rounded-lg shadow-sm border">
              <div className="text-xs text-muted-foreground mb-2">Mensalidade com Material</div>
              <div className="text-xl font-bold text-blue-600">
                R$ {serieValues.valorComMaterial.toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Valor total</div>
            </div>
            
            <div className="flex flex-col items-center p-4 bg-white rounded-lg shadow-sm border">
              <div className="text-xs text-muted-foreground mb-2">Valor do Material</div>
              <div className="text-xl font-bold text-red-600">
                - R$ {serieValues.valorMaterial.toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Subtração</div>
            </div>
            
            <div className="flex flex-col items-center p-4 bg-green-50 rounded-lg shadow-sm border-2 border-green-200">
              <div className="text-xs text-muted-foreground mb-2">Base para Desconto</div>
              <div className="text-xl font-bold text-green-600">
                R$ {serieValues.valorSemMaterial.toFixed(2)}
              </div>
              <div className="text-xs text-green-700 mt-1">Valor sobre o qual aplicamos desconto</div>
            </div>
          </div>
          
          <div className="mt-4 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
              <span>✓</span>
              <span>Descontos serão aplicados sobre R$ {serieValues.valorSemMaterial.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Barra de progresso do cap */}
      <CapProgressBar
        current={calculation.totalDesconto}
        maximum={availableCap}
        trackType={selectedTrack || ''}
        trackName={trilhosComExemplos.find(t => t.nome === selectedTrack)?.titulo}
      />

      {/* Filtro integrado de descontos */}
      {loadingCompatible ? (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Carregando descontos compatíveis...</span>
        </div>
      ) : filteredDiscounts && (
        <DiscountFilter
          trilho={selectedTrack as any}
          availableDiscounts={filteredDiscounts}
          selectedDiscounts={selectedDiscounts.map(d => 
            filteredDiscounts.find(dt => dt.codigo === d.codigo_desconto)
          ).filter(Boolean) as any[]}
          onDiscountToggle={(discount) => {
            const isCurrentlySelected = selectedDiscounts.some(d => d.codigo_desconto === discount.codigo)
            handleDiscountToggle(discount, !isCurrentlySelected)
          }}
          onDiscountsChange={(discounts) => {
            // Limpar seleção atual
            setSelectedDiscounts([])
            
            // Adicionar novos descontos selecionados
            const newDiscounts = discounts.map(discount => ({
              id: crypto.randomUUID(),
              student_id: selectedStudent?.id || '',
              tipo_desconto_id: discount.id,
              codigo_desconto: discount.codigo,
              percentual_aplicado: discount.percentual_fixo || 0,
              status_aprovacao: "SOLICITADO",
              data_solicitacao: new Date().toISOString(),
            } as Desconto))
            
            setSelectedDiscounts(newDiscounts)
            newDiscounts.forEach(d => addDesconto(d))
          }}
        />
      )}

      {/* Calculadora em tempo real */}
      <RealTimeCalculator
        baseMensal={serieValues.valorSemMaterial}
        selectedDiscounts={selectedDiscounts}
        trilhoSelecionado={selectedTrack || ''}
        capMaximo={availableCap}
        onCalculationUpdate={handleCalculationUpdate}
        serieValues={serieValues}
        serieAno={matricula?.serie_ano}
        escola={escola}
      />
    </div>
  )

  const renderConfirmation = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Confirmação dos Descontos</h2>
        <p className="text-muted-foreground">
          Revise sua seleção antes de finalizar
        </p>
      </div>

      {/* Resumo do trilho */}
      <Card>
        <CardHeader>
          <CardTitle>Trilho Selecionado</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="text-3xl">
              {trilhosComExemplos.find(t => t.nome === selectedTrack)?.icone}
            </div>
            <div>
              <h3 className="font-semibold">
                {trilhosComExemplos.find(t => t.nome === selectedTrack)?.titulo}
              </h3>
              <p className="text-sm text-muted-foreground">
                {trilhosComExemplos.find(t => t.nome === selectedTrack)?.descricao}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de descontos aplicados */}
      <Card>
        <CardHeader>
          <CardTitle>Descontos Aplicados</CardTitle>
        </CardHeader>
        <CardContent>
          {selectedDiscounts.length > 0 ? (
            <div className="space-y-3">
              {selectedDiscounts.map(desconto => (
                <DiscountChecklist key={desconto.id} desconto={desconto} />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">Nenhum desconto selecionado</p>
          )}
        </CardContent>
      </Card>

      {/* Cálculo final */}
      <RealTimeCalculator
        baseMensal={serieValues.valorSemMaterial}
        selectedDiscounts={selectedDiscounts}
        trilhoSelecionado={selectedTrack || ''}
        capMaximo={availableCap}
        onCalculationUpdate={handleCalculationUpdate}
        compact={false}
        serieValues={serieValues}
        serieAno={matricula?.serie_ano}
        escola={escola}
      />
    </div>
  )

  // ============================================================================
  // RENDERIZAÇÃO PRINCIPAL
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span>Progresso da configuração</span>
          <span>{wizardSteps.filter(s => s.completed).length} de {wizardSteps.length} passos</span>
        </div>
        <Progress 
          value={(wizardSteps.filter(s => s.completed).length / wizardSteps.length) * 100} 
          className="h-2"
        />
      </div>

      {/* Wizard steps indicator */}
      <div className="flex items-center justify-between">
        {wizardSteps.map((step, index) => (
          <div 
            key={step.id}
            className={`flex items-center ${index < wizardSteps.length - 1 ? 'flex-1' : ''}`}
          >
            <div className={`flex items-center gap-2 ${
              currentStep === step.id ? 'text-primary font-medium' : 
              step.completed ? 'text-green-600' : 'text-muted-foreground'
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                currentStep === step.id ? 'bg-primary text-primary-foreground' :
                step.completed ? 'bg-green-600 text-white' : 'bg-muted'
              }`}>
                {step.completed ? <CheckCircle className="h-4 w-4" /> : index + 1}
              </div>
              <span className="text-sm font-medium">{step.title}</span>
            </div>
            {index < wizardSteps.length - 1 && (
              <div className="flex-1 h-px bg-border mx-4" />
            )}
          </div>
        ))}
      </div>

      {/* CEP Info */}
      <Card>
        <CardContent className="p-3">
          <CepInfo cep={enderecoAluno?.cep} compact />
        </CardContent>
      </Card>

      {/* Step content */}
      <div className="min-h-[400px]">
        {currentStep === 'track-selection' && renderTrackSelection()}
        {currentStep === 'discount-selection' && renderDiscountSelection()}
        {currentStep === 'confirmation' && renderConfirmation()}
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between pt-6 border-t">
        <Button variant="outline" onClick={onPrev}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>

        <div className="flex items-center gap-3">
          {currentStep !== 'track-selection' && (
            <Button
              variant="outline"
              onClick={() => {
                const stepIndex = wizardSteps.findIndex(s => s.id === currentStep)
                if (stepIndex > 0) {
                  setCurrentStep(wizardSteps[stepIndex - 1].id)
                }
              }}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Passo Anterior
            </Button>
          )}

          {calculation.isValid && calculation.valorFinal > 0 && (
            <Button
              variant="secondary"
              onClick={() => generateProposalPdf({ 
                flow: "nova", 
                student: selectedStudent as any, 
                matricula: matricula as any, 
                descontos: selectedDiscounts as any, 
                baseMensal: serieValues.valorSemMaterial,
                trilho_escolhido: selectedTrack,
                serieValues
              })}
            >
              <Download className="mr-2 h-4 w-4" />
              Download Proposta
            </Button>
          )}

          {currentStep === 'confirmation' ? (
            <Button 
              onClick={handleConfirm}
              disabled={!calculation.isValid || serieValues.valorSemMaterial <= 0}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Confirmar
            </Button>
          ) : (
            <Button 
              onClick={() => {
                const stepIndex = wizardSteps.findIndex(s => s.id === currentStep)
                if (stepIndex < wizardSteps.length - 1) {
                  setCurrentStep(wizardSteps[stepIndex + 1].id)
                }
              }}
              disabled={!canProceed}
            >
              Próximo Passo
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export default StepDescontosV2