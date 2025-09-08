// src/features/matricula-nova/hooks/data/useCapCalculation.ts

import { useMemo } from 'react'
import type { 
  DescontoSelecionado, 
  CapValidationResult 
} from '../../types/discounts'
import { TipoTrilho } from '../../types/discounts'
import { CapCalculationService } from '../../services/business/capCalculation'
import { useTracks } from './useTracks'

/**
 * Hook principal para cálculos de CAP
 * Fornece validações e cálculos em tempo real do limite de descontos
 */
export function useCapCalculation(
  descontos: DescontoSelecionado[],
  trilhoId: string
) {
  const { data: trilhos } = useTracks()
  
  return useMemo(() => {
    const trilho = trilhos?.find(t => t.id === trilhoId)
    if (!trilho || !trilho.cap_maximo) {
      return {
        validacao: null,
        capacidade: null,
        relatorio: null,
        sugestoes: []
      }
    }

    // Determinar tipo do trilho
    const trilhoTipo = getTrilhoTipoFromName(trilho.nome || '')
    
    // Validação principal
    const validacao = CapCalculationService.validateCap(
      descontos, 
      trilhoTipo,
      trilho.cap_maximo
    )

    // Cálculo de capacidade
    const capacidade = CapCalculationService.calculateRemainingCap(
      descontos,
      trilhoTipo,
      trilho.cap_maximo
    )

    // Análise de otimização
    const analiseOtimizacao = CapCalculationService.analyzeCapOptimization(
      descontos,
      trilhoTipo,
      trilho.cap_maximo
    )

    // Relatório detalhado
    const relatorio = CapCalculationService.generateCapReport(
      descontos,
      trilhoTipo,
      trilho.cap_maximo
    )

    return {
      validacao,
      capacidade,
      analiseOtimizacao,
      relatorio,
      sugestoes: analiseOtimizacao.sugestoes,
      trilhoInfo: {
        nome: trilho.nome,
        tipo: trilhoTipo,
        capMaximo: trilho.cap_maximo
      }
    }
  }, [descontos, trilhoId, trilhos])
}

/**
 * Hook para validação de CAP em tempo real durante seleção
 */
export function useRealTimeCapValidation(
  descontosAtuais: DescontoSelecionado[],
  novoPercentual: number,
  trilhoId: string
) {
  const { data: trilhos } = useTracks()
  
  return useMemo(() => {
    const trilho = trilhos?.find(t => t.id === trilhoId)
    if (!trilho || !trilho.cap_maximo) {
      return {
        podeAdicionar: false,
        motivoRecusa: 'Trilho não encontrado ou sem CAP definido',
        capRestante: 0,
        percentualMaximoPermitido: 0
      }
    }

    const trilhoTipo = getTrilhoTipoFromName(trilho.nome || '')
    
    return CapCalculationService.canAddDiscountWithoutExceedingCap(
      descontosAtuais,
      novoPercentual,
      trilhoTipo,
      trilho.cap_maximo
    )
  }, [descontosAtuais, novoPercentual, trilhoId, trilhos])
}

/**
 * Hook para monitoramento de status do CAP
 */
export function useCapStatus(
  descontos: DescontoSelecionado[],
  trilhoId: string
) {
  const { validacao, capacidade, trilhoInfo } = useCapCalculation(descontos, trilhoId)
  
  return useMemo(() => {
    if (!validacao || !capacidade || !trilhoInfo) {
      return {
        status: 'unknown' as const,
        nivel: 'info' as const,
        mensagem: 'Informações de CAP não disponíveis',
        progresso: 0,
        cor: 'gray'
      }
    }

    let status: 'ok' | 'warning' | 'danger' | 'exceeded' | 'unknown'
    let nivel: 'success' | 'warning' | 'error' | 'info'
    let cor: string
    let mensagem: string

    if (validacao.excede_cap) {
      status = 'exceeded'
      nivel = 'error'
      cor = 'red'
      mensagem = `CAP excedido: ${validacao.percentual_atual}% > ${validacao.cap_maximo}%`
    } else if (capacidade.proximoDoLimite) {
      status = 'warning'
      nivel = 'warning'
      cor = 'yellow'
      mensagem = `Próximo do limite: ${capacidade.percentualUtilizado.toFixed(1)}% do CAP usado`
    } else if (validacao.percentual_atual > 0) {
      status = 'ok'
      nivel = 'success'
      cor = 'green'
      mensagem = `CAP utilizado: ${validacao.percentual_atual}% de ${validacao.cap_maximo}%`
    } else {
      status = 'ok'
      nivel = 'info'
      cor = 'blue'
      mensagem = `CAP disponível: ${validacao.cap_maximo}%`
    }

    return {
      status,
      nivel,
      mensagem,
      progresso: capacidade.percentualUtilizado,
      cor,
      detalhes: {
        capUtilizado: capacidade.capUtilizado,
        capMaximo: capacidade.capMaximo,
        capDisponivel: capacidade.capDisponivel,
        trilho: trilhoInfo.nome
      }
    }
  }, [validacao, capacidade, trilhoInfo])
}

