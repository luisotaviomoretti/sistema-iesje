// src/features/matricula-nova/hooks/data/useDiscountValidation.ts

import { useState, useCallback, useMemo } from 'react'
import type { 
  Desconto, 
  DescontoSelecionado, 
  CalculoDesconto
} from '../../types/discounts'
import { TipoTrilho } from '../../types/discounts'
import { DiscountRuleEngine } from '../../services/business/discountRules'
import { CapCalculationService } from '../../services/business/capCalculation'
import { useTracks } from './useTracks'

/**
 * Hook principal de validação de descontos
 * Centraliza toda lógica de validação, seleção e cálculos
 */
export function useDiscountValidation(
  trilhoId: string,
  valorBase: number
) {
  // Estados locais
  const [descontosSelecionados, setDescontosSelecionados] = useState<DescontoSelecionado[]>([])
  const [erros, setErros] = useState<Record<string, string>>({})
  const [documentosUpload, setDocumentosUpload] = useState<Record<string, File>>({})

  // Hook de trilhos
  const { data: trilhos } = useTracks()
  const trilhoAtual = trilhos?.find(t => t.id === trilhoId)

  // Cálculo reativo do CAP e validações
  const calculoAtual = useMemo((): CalculoDesconto => {
    if (!trilhoAtual || !valorBase || valorBase <= 0) {
      return getEmptyCalculation()
    }

    const percentualTotal = DiscountRuleEngine.calculateTotalPercentual(descontosSelecionados)
    const valorDesconto = (valorBase * percentualTotal) / 100
    const valorFinal = valorBase - valorDesconto

    // Determinar tipo do trilho para validação CAP
    let trilhoTipo: TipoTrilho = 'combinado'
    if (trilhoAtual.nome?.toLowerCase().includes('especial')) {
      trilhoTipo = 'especial'
    } else if (trilhoAtual.nome?.toLowerCase().includes('comercial')) {
      trilhoTipo = 'comercial'
    }

    const capValidation = CapCalculationService.validateCap(
      descontosSelecionados,
      trilhoTipo,
      trilhoAtual.cap_maximo || 0
    )

    return {
      valor_base: valorBase,
      descontos_aplicados: descontosSelecionados,
      valor_total_desconto: valorDesconto,
      percentual_total: percentualTotal,
      valor_final: valorFinal,
      nivel_aprovacao: capValidation.nivel_aprovacao,
      pode_aplicar: capValidation.pode_continuar,
      motivo_bloqueio: capValidation.motivo_bloqueio
    }
  }, [descontosSelecionados, valorBase, trilhoAtual])

  // Função para adicionar desconto
  const adicionarDesconto = useCallback((desconto: Desconto, percentual?: number) => {
    // Validar se pode adicionar
    const validation = DiscountRuleEngine.canAddDiscount(desconto, descontosSelecionados)
    
    if (!validation.pode) {
      setErros(prev => ({ ...prev, [desconto.id]: validation.motivo! }))
      return false
    }

    // Verificar CAP antes de adicionar
    const percentualFinal = percentual || desconto.percentual_maximo
    const trilhoTipo: TipoTrilho = getTrilhoTipo(trilhoAtual?.nome)
    
    const podeAdicionarCap = CapCalculationService.canAddDiscountWithoutExceedingCap(
      descontosSelecionados,
      percentualFinal,
      trilhoTipo,
      trilhoAtual?.cap_maximo || 0
    )

    if (!podeAdicionarCap.podeAdicionar) {
      setErros(prev => ({ 
        ...prev, 
        [desconto.id]: podeAdicionarCap.motivoRecusa || 'Excede limite CAP'
      }))
      return false
    }

    // Adicionar desconto
    const novoDesconto: DescontoSelecionado = {
      desconto,
      percentual_aplicado: Math.min(percentualFinal, desconto.percentual_maximo),
      documento_anexo: documentosUpload[desconto.id]
    }

    setDescontosSelecionados(prev => [...prev, novoDesconto])
    
    // Limpar erros
    setErros(prev => {
      const novosErros = { ...prev }
      delete novosErros[desconto.id]
      return novosErros
    })
    
    return true
  }, [descontosSelecionados, trilhoAtual, documentosUpload])

  // Função para remover desconto
  const removerDesconto = useCallback((descontoId: string) => {
    setDescontosSelecionados(prev => prev.filter(d => d.desconto.id !== descontoId))
    
    // Limpar erros relacionados
    setErros(prev => {
      const novosErros = { ...prev }
      delete novosErros[descontoId]
      return novosErros
    })

    // Limpar documento upload
    setDocumentosUpload(prev => {
      const novos = { ...prev }
      delete novos[descontoId]
      return novos
    })
  }, [])

  // Função para atualizar percentual
  const atualizarPercentual = useCallback((descontoId: string, novoPercentual: number) => {
    setDescontosSelecionados(prev => prev.map(d => {
      if (d.desconto.id !== descontoId) return d

      // Validar limite máximo do desconto
      const percentualSeguro = Math.min(novoPercentual, d.desconto.percentual_maximo)
      
      // Validar CAP
      const outrosDescontos = prev.filter(other => other.desconto.id !== descontoId)
      const trilhoTipo: TipoTrilho = getTrilhoTipo(trilhoAtual?.nome)
      
      const podeAtualizar = CapCalculationService.canAddDiscountWithoutExceedingCap(
        outrosDescontos,
        percentualSeguro,
        trilhoTipo,
        trilhoAtual?.cap_maximo || 0
      )

      if (!podeAtualizar.podeAdicionar) {
        // Usar o máximo permitido pelo CAP
        const percentualFinal = Math.min(percentualSeguro, podeAtualizar.percentualMaximoPermitido)
        
        if (percentualFinal !== novoPercentual) {
          setErros(prev => ({
            ...prev,
            [descontoId]: `Percentual ajustado para ${percentualFinal}% devido ao limite CAP`
          }))
          
          // Limpar erro após 3 segundos
          setTimeout(() => {
            setErros(prev => {
              const novosErros = { ...prev }
              delete novosErros[descontoId]
              return novosErros
            })
          }, 3000)
        }

        return { ...d, percentual_aplicado: percentualFinal }
      }

      return { ...d, percentual_aplicado: percentualSeguro }
    }))
  }, [trilhoAtual])

  // Função para upload de documento
  const adicionarDocumento = useCallback((descontoId: string, arquivo: File) => {
    setDocumentosUpload(prev => ({ ...prev, [descontoId]: arquivo }))
    
    // Atualizar desconto selecionado
    setDescontosSelecionados(prev => prev.map(d => 
      d.desconto.id === descontoId 
        ? { ...d, documento_anexo: arquivo }
        : d
    ))

    // Limpar erro de documento se houver
    setErros(prev => {
      const novosErros = { ...prev }
      if (novosErros[descontoId]?.includes('documento')) {
        delete novosErros[descontoId]
      }
      return novosErros
    })
  }, [])

  // Função para validar seleção completa
  const validarSelecao = useCallback(() => {
    const validacao = DiscountRuleEngine.validateDiscountCombination(descontosSelecionados)
    
    const novosErros: Record<string, string> = {}
    
    // Adicionar erros de validação
    validacao.errors.forEach(erro => {
      // Tentar identificar qual desconto está com problema
      const descontoComProblema = descontosSelecionados.find(d => 
        erro.includes(d.desconto.nome) || erro.includes(d.desconto.codigo)
      )
      
      if (descontoComProblema) {
        novosErros[descontoComProblema.desconto.id] = erro
      } else {
        // Erro geral
        novosErros['geral'] = erro
      }
    })

    setErros(novosErros)
    
    return {
      isValid: validacao.isValid,
      warnings: validacao.warnings,
      errors: validacao.errors
    }
  }, [descontosSelecionados])

  // Função para limpar tudo
  const limparSelecao = useCallback(() => {
    setDescontosSelecionados([])
    setErros({})
    setDocumentosUpload({})
  }, [])

  // Função para obter sugestões de otimização
  const obterSugestoes = useCallback(() => {
    if (descontosSelecionados.length === 0) {
      return []
    }

    const sugestoes = DiscountRuleEngine.suggestOptimizations(descontosSelecionados)
    return sugestoes.suggestions
  }, [descontosSelecionados])

  // Função para calcular impacto financeiro
  const calcularImpacto = useCallback(() => {
    if (!valorBase || valorBase <= 0) {
      return null
    }

    return DiscountRuleEngine.calculateFinancialImpact(descontosSelecionados, valorBase)
  }, [descontosSelecionados, valorBase])

  // Função para gerar resumo
  const gerarResumo = useCallback(() => {
    if (!valorBase || valorBase <= 0) {
      return null
    }

    return DiscountRuleEngine.generateSummary(descontosSelecionados, valorBase)
  }, [descontosSelecionados, valorBase])

  // Estado derivado para facilitar uso
  const estadoValidacao = useMemo(() => ({
    temDescontos: descontosSelecionados.length > 0,
    temErros: Object.keys(erros).length > 0,
    podeAvancar: calculoAtual.pode_aplicar && Object.keys(erros).length === 0,
    requerDocumentos: descontosSelecionados.some(d => d.desconto.requer_documento),
    documentosCompletos: descontosSelecionados.every(d => 
      !d.desconto.requer_documento || d.documento_anexo
    )
  }), [descontosSelecionados, erros, calculoAtual.pode_aplicar])

  return {
    // Dados
    descontosSelecionados,
    calculo: calculoAtual,
    erros,
    estadoValidacao,
    
    // Ações
    acoes: {
      adicionarDesconto,
      removerDesconto,
      atualizarPercentual,
      adicionarDocumento,
      validarSelecao,
      limparSelecao,
      obterSugestoes,
      calcularImpacto,
      gerarResumo
    }
  }
}

