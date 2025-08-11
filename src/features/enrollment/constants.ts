import { TipoDesconto, NivelAprovacao } from "./types";

export const MAX_DESCONTO_TOTAL = 60; // %

const nivelPorPercentual = (p: number): NivelAprovacao => {
  if (p <= 20) return "AUTOMATICA";
  if (p <= 50) return "COORDENACAO";
  return "DIRECAO";
};

export const TIPOS_DESCONTO: TipoDesconto[] = [
  { id: "1", codigo: "IIR", descricao: "Alunos Irmãos Carnal - 10%", percentual_fixo: 10, eh_variavel: false, documentos_necessarios: ["Certidão de nascimento dos irmãos", "Comprovante de matrícula do(s) irmão(s)",], nivel_aprovacao_requerido: nivelPorPercentual(10), ativo: true },
  { id: "2", codigo: "RES", descricao: "Alunos de Outras Cidades - 20%", percentual_fixo: 20, eh_variavel: false, documentos_necessarios: ["Comprovante de residência de outra cidade"], nivel_aprovacao_requerido: nivelPorPercentual(20), ativo: true },
  { id: "3", codigo: "PASS", descricao: "Filhos de Prof. do IESJE Sindicalizados - 100%", percentual_fixo: 100, eh_variavel: false, documentos_necessarios: ["Vínculo empregatício", "Declaração de sindicalização"], nivel_aprovacao_requerido: "DIRECAO", ativo: true },
  { id: "4", codigo: "PBS", descricao: "Filhos Prof. Sind. de Outras Instituições - 40%", percentual_fixo: 40, eh_variavel: false, documentos_necessarios: ["Comprovante de vínculo docente", "Comprovante de sindicalização"], nivel_aprovacao_requerido: nivelPorPercentual(40), ativo: true },
  { id: "5", codigo: "COL", descricao: "Filhos de Func. do IESJE Sindicalizados (SAAE) - 50%", percentual_fixo: 50, eh_variavel: false, documentos_necessarios: ["Vínculo com IESJE", "Comprovante de sindicalização SAAE"], nivel_aprovacao_requerido: nivelPorPercentual(50), ativo: true },
  { id: "6", codigo: "SAE", descricao: "Filhos de Func. Outros Estabelec. Sindicalizados (SAAE) - 40%", percentual_fixo: 40, eh_variavel: false, documentos_necessarios: ["Comprovante de vínculo empregatício", "Comprovante SAAE"], nivel_aprovacao_requerido: nivelPorPercentual(40), ativo: true },
  { id: "7", codigo: "LEC", descricao: "Filho de Maçom Regular Estrela Caldense Não Sócio - 30%", percentual_fixo: 30, eh_variavel: false, documentos_necessarios: ["Declaração da Loja Maçônica"], nivel_aprovacao_requerido: nivelPorPercentual(30), ativo: true },
  { id: "8", codigo: "FBM", descricao: "Filho de Maçom Regular Estrela Caldense Sócio - 50%", percentual_fixo: 50, eh_variavel: false, documentos_necessarios: ["Declaração da Loja Maçônica com comprovação de associação"], nivel_aprovacao_requerido: nivelPorPercentual(50), ativo: true },
  { id: "9", codigo: "MAC", descricao: "Filhos Maçom Regular de Outras Lojas - 10%", percentual_fixo: 10, eh_variavel: false, documentos_necessarios: ["Declaração de Loja Maçônica"], nivel_aprovacao_requerido: nivelPorPercentual(10), ativo: true },
  { id: "10", codigo: "NEC", descricao: "Netos de Maçom Estrela Caldense - 20%", percentual_fixo: 20, eh_variavel: false, documentos_necessarios: ["Declaração de Loja Maçônica"] , nivel_aprovacao_requerido: nivelPorPercentual(20), ativo: true },
  { id: "11", codigo: "ABI", descricao: "Bolsa Integral Filantropia - 100%", percentual_fixo: 100, eh_variavel: false, documentos_necessarios: ["Processo de filantropia completo"], nivel_aprovacao_requerido: "DIRECAO", ativo: true },
  { id: "12", codigo: "ABP", descricao: "Bolsa Parcial Filantropia - 50%", percentual_fixo: 50, eh_variavel: false, documentos_necessarios: ["Processo de filantropia completo"], nivel_aprovacao_requerido: nivelPorPercentual(50), ativo: true },
  { id: "13", codigo: "PAV", descricao: "Pagamento à Vista - 15%", percentual_fixo: 15, eh_variavel: false, documentos_necessarios: ["Comprovante de pagamento integral"], nivel_aprovacao_requerido: nivelPorPercentual(15), ativo: true },
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

// Sugestão automática da próxima série
export function proximaSerie(serieAtual?: string): string | undefined {
  if (!serieAtual) return undefined;
  const idx = SERIES_ANO.findIndex((s) => normaliza(s) === normaliza(serieAtual));
  if (idx === -1) return undefined;
  return SERIES_ANO[idx + 1];
}

function normaliza(s: string) {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}