/**
 * Hook para sugestões inteligentes de otimização de CAP
 */
export function useCapOptimizationSuggestions(
  descontos: DescontoSelecionado[],
  trilhoId: string,
  valorBase?: number
) {
  const { analiseOtimizacao } = useCapCalculation(descontos, trilhoId)
  
  return useMemo(() => {
    if (!analiseOtimizacao || descontos.length === 0) {
      return {
        temSugestoes: false,
        sugestoes: [],
        cenarioOtimizado: null,
        economiaOtimizada: null
      }
    }

    const sugestoesEnriquecidas = analiseOtimizacao.sugestoes.map(sugestao => ({
      id: generateSuggestionId(sugestao),
      texto: sugestao,
      tipo: categorizeSuggestion(sugestao),
      prioridade: getPriorityFromSuggestion(sugestao)
    }))

    // Calcular impacto financeiro das sugestões se valor base fornecido
    let impactoFinanceiro = null
    if (valorBase && analiseOtimizacao.cenarioOtimizado) {
      const economiaAtual = analiseOtimizacao.economia.atual
      const economiaOtimizada = analiseOtimizacao.economia.otimizada || 0
      
      impactoFinanceiro = {
        valorAtual: (valorBase * economiaAtual) / 100,
        valorOtimizado: (valorBase * economiaOtimizada) / 100,
        diferenca: (valorBase * (economiaAtual - economiaOtimizada)) / 100
      }
    }

    return {
      temSugestoes: sugestoesEnriquecidas.length > 0,
      sugestoes: sugestoesEnriquecidas,
      cenarioOtimizado: analiseOtimizacao.cenarioOtimizado,
      economiaOtimizada: analiseOtimizacao.economia.otimizada,
      impactoFinanceiro
    }
  }, [analiseOtimizacao, descontos.length, valorBase])
}

/**
 * Hook para alertas e notificações de CAP
 */
export function useCapAlerts(
  descontos: DescontoSelecionado[],
  trilhoId: string
) {
  const { relatorio } = useCapCalculation(descontos, trilhoId)
  
  return useMemo(() => {
    if (!relatorio) {
      return {
        alertas: [],
        recomendacoes: [],
        temAlertas: false,
        nivelCritico: false
      }
    }

    const alertasEnriquecidos = relatorio.alertas.map(alerta => ({
      id: generateAlertId(alerta),
      mensagem: alerta,
      tipo: getAlertType(alerta),
      timestamp: Date.now()
    }))

    const recomendacoesEnriquecidas = relatorio.recomendacoes.map(recomendacao => ({
      id: generateRecommendationId(recomendacao),
      texto: recomendacao,
      categoria: getRecommendationCategory(recomendacao)
    }))

    const nivelCritico = relatorio.resumo.status === 'EXCEEDED'
    const temAlertas = alertasEnriquecidos.length > 0

    return {
      alertas: alertasEnriquecidos,
      recomendacoes: recomendacoesEnriquecidas,
      temAlertas,
      nivelCritico,
      statusGeral: relatorio.resumo.status
    }
  }, [relatorio])
}

/**
 * Hook para comparação de cenários de CAP
 */
