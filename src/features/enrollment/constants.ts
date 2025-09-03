import { TipoDesconto, NivelAprovacao } from "./types";

// Constantes para categorias de desconto
export const CATEGORIAS_DESCONTO = {
  REGULAR: 'regular' as const,
  ESPECIAL: 'especial' as const, 
  NEGOCIACAO: 'negociacao' as const
} as const;

export type CategoriaDesconto = typeof CATEGORIAS_DESCONTO[keyof typeof CATEGORIAS_DESCONTO];

// Função para obter categoria do desconto por código
export function getCategoriaDesconto(codigo: string): CategoriaDesconto {
  const regulares = ['IIR', 'RES', 'PAV'];
  const especiais = ['PASS', 'PBS', 'COL', 'SAE', 'ABI', 'ABP'];
  
  if (regulares.includes(codigo)) return CATEGORIAS_DESCONTO.REGULAR;
  if (especiais.includes(codigo)) return CATEGORIAS_DESCONTO.ESPECIAL;
  return CATEGORIAS_DESCONTO.NEGOCIACAO;
}

export const MAX_DESCONTO_TOTAL = 60; // %

const nivelPorPercentual = (p: number): NivelAprovacao => {
  if (p <= 20) return "AUTOMATICA";
  if (p <= 50) return "COORDENACAO";
  return "DIRECAO";
};

export const TIPOS_DESCONTO: TipoDesconto[] = [
  // REGULARES
  { id: "1", codigo: "IIR", descricao: "Alunos Irmãos Carnal - 10%", percentual_fixo: 10, eh_variavel: false, documentos_necessarios: ["Certidão de nascimento dos irmãos", "Comprovante de matrícula do(s) irmão(s)",], nivel_aprovacao_requerido: nivelPorPercentual(10), ativo: true },
  { id: "2", codigo: "RES", descricao: "Alunos de Outras Cidades - 20%", percentual_fixo: 20, eh_variavel: false, documentos_necessarios: ["Comprovante de residência de outra cidade"], nivel_aprovacao_requerido: nivelPorPercentual(20), ativo: true },
  { id: "9", codigo: "PAV", descricao: "Pagamento à Vista - 15%", percentual_fixo: 15, eh_variavel: false, documentos_necessarios: ["Comprovante de pagamento integral"], nivel_aprovacao_requerido: nivelPorPercentual(15), ativo: true },
  
  // ESPECIAIS  
  { id: "3", codigo: "PASS", descricao: "Filhos de Prof. do IESJE Sindicalizados - 100%", percentual_fixo: 100, eh_variavel: false, documentos_necessarios: ["Vínculo empregatício", "Declaração de sindicalização"], nivel_aprovacao_requerido: "DIRECAO", ativo: true },
  { id: "4", codigo: "PBS", descricao: "Filhos Prof. Sind. de Outras Instituições - 40%", percentual_fixo: 40, eh_variavel: false, documentos_necessarios: ["Comprovante de vínculo docente", "Comprovante de sindicalização"], nivel_aprovacao_requerido: nivelPorPercentual(40), ativo: true },
  { id: "5", codigo: "COL", descricao: "Filhos de Func. do IESJE Sindicalizados (SAAE) - 50%", percentual_fixo: 50, eh_variavel: false, documentos_necessarios: ["Vínculo com IESJE", "Comprovante de sindicalização SAAE"], nivel_aprovacao_requerido: nivelPorPercentual(50), ativo: true },
  { id: "6", codigo: "SAE", descricao: "Filhos de Func. Outros Estabelec. Sindicalizados (SAAE) - 40%", percentual_fixo: 40, eh_variavel: false, documentos_necessarios: ["Comprovante de vínculo empregatício", "Comprovante SAAE"], nivel_aprovacao_requerido: nivelPorPercentual(40), ativo: true },
  { id: "7", codigo: "ABI", descricao: "Bolsa Integral Filantropia - 100%", percentual_fixo: 100, eh_variavel: false, documentos_necessarios: ["Processo de filantropia completo"], nivel_aprovacao_requerido: "DIRECAO", ativo: true },
  { id: "8", codigo: "ABP", descricao: "Bolsa Parcial Filantropia - 50%", percentual_fixo: 50, eh_variavel: false, documentos_necessarios: ["Processo de filantropia completo"], nivel_aprovacao_requerido: nivelPorPercentual(50), ativo: true },
  
  // NEGOCIAÇÃO (Comerciais)
  { id: "C1", codigo: "CEP10", descricao: "Comercial — CEP fora de Poços de Caldas - 10%", percentual_fixo: 10, eh_variavel: false, documentos_necessarios: [], nivel_aprovacao_requerido: nivelPorPercentual(10), ativo: true },
  { id: "C2", codigo: "CEP5", descricao: "Comercial — CEP em bairro de menor renda (Poços) - 5%", percentual_fixo: 5, eh_variavel: false, documentos_necessarios: [], nivel_aprovacao_requerido: nivelPorPercentual(5), ativo: true },
  { id: "C3", codigo: "ADIM2", descricao: "Comercial — Adimplente perfeito - 2%", percentual_fixo: 2, eh_variavel: false, documentos_necessarios: [], nivel_aprovacao_requerido: "AUTOMATICA", ativo: true },
  { id: "C4", codigo: "COM_EXTRA", descricao: "Comercial — Extra (negociação) até 20%", eh_variavel: true, documentos_necessarios: [], nivel_aprovacao_requerido: "DIRECAO", ativo: true },
];

