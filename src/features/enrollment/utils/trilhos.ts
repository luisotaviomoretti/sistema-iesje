import { 
  type TrilhoNome, 
  type CategoriaDesconto, 
  type TipoDesconto,
  type TrilhoComRegras,
  type CalculoDesconto,
  type ValidacaoTrilho
} from '@/lib/supabase'

// ============================================================================
// UTILITÁRIOS PARA CÁLCULO DE TRILHOS
// ============================================================================

/**
 * Determina o trilho mais adequado com base nos descontos selecionados
 */
export function determinarTrilhoOptimo(descontos: TipoDesconto[]): TrilhoNome | null {
  if (!descontos || descontos.length === 0) {
    return null
  }
  
  const categorias = descontos.map(d => d.categoria)
  const temEspecial = categorias.includes('especial')
  const temRegular = categorias.includes('regular')
  const temNegociacao = categorias.includes('negociacao')
  
  // Se tem desconto especial, só pode usar trilho especial
  if (temEspecial) {
    return 'especial'
  }
  
  // Se tem regular + negociação, usar trilho combinado
  if (temRegular && temNegociacao) {
    return 'combinado'
  }
  
  // Se tem só regular, usar trilho combinado
  if (temRegular) {
    return 'combinado'
  }
  
  // Se tem só negociação, usar trilho comercial
  if (temNegociacao) {
    return 'comercial'
  }
  
  return null
}

/**
 * Valida se os descontos são compatíveis com o trilho escolhido
 */
export function validarCompatibilidadeTrilho(
  trilho: TrilhoComRegras | null,
  descontos: TipoDesconto[]
): { compativel: boolean; motivo?: string } {
  if (!trilho) {
    return { compativel: false, motivo: 'Trilho não encontrado' }
  }
  
  if (!descontos || descontos.length === 0) {
    return { compativel: true }
  }
  
  const categoriasPermitidas = trilho.regras.map(r => r.categoria_permitida)
  const categoriasDescontos = descontos.map(d => d.categoria)
  
  // Verificar se todas as categorias dos descontos são permitidas
  for (const categoria of categoriasDescontos) {
    if (!categoriasPermitidas.includes(categoria)) {
      return { 
        compativel: false, 
        motivo: `Categoria '${categoria}' não é permitida no trilho ${trilho.titulo}` 
      }
    }
  }
  
  // Validações específicas por trilho
  if (trilho.nome === 'especial') {
    // Trilho especial: só pode ter descontos especiais
    const temOutraCategoria = categoriasDescontos.some(c => c !== 'especial')
    if (temOutraCategoria) {
      return {
        compativel: false,
        motivo: 'Trilho Especial: apenas descontos da categoria especial são permitidos'
      }
    }
  }
  
  if (trilho.nome === 'comercial') {
    // Trilho comercial: só pode ter descontos de negociação
    const temOutraCategoria = categoriasDescontos.some(c => c !== 'negociacao')
    if (temOutraCategoria) {
      return {
        compativel: false,
        motivo: 'Trilho Comercial: apenas descontos de negociação são permitidos'
      }
    }
  }
  
  return { compativel: true }
}

/**
 * Calcula o total de desconto e valor final
 */
export function calcularDesconto(
  descontos: TipoDesconto[],
  valorBase: number,
  capMaximo?: number
): CalculoDesconto {
  if (!descontos || descontos.length === 0) {
    return {
      trilho: 'comercial', // default
      descontos_aplicados: [],
      cap_calculado: 0,
      cap_disponivel: capMaximo || 100,
      valor_total_desconto: 0,
      valor_final: valorBase,
      eh_valido: true
    }
  }
  
  // Calcular desconto total
  const valorTotalDesconto = descontos.reduce((total, desconto) => {
    return total + (desconto.percentual_fixo || 0)
  }, 0)
  
  // Aplicar cap se definido
  const capAplicado = capMaximo ? Math.min(valorTotalDesconto, capMaximo) : valorTotalDesconto
  
  // Calcular valor final
  const percentualFinal = capAplicado / 100
  const valorDesconto = valorBase * percentualFinal
  const valorFinal = valorBase - valorDesconto
  
  // Validações
  const capRespeitado = capMaximo ? valorTotalDesconto <= capMaximo : true
  const restricoes: string[] = []
  
  if (!capRespeitado) {
    restricoes.push(`Desconto total (${valorTotalDesconto.toFixed(1)}%) excede o cap máximo (${capMaximo}%)`)
  }
  
  return {
    trilho: determinarTrilhoOptimo(descontos) || 'comercial',
    descontos_aplicados: descontos,
    cap_calculado: capAplicado,
    cap_disponivel: capMaximo || 100,
    valor_total_desconto: valorTotalDesconto,
    valor_final: valorFinal,
    eh_valido: capRespeitado,
    restricoes: restricoes.length > 0 ? restricoes : undefined
  }
}

/**
 * Determina o cap máximo baseado no trilho e presença de responsável secundário
 */