export function useCapScenarioComparison(
  cenarioAtual: DescontoSelecionado[],
  cenarioAlternativo: DescontoSelecionado[],
  trilhoId: string
) {
  const { data: trilhos } = useTracks()
  
  return useMemo(() => {
    const trilho = trilhos?.find(t => t.id === trilhoId)
    if (!trilho || !trilho.cap_maximo) {
      return null
    }

    const trilhoTipo = getTrilhoTipoFromName(trilho.nome || '')

    // Calcular para cenário atual
    const capAtual = CapCalculationService.calculateRemainingCap(
      cenarioAtual,
      trilhoTipo,
      trilho.cap_maximo
    )

    // Calcular para cenário alternativo  
    const capAlternativo = CapCalculationService.calculateRemainingCap(
      cenarioAlternativo,
      trilhoTipo,
      trilho.cap_maximo
    )

    const diferencaUtilizacao = capAlternativo.capUtilizado - capAtual.capUtilizado
    const diferencaDisponivel = capAlternativo.capDisponivel - capAtual.capDisponivel

    return {
      cenarioAtual: {
        capUtilizado: capAtual.capUtilizado,
        capDisponivel: capAtual.capDisponivel,
        percentualUtilizado: capAtual.percentualUtilizado
      },
      cenarioAlternativo: {
        capUtilizado: capAlternativo.capUtilizado,
        capDisponivel: capAlternativo.capDisponivel,
        percentualUtilizado: capAlternativo.percentualUtilizado
      },
      diferenca: {
        utilizacao: diferencaUtilizacao,
        disponivel: diferencaDisponivel,
        melhorCenario: diferencaUtilizacao <= 0 ? 'atual' : 'alternativo'
      },
      recomendacao: diferencaUtilizacao > 0 
        ? 'Cenário alternativo utiliza mais CAP'
        : diferencaUtilizacao < 0 
          ? 'Cenário alternativo é mais eficiente'
          : 'Cenários equivalentes em termos de CAP'
    }
  }, [cenarioAtual, cenarioAlternativo, trilhoId, trilhos])
}

// Utilitários internos
function getTrilhoTipoFromName(nome: string): TipoTrilho {
  const nomeLower = nome.toLowerCase()
  if (nomeLower.includes('especial')) return 'especial'
  return 'combinado'
}

function generateSuggestionId(sugestao: string): string {
  return `sug-${sugestao.substring(0, 20).replace(/\s/g, '-')}-${Date.now()}`
}

function categorizeSuggestion(sugestao: string): 'cap' | 'documento' | 'combinacao' | 'geral' {
  if (sugestao.toLowerCase().includes('cap') || sugestao.toLowerCase().includes('limite')) {
    return 'cap'
  }
  if (sugestao.toLowerCase().includes('documento')) {
    return 'documento'
  }
  if (sugestao.toLowerCase().includes('combina') || sugestao.toLowerCase().includes('consolid')) {
    return 'combinacao'
  }
  return 'geral'
}

function getPriorityFromSuggestion(sugestao: string): 'alta' | 'media' | 'baixa' {
  if (sugestao.toLowerCase().includes('excede') || sugestao.toLowerCase().includes('obrigatór')) {
    return 'alta'
  }
  if (sugestao.toLowerCase().includes('considere') || sugestao.toLowerCase().includes('recomend')) {
    return 'media'
  }
  return 'baixa'
}

function generateAlertId(alerta: string): string {
  return `alert-${alerta.substring(0, 15).replace(/\s/g, '-')}-${Date.now()}`
}

function getAlertType(alerta: string): 'error' | 'warning' | 'info' {
  if (alerta.toLowerCase().includes('excedido') || alerta.toLowerCase().includes('erro')) {
    return 'error'
  }
  if (alerta.toLowerCase().includes('próximo') || alerta.toLowerCase().includes('atenção')) {
    return 'warning'
  }
  return 'info'
}

function generateRecommendationId(recomendacao: string): string {
  return `rec-${recomendacao.substring(0, 15).replace(/\s/g, '-')}-${Date.now()}`
}

function getRecommendationCategory(recomendacao: string): 'ajuste' | 'documento' | 'processo' {
  if (recomendacao.toLowerCase().includes('ajust') || recomendacao.toLowerCase().includes('reduz')) {
    return 'ajuste'
  }
  if (recomendacao.toLowerCase().includes('documento') || recomendacao.toLowerCase().includes('anexe')) {
    return 'documento'
  }
  return 'processo'
}