// Séries/Ano pré-configuradas
export const SERIES_ANO: string[] = [
  "1º ano",
  "2º ano",
  "3º ano",
  "4º ano",
  "5º ano",
  "6º ano",
  "7º ano",
  "8º ano",
  "9º ano",
  "1ª série EM",
  "2ª série EM",
  "3ª série EM",
];

// Valores base por Série/Ano (pode ser ajustado conforme tabela oficial)
export const VALOR_BASE_POR_SERIE: Record<string, number> = {
  "1º ano": 700,
  "2º ano": 800,
  "3º ano": 900,
  "4º ano": 1000,
  "5º ano": 1100,
  "6º ano": 1200,
  "7º ano": 1300,
  "8º ano": 1400,
  "9º ano": 1500,
  "1ª série EM": 1600,
  "2ª série EM": 1700,
  "3ª série EM": 1800,
};

export function valorBaseParaSerie(serie?: string): number | undefined {
  if (!serie) return undefined;
  return VALOR_BASE_POR_SERIE[serie];
}

// Sugestão automática da próxima série
export function proximaSerie(serieAtual?: string): string | undefined {
  if (!serieAtual) return undefined;
  const idx = SERIES_ANO.findIndex((s) => normaliza(s) === normaliza(serieAtual));
  if (idx === -1) return undefined;
  return SERIES_ANO[idx + 1];
}

// =============================================================================
// FUNÇÕES MIGRADAS PARA DADOS DINÂMICOS
// =============================================================================

/**
 * Função migrada para obter valor base usando dados dinâmicos
 */
export function getDynamicSerieValue(
  serieInput: string, 
  dynamicSeries?: any[], 
  fallbackToStatic = true
): number {
  // 🔄 MIGRAÇÃO PROGRESSIVA: Tentar dados dinâmicos primeiro
  if (dynamicSeries && dynamicSeries.length > 0) {
    const serie = dynamicSeries.find(s => 
      s.ano_serie === serieInput || 
      s.nome === serieInput ||
      normaliza(s.ano_serie) === normaliza(serieInput) ||
      normaliza(s.nome) === normaliza(serieInput)
    );
    if (serie) {
      return serie.valor_mensal_com_material || 0;
    }
  }

  // 🎯 FALLBACK: Usar dados estáticos
  if (fallbackToStatic) {
    return valorBaseParaSerie(serieInput) || 0;
  }

  return 0;
}

/**
 * Função migrada para progressão de série usando dados dinâmicos
 */
export function getDynamicNextSerie(
  currentSerie: string,
  dynamicSeries?: any[],
  fallbackToStatic = true
): string | undefined {
  // 🔄 MIGRAÇÃO PROGRESSIVA: Tentar dados dinâmicos primeiro
  if (dynamicSeries && dynamicSeries.length > 0) {
    const current = dynamicSeries.find(s => 
      s.ano_serie === currentSerie || 
      s.nome === currentSerie ||
      normaliza(s.ano_serie) === normaliza(currentSerie) ||
      normaliza(s.nome) === normaliza(currentSerie)
    );
    
    if (current) {
      // Buscar próxima série na mesma escola com ordem seguinte
      const nextSerie = dynamicSeries.find(s => 
        s.escola === current.escola && 
        s.ordem === current.ordem + 1 &&
        s.ativo
      );
      return nextSerie?.ano_serie;
    }
  }

  // 🎯 FALLBACK: Usar lógica estática
  if (fallbackToStatic) {
    return proximaSerie(currentSerie);
  }

  return undefined;
}

function normaliza(s: string) {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}

