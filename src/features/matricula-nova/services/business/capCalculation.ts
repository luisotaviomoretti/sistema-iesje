// src/features/matricula-nova/services/business/capCalculation.ts

import type { 
  DescontoSelecionado, 
  NivelAprovacao,
  CapValidationResult 
} from '../../types/discounts'
import { TipoTrilho } from '../../types/discounts'
import { DiscountRuleEngine } from './discountRules'

/**
 * Serviço para cálculos do sistema CAP (Limite de Desconto)
 * Centraliza toda lógica de validação e cálculo de limites
 */
export class CapCalculationService {
  
  /**
   * Regras básicas do sistema CAP
   */
  private static readonly CAP_RULES = {
    integralDiscounts: ['ABI', 'PASS'], // Códigos que podem ser 100%
    warningThreshold: 80 // % do cap que gera warning
  }

  /**
   * Valida se o CAP está dentro do permitido
   */
  static validateCap(
    descontos: DescontoSelecionado[],
    trilhoTipo: TipoTrilho,
    trilhoCapMaximo: number
  ): CapValidationResult {
    
    if (!descontos || descontos.length === 0) {
      return {
        percentual_atual: 0,
        cap_maximo: trilhoCapMaximo,
        excede_cap: false,
        nivel_aprovacao: DiscountRuleEngine.determineApprovalLevel(0),
        pode_continuar: true
      }
    }

    const percentualTotal = DiscountRuleEngine.calculateTotalPercentual(descontos)
    
    // Determinar CAP máximo efetivo
    const capMaximoEfetivo = this.determineEffectiveCap(descontos, trilhoTipo, trilhoCapMaximo)
    
    // Verificar se excede o limite
    const excedeCapMaximo = percentualTotal > capMaximoEfetivo
    
    // Determinar nível de aprovação
    const nivelAprovacao = this.determineCapBasedApprovalLevel(percentualTotal, descontos)

    // Determinar motivo do bloqueio se houver
    let motivoBloqueio: string | undefined
    if (excedeCapMaximo) {
      motivoBloqueio = this.generateBlockingReason(percentualTotal, capMaximoEfetivo, trilhoTipo)
    }

    return {
      percentual_atual: percentualTotal,
      cap_maximo: capMaximoEfetivo,
      excede_cap: excedeCapMaximo,
      nivel_aprovacao: nivelAprovacao,
      pode_continuar: !excedeCapMaximo,
      motivo_bloqueio: motivoBloqueio
    }
  }

  /**
   * Determina o CAP máximo efetivo considerando descontos especiais
   */
  private static determineEffectiveCap(
    descontos: DescontoSelecionado[],
    trilhoTipo: TipoTrilho,
    trilhoCapMaximo: number
  ): number {
    
    // Se não há CAP definido no trilho, retornar 0 (não permitir descontos)
    if (!trilhoCapMaximo || trilhoCapMaximo <= 0) {
      return 0
    }
    
    // Verificar se há descontos integrais que permitem > CAP do trilho
    const hasIntegralDiscount = descontos.some(d => 
      this.CAP_RULES.integralDiscounts.includes(d.desconto.codigo)
    )

    if (hasIntegralDiscount) {
      // Descontos integrais podem ir até 100%
      return 100
    }

    // Usar o CAP configurado no trilho
    return trilhoCapMaximo
  }

  /**
   * Determina nível de aprovação considerando CAP e tipos de desconto
   */
  private static determineCapBasedApprovalLevel(
    percentualTotal: number,
    descontos: DescontoSelecionado[]
  ): NivelAprovacao {
    
    // Verificar se há descontos especiais que sempre precisam de aprovação especial
    const hasSpecialDiscount = descontos.some(d => 
      this.CAP_RULES.integralDiscounts.includes(d.desconto.codigo)
    )

    if (hasSpecialDiscount && percentualTotal >= 100) {
      return 'special' as NivelAprovacao
    }

    // Usar regras padrão do DiscountRuleEngine
    return DiscountRuleEngine.determineApprovalLevel(percentualTotal)
  }

  /**
   * Gera mensagem explicativa para bloqueio
   */
  private static generateBlockingReason(
    percentualAtual: number,
    capMaximo: number,
    trilhoTipo: TipoTrilho
  ): string {
    
    const trilhoNomes = {
      [TipoTrilho.ESPECIAL]: 'Especial',
      [TipoTrilho.COMBINADO]: 'Combinado',
      [TipoTrilho.COMERCIAL]: 'Comercial'
    }

    const trilhoNome = trilhoNomes[trilhoTipo] || 'desconhecido'

    return `Desconto total de ${percentualAtual.toFixed(1)}% excede o limite máximo de ${capMaximo}% para trilho ${trilhoNome}`
  }

