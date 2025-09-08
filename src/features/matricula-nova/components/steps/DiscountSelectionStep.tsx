import React, { useState, useEffect, useMemo } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { AlertTriangle, Info, Target, RefreshCw } from 'lucide-react'
import type { StepProps } from '../../types/forms'
import type { 
  DiscountForEnrollment, 
  DiscountSelection, 
  CapCalculation,
  ValuePreview
} from '../../types/discounts'
import { CategoriasDesconto, CategoriaDesconto } from '../../types/discounts'
import { useDiscounts, useDescontosCompativeis } from '../../hooks/data/useDiscounts'
import { useTracks, useRefreshTracks } from '../../hooks/data/useTracks'
import { usePricingData } from '../../hooks/data/usePricingData'
import DiscountCategorySection from '../discount/DiscountCategorySection'
import CapIndicator from '../discount/CapIndicator'
import EnhancedPricingSummary from '../discount/EnhancedPricingSummary'

// Sistema de Elegibilidade por CEP
import { useEligibleDiscounts } from '../../../enrollment/hooks/useEligibleDiscounts'
import { DiscountEligibilityStatus } from '../../../enrollment/components/DiscountEligibilityStatus'
import { IneligibleDiscountsInfo } from '../../../enrollment/components/IneligibleDiscountsInfo'