export function determinarCapMaximo(
  trilho: TrilhoNome,
  trilhoData: TrilhoComRegras | null,
  temResponsavelSecundario: boolean,
  configCaps: {
    cap_with_secondary: number
    cap_without_secondary: number
    cap_especial_maximo: number
  }
): number {
  switch (trilho) {
    case 'especial':
      return configCaps.cap_especial_maximo
    
    case 'combinado':
      // Trilho combinado pode usar o cap maior se tiver responsável secundário
      return temResponsavelSecundario 
        ? configCaps.cap_with_secondary 
        : configCaps.cap_without_secondary
    
    case 'comercial':
      // Trilho comercial sempre usa o cap menor
      return configCaps.cap_without_secondary
    
    default:
      return configCaps.cap_without_secondary
  }
}

/**
 * Formata percentual para exibição
 */
export function formatarPercentual(valor: number): string {
  return `${valor.toFixed(1).replace('.0', '')}%`
}

/**
 * Formata valor monetário para exibição
 */
export function formatarValor(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valor)
}

/**
 * Calcula o valor do desconto em reais
 */
export function calcularValorDesconto(valorBase: number, percentual: number): number {
  return valorBase * (percentual / 100)
}

/**
 * Ordena trilhos por prioridade (especial > combinado > comercial)
 */
export function ordenarTrilhosPorPrioridade<T extends { nome: TrilhoNome }>(trilhos: T[]): T[] {
  const ordem: Record<TrilhoNome, number> = {
    'especial': 1,
    'combinado': 2,
    'comercial': 3
  }
  
  return trilhos.sort((a, b) => ordem[a.nome] - ordem[b.nome])
}

/**
 * Verifica se um desconto requer documentação especial
 */
export function requerDocumentacao(desconto: TipoDesconto): boolean {
  return desconto.documentos_necessarios && desconto.documentos_necessarios.length > 0
}

/**
 * Agrupa descontos por categoria para exibição
 */
export function agruparDescontosPorCategoria(descontos: TipoDesconto[]): Record<CategoriaDesconto, TipoDesconto[]> {
  const grupos: Record<CategoriaDesconto, TipoDesconto[]> = {
    especial: [],
    regular: [],
    negociacao: []
  }
  
  descontos.forEach(desconto => {
    grupos[desconto.categoria].push(desconto)
  })
  
  return grupos
}

/**
 * Calcula estatísticas de desconto para um conjunto de dados
 */
export interface EstatisticasDesconto {
  total_descontos: number
  desconto_medio: number
  desconto_maximo: number
  desconto_minimo: number
  valor_total_economia: number
}

export function calcularEstatisticasDesconto(
  calculos: CalculoDesconto[]
): EstatisticasDesconto {
  if (calculos.length === 0) {
    return {
      total_descontos: 0,
      desconto_medio: 0,
      desconto_maximo: 0,
      desconto_minimo: 0,
      valor_total_economia: 0
    }
  }
  
  const descontos = calculos.map(c => c.cap_calculado)
  const economia = calculos.reduce((total, c) => {
    return total + c.valor_total_desconto
  }, 0)
  
  return {
    total_descontos: calculos.length,
    desconto_medio: descontos.reduce((a, b) => a + b, 0) / descontos.length,
    desconto_maximo: Math.max(...descontos),
    desconto_minimo: Math.min(...descontos),
    valor_total_economia: economia
  }
}

/**
 * Gera sugestão de trilho baseado no perfil do aluno
 */
export interface PerfilAluno {
  temIrmaos: boolean
  ehDeOutraCidade: boolean
  temDesconstoEspecial: boolean
  valorMensalidade: number
}

export function sugerirTrilho(perfil: PerfilAluno): {
  trilho: TrilhoNome
  motivo: string
  descontos_sugeridos: string[]
} {
  const sugestoes: string[] = []
  
  // Se tem desconto especial, só pode usar trilho especial
  if (perfil.temDesconstoEspecial) {
    return {
      trilho: 'especial',
      motivo: 'Aluno possui desconto especial (bolsa ou filho de funcionário)',
      descontos_sugeridos: ['Descontos especiais aplicáveis']
    }
  }
  
  // Se tem irmãos ou é de outra cidade, sugerir trilho combinado
  if (perfil.temIrmaos || perfil.ehDeOutraCidade) {
    if (perfil.temIrmaos) {
      sugestoes.push('Desconto por irmãos (IIR)')
    }
    if (perfil.ehDeOutraCidade) {
      sugestoes.push('Desconto de outras cidades (RES)')
    }
    sugestoes.push('Descontos comerciais complementares')
    
    return {
      trilho: 'combinado',
      motivo: 'Aluno qualifica para descontos regulares e comerciais',
      descontos_sugeridos: sugestoes
    }
  }
  
  // Caso contrário, sugerir trilho comercial
  return {
    trilho: 'comercial',
    motivo: 'Foco em flexibilidade comercial e negociações',
    descontos_sugeridos: ['Desconto por CEP', 'Desconto por adimplência', 'Negociações especiais']
  }
}