  /**
   * Sugere ajuste automático de percentuais para respeitar CAP
   */
  static suggestPercentualAdjustment(
    descontos: DescontoSelecionado[],
    capMaximo: number
  ): DescontoSelecionado[] {
    
    if (!descontos || descontos.length === 0) {
      return []
    }

    const percentualTotal = DiscountRuleEngine.calculateTotalPercentual(descontos)

    // Se já está dentro do limite, retornar sem alteração
    if (percentualTotal <= capMaximo) {
      return [...descontos]
    }

    // Ajustar proporcionalmente mantendo as proporções relativas
    const fatorAjuste = capMaximo / percentualTotal

    return descontos.map(d => ({
      ...d,
      percentual_aplicado: Math.floor(d.percentual_aplicado * fatorAjuste)
    })).filter(d => d.percentual_aplicado > 0) // Remover descontos que ficaram zerados
  }

  /**
   * Calcula CAP disponível restante
   */
  static calculateRemainingCap(
    descontos: DescontoSelecionado[],
    trilhoTipo: TipoTrilho,
    trilhoCapMaximo: number
  ): {
    capMaximo: number
    capUtilizado: number
    capDisponivel: number
    percentualUtilizado: number
    proximoDoLimite: boolean
  } {

    const percentualAtual = DiscountRuleEngine.calculateTotalPercentual(descontos)
    const capMaximo = this.determineEffectiveCap(descontos, trilhoTipo, trilhoCapMaximo)
    const capDisponivel = Math.max(0, capMaximo - percentualAtual)
    const percentualUtilizado = capMaximo > 0 ? (percentualAtual / capMaximo) * 100 : 0
    const proximoDoLimite = percentualUtilizado > this.CAP_RULES.warningThreshold

    return {
      capMaximo,
      capUtilizado: percentualAtual,
      capDisponivel,
      percentualUtilizado,
      proximoDoLimite
    }
  }

  /**
   * Verifica se um novo desconto pode ser adicionado sem exceder CAP
   */
  static canAddDiscountWithoutExceedingCap(
    descontosAtuais: DescontoSelecionado[],
    novoPercentual: number,
    trilhoTipo: TipoTrilho,
    trilhoCapMaximo: number
  ): {
    podeAdicionar: boolean
    capRestante: number
    percentualMaximoPermitido: number
    motivoRecusa?: string
  } {

    const { capMaximo, capDisponivel } = this.calculateRemainingCap(
      descontosAtuais, 
      trilhoTipo, 
      trilhoCapMaximo
    )

    const podeAdicionar = novoPercentual <= capDisponivel
    const percentualMaximoPermitido = capDisponivel

    let motivoRecusa: string | undefined
    if (!podeAdicionar) {
      motivoRecusa = `Desconto de ${novoPercentual}% excederia o limite. Máximo disponível: ${capDisponivel}%`
    }

    return {
      podeAdicionar,
      capRestante: capDisponivel,
      percentualMaximoPermitido,
      motivoRecusa
    }
  }

  /**
   * Analisa otimização de CAP para múltiplos cenários
   */
  static analyzeCapOptimization(
    descontos: DescontoSelecionado[],
    trilhoTipo: TipoTrilho,
    trilhoCapMaximo: number
  ): {
    cenarioAtual: CapValidationResult
    cenarioOtimizado?: DescontoSelecionado[]
    sugestoes: string[]
    economia: {
      atual: number
      otimizada?: number
      diferenca?: number
    }
  } {

    const cenarioAtual = this.validateCap(descontos, trilhoTipo, trilhoCapMaximo)
    const sugestoes: string[] = []
    
    let cenarioOtimizado: DescontoSelecionado[] | undefined
    let economiaOtimizada: number | undefined

    // Se excede CAP, tentar otimização
    if (cenarioAtual.excede_cap) {
      cenarioOtimizado = this.suggestPercentualAdjustment(descontos, cenarioAtual.cap_maximo)
      economiaOtimizada = DiscountRuleEngine.calculateTotalPercentual(cenarioOtimizado)
      
      sugestoes.push(`Ajustar percentuais para respeitar limite de ${cenarioAtual.cap_maximo}%`)
      sugestoes.push('Considere remover alguns descontos para simplificar aprovação')
    }

    // Se próximo do limite, alertar
    const { proximoDoLimite, percentualUtilizado } = this.calculateRemainingCap(
      descontos, 
      trilhoTipo, 
      trilhoCapMaximo
    )

    if (proximoDoLimite && !cenarioAtual.excede_cap) {
      sugestoes.push(`Utilizando ${percentualUtilizado.toFixed(1)}% do CAP disponível - próximo do limite`)
    }

    // Verificar documentação para descontos altos
    if (cenarioAtual.percentual_atual > 40) {
      const semDocumento = descontos.filter(d => 
        d.desconto.requer_documento && !d.documento_anexo
      )
      
      if (semDocumento.length > 0) {
        sugestoes.push('Anexe documentos obrigatórios para descontos altos')
      }
    }

    return {
      cenarioAtual,
      cenarioOtimizado,
      sugestoes,
      economia: {
        atual: cenarioAtual.percentual_atual,
        otimizada: economiaOtimizada,
        diferenca: economiaOtimizada ? cenarioAtual.percentual_atual - economiaOtimizada : undefined
      }
    }
  }