export default function DiscountSelectionStep(props: StepProps) {
  
  // ========================================================================
  // ESTADO LOCAL
  // ========================================================================
  
  const [descontosSelecionados, setDescontosSelecionados] = useState<DiscountSelection[]>([])
  const [trilhoSelecionado, setTrilhoSelecionado] = useState<'especial' | 'combinado'>('combinado')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isCalculating, setIsCalculating] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

  // ========================================================================
  // HOOKS DE DADOS
  // ========================================================================
  
  // Usar hook com filtro por trilho
  const { data: compatibleDiscounts, isLoading: loadingDiscounts, error: discountsError } = useDescontosCompativeis(trilhoSelecionado)
  const { data: tracks, isLoading: loadingTracks } = useTracks()
  const { refreshTracks } = useRefreshTracks()
  
  // Buscar dados de preços integrados com o painel administrativo
  const { data: pricingData, isLoading: loadingPricing } = usePricingData('1', '1') // TODO: usar dados reais
  
  // ========================================================================
  // SISTEMA DE ELEGIBILIDADE POR CEP
  // ========================================================================
  
  // Obter CEP do formulário
  const addressData = props.form?.watch('address')
  const cep = addressData?.cep
  
  // Converter dados para formato compatível com sistema de elegibilidade
  const eligibilityDiscounts = useMemo(() => {
    if (!compatibleDiscounts) return []
    
    return compatibleDiscounts.map(discount => ({
      id: discount.id,
      codigo: discount.codigo,
      nome: discount.nome,
      percentual: discount.percentual_maximo || 0,
      is_active: discount.ativo,
      requires_document: discount.requer_documento,
      description: discount.nome,
      max_cumulative_percentage: discount.percentual_maximo || 0
    }))
  }, [compatibleDiscounts])
  
  // Hook de elegibilidade - filtra descontos baseado no CEP E trilho selecionado
  const {
    eligibleDiscounts,
    ineligibleDiscounts,
    cepCategory,
    isLoading: loadingEligibility,
    error: eligibilityError,
    stats
  } = useEligibleDiscounts(cep, eligibilityDiscounts, trilhoSelecionado as any, {
    enableDebugLogs: process.env.NODE_ENV === 'development'
  })

  // ========================================================================
  // DADOS MOCKADOS PARA DEMONSTRAÇÃO
  // ========================================================================
  
  // Simular dados do formulário para o preview
  const valorBaseMock = 850.00 // Valor base simulado
  const serieInfoMock = { id: '1', nome: '1º Ano Ensino Médio' }
  const escolaInfoMock = { id: '1', nome: 'Pelicano' }

  // ========================================================================
  // PROCESSAMENTO DE DADOS
  // ========================================================================
  
  // Converter dados para o formato esperado pelos componentes
  // NOVA LÓGICA: Confiar completamente no sistema de elegibilidade
  const processedDiscounts = useMemo((): DiscountForEnrollment[] => {
    console.log('🎯 processedDiscounts - Nova Lógica:', {
      trilho: trilhoSelecionado,
      cep,
      eligibleDiscountsCount: eligibleDiscounts?.length || 0,
      ineligibleDiscountsCount: ineligibleDiscounts?.length || 0
    })
    
    // Usar apenas descontos elegíveis ou fallback para compatíveis se carregando
    const discountsToProcess = (loadingEligibility || !eligibleDiscounts.length) 
      ? compatibleDiscounts || []
      : (() => {
          // Mapear descontos elegíveis de volta para o formato original
          const eligibleIds = eligibleDiscounts.map(d => d.id)
          return compatibleDiscounts?.filter(d => eligibleIds.includes(d.id)) || []
        })()
    
    console.log(`✅ Descontos a processar: ${discountsToProcess.length}`)
    if (trilhoSelecionado === 'especial') {
      const especiais = discountsToProcess.filter(d => d.categoria === CategoriaDesconto.ESPECIAL)
      console.log(`⭐ Descontos especiais processados: ${especiais.length}`, especiais.map(d => d.codigo))
    }
    
    if (!discountsToProcess.length) {
      console.log('⚠️ Nenhum desconto para processar!')
      return []
    }
    
    return discountsToProcess.map(discount => {
      // Mapear categoria baseado no enum CategoriaDesconto
      // As categorias já vêm convertidas do hook useDescontosCompativeis
      let categoriaFormatted: any = 'regular'
      if (discount.categoria === CategoriaDesconto.ESPECIAL) {
        categoriaFormatted = 'especial'
      } else if (discount.categoria === CategoriaDesconto.REGULAR) {
        categoriaFormatted = 'regular'
      } else if (discount.categoria === CategoriaDesconto.NEGOCIACAO) {
        categoriaFormatted = 'negociacao'
      }
      
      console.log(`Processando desconto ${discount.codigo}: categoria ${discount.categoria} -> ${categoriaFormatted}`)
      
      return {
        id: discount.id,
        codigo: discount.codigo,
        descricao: discount.nome,
        categoria: categoriaFormatted,
        percentual_fixo: discount.percentual_maximo,
        eh_variavel: false,
        ativo: discount.ativo,
        isSelected: descontosSelecionados.some(ds => ds.discountId === discount.id),
        documentosRequeridos: discount.requer_documento ? ['Documento obrigatório'] : [],
        nivelAprovacao: 'AUTOMATICA' as const,
        validation: {
          isValid: true,
          errors: [],
          warnings: []
        }
      }
    })
  }, [compatibleDiscounts, descontosSelecionados, eligibleDiscounts, ineligibleDiscounts, loadingEligibility, trilhoSelecionado])

  // Log final do processamento
  useEffect(() => {
    if (trilhoSelecionado === 'especial' && processedDiscounts.length > 0) {
      console.log(`🏁 RESULTADO FINAL - Trilho Especial tem ${processedDiscounts.length} descontos:`)
      processedDiscounts.forEach(d => {
        console.log(`  ✅ ${d.codigo}: ${d.descricao}`)
      })
    }
  }, [processedDiscounts, trilhoSelecionado])

  // Agrupar descontos por categoria
  const descontosPorCategoria = useMemo(() => {
    // Debug temporário
    console.log('ProcessedDiscounts:', processedDiscounts)
    console.log('Trilho selecionado:', trilhoSelecionado)
    console.log('Compatible discounts:', compatibleDiscounts)
    
    const grupos = {
      [CategoriasDesconto.ESPECIAL]: [] as DiscountForEnrollment[],
      [CategoriasDesconto.REGULAR]: [] as DiscountForEnrollment[],
      [CategoriasDesconto.NEGOCIACAO]: [] as DiscountForEnrollment[]
    }
    
    processedDiscounts.forEach(desconto => {
      // Mapear categoria corretamente para o enum CategoriasDesconto
      const categoriaKey = desconto.categoria === 'especial' ? CategoriasDesconto.ESPECIAL :
                          desconto.categoria === 'regular' ? CategoriasDesconto.REGULAR :
                          desconto.categoria === 'negociacao' ? CategoriasDesconto.NEGOCIACAO :
                          null
      
      if (categoriaKey && grupos[categoriaKey]) {
        grupos[categoriaKey].push(desconto)
      }
    })
    
    console.log('Grupos formados:', grupos)
    
    return grupos
  }, [processedDiscounts, trilhoSelecionado, compatibleDiscounts])

  // ========================================================================
  // CÁLCULOS
  // ========================================================================
  
  const capCalculation = useMemo((): CapCalculation => {
    // Buscar CAP dinâmico do trilho selecionado nos dados dos trilhos
    let capMaximo = 101 // fallback padrão genérico (permite 100%)
    
    if (tracks && tracks.length > 0) {
      console.log('🎯 Trilhos disponíveis:', tracks.map(t => ({ 
        id: t.id,
        nome: t.nome, 
        cap_maximo: t.cap_maximo,
        tipo: t.tipo 
      })))
      console.log('🔍 Buscando trilho:', trilhoSelecionado)
      
      // O nome no banco é exatamente 'especial', 'combinado' ou 'comercial'
      const trilhoAtual = tracks.find(t => {
        const matches = t.nome === trilhoSelecionado
        console.log(`Comparando: banco="${t.nome}" com selecionado="${trilhoSelecionado}" => match=${matches}`)
        return matches
      })
      
      if (trilhoAtual) {
        console.log('📋 Trilho encontrado completo:', trilhoAtual)
        console.log('📊 CAP_MAXIMO no trilho:', trilhoAtual.cap_maximo)
        
        // Verificar se cap_maximo existe e é um número válido
        if (trilhoAtual.cap_maximo !== null && trilhoAtual.cap_maximo !== undefined && !isNaN(trilhoAtual.cap_maximo)) {
          capMaximo = Number(trilhoAtual.cap_maximo)
          console.log(`✅ CAP dinâmico aplicado para trilho ${trilhoSelecionado}: ${capMaximo}%`)
        } else {
          // Se cap_maximo for null, usar valores padrão conservadores
          if (trilhoSelecionado === 'especial') {
            capMaximo = 100 // Trilho especial geralmente tem 100%
          } else if (trilhoSelecionado === 'combinado') {
            capMaximo = 20 // Valor conservador se não estiver configurado no banco
          }
          console.log(`⚠️ CAP_MAXIMO é null no banco para "${trilhoSelecionado}", usando padrão conservador: ${capMaximo}%`)
        }
      } else {
        console.log(`❌ Trilho "${trilhoSelecionado}" não encontrado nos dados`)
        console.log('Trilhos disponíveis:', tracks.map(t => t.nome))
        
        // Fallback baseado no tipo
        if (trilhoSelecionado === 'especial') {
          capMaximo = 100
        } else if (trilhoSelecionado === 'combinado') {
          capMaximo = 25
        }
      }
    } else {
      console.log('❌ Nenhum trilho disponível, usando fallback CAP:', capMaximo, '%')
    }
    
    const capUtilizado = descontosSelecionados.reduce(
      (sum, ds) => sum + (ds.percentualAplicado || 0), 0
    )
    const capDisponivel = Math.max(0, capMaximo - capUtilizado)
    const excedeuCap = capUtilizado > capMaximo
    const proximoDoLimite = capUtilizado > (capMaximo * 0.8)

    return {
      trilho: trilhoSelecionado,
      capMaximo,
      capUtilizado,
      capDisponivel,
      percentualTotal: capUtilizado,
      descontosAplicados: descontosSelecionados,
      isValid: !excedeuCap,
      excedeuCap,
      proximoDoLimite,
      warnings: proximoDoLimite && !excedeuCap ? 
        ['Próximo do limite de desconto'] : [],
      errors: excedeuCap ? 
        [`Limite de ${capMaximo}% excedido em ${(capUtilizado - capMaximo).toFixed(1)}%`] : []
    }
  }, [descontosSelecionados, trilhoSelecionado, tracks])

  // Dados para o componente premium integrado com useEnrollmentForm
  const premiumPricingData = useMemo(() => {
    if (!pricingData) return null
    
    // Usar dados do pricing do formulário principal se disponível
    const formPricing = props.pricing
    
    if (formPricing) {
      // Usar cálculo do sistema principal (mais preciso e integrado)
      const descontosDetalhes = formPricing.discounts.map(discount => ({
        codigo: discount.code,
        descricao: discount.name,
        percentual: discount.percentage,
        valor: discount.value
      }))

      return {
        valorMensalComMaterial: formPricing.baseValue,
        valorMaterial: pricingData.valorMaterial,
        valorMensalSemMaterial: formPricing.baseValue - pricingData.valorMaterial,
        descontoAplicado: formPricing.totalDiscountValue,
        percentualDesconto: formPricing.totalDiscountPercentage,
        mensalidadeFinal: formPricing.finalValue,
        descontosDetalhes
      }
    } else {
      // Fallback para cálculo local se pricing do form não estiver disponível
      const valorMensalSemMaterial = pricingData.valorMensalSemMaterial
      const descontoAplicado = (valorMensalSemMaterial * capCalculation.capUtilizado) / 100
      const valorComDesconto = valorMensalSemMaterial - descontoAplicado
      const mensalidadeFinal = valorComDesconto + pricingData.valorMaterial
      
      const descontosDetalhes = descontosSelecionados.map(ds => {
        const desconto = processedDiscounts.find(d => d.id === ds.discountId)
        const valor = (valorMensalSemMaterial * (ds.percentualAplicado || 0)) / 100
        
        return {
          codigo: desconto?.codigo || 'N/A',
          descricao: desconto?.descricao || 'N/A',
          percentual: ds.percentualAplicado || 0,
          valor
        }
      })

      return {
        valorMensalComMaterial: pricingData.valorMensalComMaterial,
        valorMaterial: pricingData.valorMaterial,
        valorMensalSemMaterial: valorMensalSemMaterial,
        descontoAplicado,
        percentualDesconto: capCalculation.capUtilizado,
        mensalidadeFinal,
        descontosDetalhes
      }
    }
  }, [pricingData, capCalculation, descontosSelecionados, processedDiscounts, props.pricing])

  // Manter compatibilidade com o componente antigo
  const valuePreview = useMemo((): ValuePreview => {
    if (!pricingData) {
      return {
        valorBase: 0,
        descontosDetalhes: [],
        percentualTotal: 0,
        valorTotalDesconto: 0,
        valorFinal: 0,
        breakdown: []
      }
    }

    const valorTotalDesconto = (pricingData.valorMensalSemMaterial * capCalculation.capUtilizado) / 100
    const valorFinal = pricingData.valorMensalSemMaterial - valorTotalDesconto + pricingData.valorMaterial
    
    const descontosDetalhes = descontosSelecionados.map(ds => {
      const desconto = processedDiscounts.find(d => d.id === ds.discountId)
      const valor = (pricingData.valorMensalSemMaterial * (ds.percentualAplicado || 0)) / 100
      
      return {
        codigo: desconto?.codigo || 'N/A',
        descricao: desconto?.descricao || 'N/A',
        percentual: ds.percentualAplicado || 0,
        valor
      }
    })

    return {
      valorBase: pricingData.valorMensalComMaterial,
      descontosDetalhes,
      percentualTotal: capCalculation.capUtilizado,
      valorTotalDesconto,
      valorFinal,
      breakdown: [
        { label: 'Valor com Material', value: pricingData.valorMensalComMaterial, type: 'base' },
        { label: 'Material', value: pricingData.valorMaterial, type: 'base' },
        { label: 'Valor sem Material', value: pricingData.valorMensalSemMaterial, type: 'base' },
        { label: 'Total de Descontos', value: valorTotalDesconto, type: 'discount' },
        { label: 'Mensalidade Final', value: valorFinal, type: 'final' }
      ]
    }
  }, [pricingData, capCalculation, descontosSelecionados, processedDiscounts])

  // ========================================================================
  // HANDLERS
  // ========================================================================
  
  const handleDescontoToggle = (desconto: DiscountForEnrollment) => {
    // NOVA LÓGICA SIMPLIFICADA: Se o desconto chegou até aqui, ele é elegível
    // O sistema de elegibilidade já filtrou os não-elegíveis antes
    
    // Verificação adicional: se há CEP, verificar se está nos inelegíveis (safety check)
    if (cep) {
      const isIneligible = ineligibleDiscounts.some(d => d.discount.id === desconto.id)
      
      if (isIneligible) {
        console.error(`🚫 BLOQUEADO: Desconto ${desconto.codigo} está marcado como inelegível`)
        
        // Mostrar erro temporário
        setErrors(current => ({
          ...current,
          [desconto.id]: `Desconto não disponível para o CEP ${cep}`
        }))
        
        // Limpar erro após 3 segundos
        setTimeout(() => {
          setErrors(current => {
            const { [desconto.id]: _, ...rest } = current
            return rest
          })
        }, 3000)
        
        return // Não permitir a seleção
      }
    }
    
    // Log para trilho especial
    if (trilhoSelecionado === 'especial' && desconto.categoria === 'especial') {
      console.log(`⭐ Desconto ESPECIAL ${desconto.codigo} - permitido pelo trilho especial`)
    }
    
    setDescontosSelecionados(current => {
      const existe = current.find(ds => ds.discountId === desconto.id)
      
      let newSelections
      if (existe) {
        // Remover desconto
        newSelections = current.filter(ds => ds.discountId !== desconto.id)
      } else {
        // Adicionar desconto
        const novaSelecao: DiscountSelection = {
          discountId: desconto.id,
          percentualAplicado: desconto.percentual_fixo || 10
        }
        newSelections = [...current, novaSelecao]
      }
      
      // Sincronizar com o formulário principal se disponível
      if (props.form) {
        // Passar tanto IDs quanto percentuais
        const formData = newSelections.map(s => ({
          id: s.discountId,
          percentual: s.percentualAplicado || 0
        }))
        props.form.setValue('selectedDiscounts', formData)
      }
      
      return newSelections
    })
    
    // Limpar erro se existir
    if (errors[desconto.id]) {
      setErrors(current => {
        const { [desconto.id]: _, ...rest } = current
        return rest
      })
    }
  }

  const handlePercentualChange = (descontoId: string, percentual: number) => {
    setDescontosSelecionados(current => {
      const updated = current.map(ds =>
        ds.discountId === descontoId
          ? { ...ds, percentualAplicado: percentual }
          : ds
      )
      
      // Sincronizar com o formulário principal se disponível
      if (props.form) {
        // Passar tanto IDs quanto percentuais atualizados
        const formData = updated.map(s => ({
          id: s.discountId,
          percentual: s.percentualAplicado || 0
        }))
        props.form.setValue('selectedDiscounts', formData)
      }
      
      return updated
    })
  }

  const handleTrilhoChange = (novoTrilho: 'especial' | 'combinado') => {
    // Limpar seleções existentes ao mudar de trilho
    setDescontosSelecionados([])
    setErrors({})
    
    // Sincronizar com o formulário principal se disponível
    if (props.form) {
      props.form.setValue('selectedDiscounts', [])
    }
    
    // Atualizar trilho selecionado
    setTrilhoSelecionado(novoTrilho)
    
    // Sincronizar academic.trackId no formulário, se trilho carregado
    try {
      const track = (tracks || []).find(t => t.nome === novoTrilho)
      if (track && props.form) {
        props.form.setValue('academic.trackId', track.id, { shouldDirty: true, shouldValidate: true })
      }
    } catch {}
    
    console.log(`Trilho alterado para: ${novoTrilho} - Seleções limpas`)
  }

  // Sincronização inicial/reativa: garantir academic.trackId alinhado ao trilho selecionado
  useEffect(() => {
    try {
      if (!tracks || tracks.length === 0 || !props.form) return
      const matched = tracks.find(t => t.nome === trilhoSelecionado)
      const current = props.form.getValues('academic.trackId')
      if (matched && current !== matched.id) {
        props.form.setValue('academic.trackId', matched.id, { shouldValidate: true })
      }
    } catch {}
  }, [tracks, trilhoSelecionado])

  const handleReset = () => {
    setDescontosSelecionados([])
    setErrors({})
    
    // Sincronizar com o formulário principal se disponível
    if (props.form) {
      props.form.setValue('selectedDiscounts', [])
    }
  }

  const handleRefreshTracks = async () => {
    setIsRefreshing(true)
    try {
      await refreshTracks()
      // Pequena pausa para dar feedback visual
      setTimeout(() => setIsRefreshing(false), 500)
    } catch (error) {
      console.error('Erro ao atualizar trilhos:', error)
      setIsRefreshing(false)
    }
  }
  
  // ========================================================================
  // EFEITOS - Sincronização com formulário principal
  // ========================================================================
  
  useEffect(() => {
    // Sincronizar estado inicial dos descontos quando o componente carregar
    if (props.form && !isInitialized) {
      const formDiscounts = props.form.getValues('selectedDiscounts')
      if (formDiscounts && Array.isArray(formDiscounts) && formDiscounts.length > 0) {
        // Converter do formato do form para o formato local
        const localFormat = formDiscounts.map(fd => {
          // Suportar tanto formato antigo (string) quanto novo (objeto)
          if (typeof fd === 'string') {
            return {
              discountId: fd,
              percentualAplicado: 10 // Padrão se for formato antigo
            }
          } else {
            return {
              discountId: fd.id,
              percentualAplicado: fd.percentual || 10
            }
          }
        })
        setDescontosSelecionados(localFormat)
      }
      setIsInitialized(true)
    }
  }, [props.form, isInitialized])

  // ========================================================================
  // RENDERIZAÇÃO
  // ========================================================================
  
  if (loadingDiscounts || loadingTracks || loadingEligibility) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="text-4xl mb-4">💰</div>
          <h2 className="text-xl font-semibold text-gray-900">Descontos</h2>
          <p className="text-gray-600 mt-2">
            {loadingEligibility ? 'Verificando elegibilidade por CEP...' : 'Carregando descontos disponíveis...'}
          </p>
        </div>
        <div className="flex justify-center">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      </div>
    )
  }

  if (discountsError || (!compatibleDiscounts && !loadingDiscounts)) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="text-4xl mb-4">💰</div>
          <h2 className="text-xl font-semibold text-gray-900">Descontos</h2>
          <p className="text-gray-600 mt-2">Seleção de descontos aplicáveis</p>
        </div>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Erro ao carregar descontos disponíveis. Tente novamente.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="text-center">
        <div className="text-4xl mb-4">💰</div>
        <h2 className="text-xl font-semibold text-gray-900">Descontos Aplicáveis</h2>
        <p className="text-gray-600 mt-2">
          Selecione os descontos que se aplicam à sua situação
        </p>
      </div>
      
      {/* Status de Elegibilidade por CEP */}
      {cep && (
        <DiscountEligibilityStatus 
          cepCategory={cepCategory}
          cep={cep}
          className="mb-6"
          showDetails={true}
        />
      )}
      
      {/* Lista de Descontos Inelegíveis */}
      {ineligibleDiscounts.length > 0 && (
        <IneligibleDiscountsInfo 
          ineligibleDiscounts={ineligibleDiscounts}
          className="mb-6"
          showByDefault={false}
        />
      )}

      {/* Controles de Trilho */}
      <div className="flex justify-center items-center space-x-2">
        {['especial', 'combinado'].map((trilho) => (
          <Button
            key={trilho}
            variant={trilhoSelecionado === trilho ? 'default' : 'outline'}
            onClick={() => handleTrilhoChange(trilho as any)}
            className="capitalize"
          >
            {trilho === 'especial' ? '⭐ Especial' : '🔄 Combinado'} {trilho}
          </Button>
        ))}
        
        {/* Botão de Refresh para atualizar CAPs */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefreshTracks}
          disabled={isRefreshing}
          title="Atualizar dados dos trilhos do painel administrativo"
          className="ml-4"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* CAP Indicator */}
      <CapIndicator 
        calculation={capCalculation}
        showDetails={true}
      />

      {/* Seções de Categoria */}
      <div className="space-y-4">
        {Object.entries(descontosPorCategoria).map(([categoria, descontos]) => {
          // Não renderizar a categoria se não houver descontos
          if (descontos.length === 0) return null
          
          return (
            <DiscountCategorySection
              key={categoria}
              categoria={categoria as CategoriasDesconto}
              descontos={descontos}
              descontosSelecionados={descontosSelecionados}
              onDescontoToggle={handleDescontoToggle}
              onPercentualChange={handlePercentualChange}
              maxCap={capCalculation.capMaximo}
              currentCap={capCalculation.capUtilizado}
              trilhoAtivo={trilhoSelecionado}
              errors={errors}
              ineligibleDiscountIds={
                // NUNCA incluir descontos especiais como inelegíveis
                categoria === CategoriasDesconto.ESPECIAL 
                  ? [] 
                  : ineligibleDiscounts.map(d => d.id)
              }
            />
          )
        })}
      </div>

      <Separator />

      {/* Resumo de Valores Aprimorado */}
      <EnhancedPricingSummary
        pricing={props.pricing}
        seriesData={(() => {
          // Buscar dados da série selecionada
          const seriesId = props.form?.watch('academic.seriesId')
          if (!seriesId || !props.series) return null
          const selectedSeries = props.series.find((s: any) => s.id === seriesId)
          return selectedSeries ? {
            valor_material: selectedSeries.valor_material,
            valor_mensal_sem_material: selectedSeries.valor_mensal_sem_material,
            valor_mensal_com_material: selectedSeries.valor_mensal_com_material
          } : null
        })()}
        isLoading={isCalculating}
      />

      {/* Ações */}
      <div className="flex justify-between items-center pt-4">
        <Button
          variant="outline"
          onClick={handleReset}
          disabled={descontosSelecionados.length === 0}
        >
          <Target className="w-4 h-4 mr-2" />
          Limpar Seleção
        </Button>

        <div className="text-sm text-gray-600">
          {descontosSelecionados.length === 0 ? (
            'Nenhum desconto selecionado'
          ) : (
            `${descontosSelecionados.length} desconto(s) selecionado(s)`
          )}
        </div>
      </div>

      {/* Informações importantes */}
      {capCalculation.excedeuCap && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            O limite máximo de desconto foi excedido. 
            Ajuste a seleção para continuar.
          </AlertDescription>
        </Alert>
      )}

      {capCalculation.proximoDoLimite && !capCalculation.excedeuCap && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Você está próximo do limite máximo de desconto. 
            Verifique se todos os documentos estão disponíveis.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