/**
 * Hook simplificado para validação de desconto individual
 */
export function useSingleDiscountValidation(
  desconto: Desconto,
  descontosSelecionados: DescontoSelecionado[]
) {
  return useMemo(() => {
    const validation = DiscountRuleEngine.canAddDiscount(desconto, descontosSelecionados)
    
    return {
      podeSelecionar: validation.pode,
      motivoBloqueio: validation.motivo,
      incompatibilidades: desconto.incompativel_com,
      requerDocumento: desconto.requer_documento
    }
  }, [desconto, descontosSelecionados])
}

/**
 * Hook para validação em tempo real de percentual
 */
export function usePercentualValidation(
  desconto: Desconto,
  percentualAtual: number,
  capDisponivel: number
) {
  return useMemo(() => {
    const maxPermitido = Math.min(
      desconto.percentual_maximo,
      capDisponivel
    )
    
    const isValid = percentualAtual <= maxPermitido && percentualAtual >= 0
    const excedeLimiteDesconto = percentualAtual > desconto.percentual_maximo
    const excedeLimiteCap = percentualAtual > capDisponivel

    let mensagem = ''
    if (excedeLimiteDesconto) {
      mensagem = `Máximo permitido para este desconto: ${desconto.percentual_maximo}%`
    } else if (excedeLimiteCap) {
      mensagem = `Máximo disponível no CAP: ${capDisponivel}%`
    }

    return {
      isValid,
      maxPermitido,
      mensagem,
      excedeLimiteDesconto,
      excedeLimiteCap
    }
  }, [desconto, percentualAtual, capDisponivel])
}

// Utilitários internos
function getEmptyCalculation(): CalculoDesconto {
  return {
    valor_base: 0,
    descontos_aplicados: [],
    valor_total_desconto: 0,
    percentual_total: 0,
    valor_final: 0,
    nivel_aprovacao: 'automatic',
    pode_aplicar: true
  }
}

function getTrilhoTipo(nomeToTrilho?: string): TipoTrilho {
  if (!nomeToTrilho) return 'combinado'
  
  const nome = nomeToTrilho.toLowerCase()
  if (nome.includes('especial')) return 'especial'
  if (nome.includes('comercial')) return 'comercial'
  return 'combinado'
}