  /**
   * Gera relatório detalhado de CAP
   */
  static generateCapReport(
    descontos: DescontoSelecionado[],
    trilhoTipo: TipoTrilho,
    trilhoCapMaximo: number,
    valorBase: number = 0
  ): {
    resumo: {
      trilho: string
      capMaximo: number
      capUtilizado: number
      capDisponivel: number
      status: 'OK' | 'WARNING' | 'EXCEEDED'
    }
    detalhes: {
      desconto: string
      codigo: string
      percentual: number
      impactoFinanceiro?: number
    }[]
    alertas: string[]
    recomendacoes: string[]
  } {

    const validacao = this.validateCap(descontos, trilhoTipo, trilhoCapMaximo)
    const capacidade = this.calculateRemainingCap(descontos, trilhoTipo, trilhoCapMaximo)

    // Determinar status
    let status: 'OK' | 'WARNING' | 'EXCEEDED' = 'OK'
    if (validacao.excede_cap) {
      status = 'EXCEEDED'
    } else if (capacidade.proximoDoLimite) {
      status = 'WARNING'
    }

    // Mapear detalhes
    const detalhes = descontos.map(d => ({
      desconto: d.desconto.nome,
      codigo: d.desconto.codigo,
      percentual: d.percentual_aplicado,
      impactoFinanceiro: valorBase > 0 ? (valorBase * d.percentual_aplicado) / 100 : undefined
    }))

    // Gerar alertas
    const alertas: string[] = []
    if (validacao.excede_cap) {
      alertas.push(`CAP excedido: ${validacao.percentual_atual}% > ${validacao.cap_maximo}%`)
    }
    if (capacidade.proximoDoLimite && !validacao.excede_cap) {
      alertas.push(`Próximo do limite CAP: ${capacidade.percentualUtilizado.toFixed(1)}%`)
    }

    // Gerar recomendações
    const recomendacoes: string[] = []
    const analise = this.analyzeCapOptimization(descontos, trilhoTipo, trilhoCapMaximo)
    recomendacoes.push(...analise.sugestoes)

    return {
      resumo: {
        trilho: trilhoTipo,
        capMaximo: capacidade.capMaximo,
        capUtilizado: capacidade.capUtilizado,
        capDisponivel: capacidade.capDisponivel,
        status
      },
      detalhes,
      alertas,
      recomendacoes
    }
  }

  /**
   * Valida regras de CAP específicas por código de desconto
   */
  static validateSpecialCapRules(
    codigoDesconto: string,
    percentualSolicitado: number
  ): {
    isValid: boolean
    capMaximoPermitido: number
    requerAprovacaoEspecial: boolean
    observacoes?: string
  } {

    // Regras específicas por código
    const regrasEspeciais = {
      'ABI': { maxCap: 100, requerAprovacao: true, obs: 'Bolsa Integral - 100% permitido' },
      'PASS': { maxCap: 100, requerAprovacao: true, obs: 'Funcionário IESJE - 100% permitido' },
      'PBS': { maxCap: 40, requerAprovacao: false, obs: 'Máximo 40% para funcionários externos' },
      'COL': { maxCap: 50, requerAprovacao: false, obs: 'Máximo 50% para SAAE' },
      'SAE': { maxCap: 40, requerAprovacao: false, obs: 'Máximo 40% para SAAE externo' },
      'IIR': { maxCap: 10, requerAprovacao: false, obs: 'Desconto família - 10%' },
      'RES': { maxCap: 20, requerAprovacao: false, obs: 'Desconto residência - 20%' },
      'PAV': { maxCap: 15, requerAprovacao: false, obs: 'Pagamento à vista - 15%' }
    }

    const regra = regrasEspeciais[codigoDesconto as keyof typeof regrasEspeciais]
    
    if (!regra) {
      // Desconto não tem regra específica, usar limite flexível
      return {
        isValid: true, // Será validado pelo CAP do trilho
        capMaximoPermitido: 100, // Máximo teórico, será limitado pelo trilho
        requerAprovacaoEspecial: percentualSolicitado > 50,
        observacoes: 'Desconto padrão - limitado pelo CAP do trilho'
      }
    }

    return {
      isValid: percentualSolicitado <= regra.maxCap,
      capMaximoPermitido: regra.maxCap,
      requerAprovacaoEspecial: regra.requerAprovacao,
      observacoes: regra.obs
    }
  }
}