export type StatusMatricula = "NOVA" | "REMATRICULA" | "ATIVA" | "CANCELADA" | "PENDENTE";
export type StatusDesconto = "SOLICITADO" | "EM_ANALISE" | "APROVADO" | "REJEITADO" | "EXPIRADO";
export type StatusDocumento = "PENDENTE" | "VALIDADO" | "REJEITADO" | "EXPIRADO";
export type NivelAprovacao = "AUTOMATICA" | "COORDENACAO" | "DIRECAO";

export interface Student {
  id: string;
  nome_completo: string;
  cpf: string;
  rg?: string | null;
  data_nascimento?: string | null; // ISO date
  sexo?: string | null;
  naturalidade?: string | null;
  nacionalidade?: string | null;
  nome_social?: string | null;
  necessidades_especiais?: string | null;
  observacoes_medicas?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Responsavel {
  id: string;
  student_id: string;
  tipo: string; // financeiro, pedagógico, etc.
  nome_completo: string;
  cpf: string;
  rg?: string | null;
  grau_parentesco?: string | null;
  profissao?: string | null;
  telefone_principal?: string | null;
  telefone_secundario?: string | null;
  email?: string | null;
  endereco_completo?: string | null;
  created_at?: string;
}

export interface Matricula {
  id: string;
  student_id: string;
  ano_letivo: number;
  serie_ano: string;
  turno: string;
  escola_origem?: string | null;
  atividades_extracurriculares?: string | null;
  status: StatusMatricula;
  data_matricula: string; // ISO date
  valor_mensalidade_base: number;
  valor_mensalidade_final: number;
  created_at?: string;
}

export interface TipoDesconto {
  id: string;
  codigo: string; // IIR, RES, PASS, ...
  descricao: string;
  percentual_fixo?: number | null;
  eh_variavel: boolean;
  documentos_necessarios: string[];
  nivel_aprovacao_requerido: NivelAprovacao;
  ativo: boolean;
  created_at?: string;
}

export interface Desconto {
  id: string;
  student_id: string;
  matricula_id?: string | null;
  tipo_desconto_id: string;
  codigo_desconto: string; // redundante p/ rastreio
  percentual_aplicado: number; // 0-100
  valor_desconto?: number | null;
  status_aprovacao: StatusDesconto;
  documentos_urls?: string[] | null;
  data_solicitacao: string; // ISO date
  data_aprovacao?: string | null;
  data_vencimento?: string | null;
  observacoes?: string | null;
  aprovado_por?: string | null;
  created_at?: string;
}

export interface Documento {
  id: string;
  student_id: string;
  desconto_id?: string | null;
  tipo_documento: string;
  url_arquivo: string;
  status_validacao: StatusDocumento;
  observacoes_validacao?: string | null;
  validado_por?: string | null;
  data_upload: string; // ISO date
  data_validacao?: string | null;
}

// ============================================================================
// TIPOS ESTENDIDOS PARA RESUMO PROFISSIONAL
// ============================================================================

export interface SerieCompleta {
  id: string;
  nome: string;
  ano_serie: string;
  valor_mensal_com_material: number;
  valor_material: number;
  valor_mensal_sem_material: number;
  ordem: number;
  escola: string;
  ativo: boolean;
}

export interface EscolaInfo {
  codigo: "pelicano" | "sete_setembro";
  nome: string;
  endereco?: string;
  telefone?: string;
  email?: string;
  diretor?: string;
}

export interface MatriculaCompleta extends Matricula {
  // Dados acadêmicos expandidos
  escola_matricula?: "pelicano" | "sete_setembro";
  escola_nome?: string;
  serie_dados?: SerieCompleta;
  trilho_escolhido?: string;
  nivel_aprovacao_necessario?: NivelAprovacao;
  
  // Timestamps detalhados
  data_inicio_processo?: string; // ISO date
  data_ultima_atualizacao?: string; // ISO date
  protocolo_matricula?: string; // Número único da matrícula
  
  // Observações e status
  observacoes_gerais?: string;
  documentos_pendentes?: string[];
  aprovacao_status?: "PENDENTE" | "PARCIAL" | "COMPLETA";
}

export interface ResponsavelCompleto extends Responsavel {
  // Dados de contato expandidos
  endereco?: {
    cep?: string;
    logradouro?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    cidade?: string;
    uf?: string;
  };
  // Status de validação
  documentos_validados?: boolean;
  data_ultima_verificacao?: string;
}

export interface ResumoMatricula {
  // Identificação
  protocolo: string;
  data_geracao: string;
  status_geral: "RASCUNHO" | "PENDENTE_APROVACAO" | "APROVADA" | "REJEITADA";
  
  // Dados do aluno
  aluno: Student;
  
  // Dados acadêmicos
  matricula: MatriculaCompleta;
  escola: EscolaInfo;
  
  // Responsáveis
  responsaveis: ResponsavelCompleto[];
  
  // Endereço
  endereco: {
    cep: string;
    logradouro: string;
    numero?: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    uf: string;
    classificacao_cep?: "alta_renda" | "baixa_renda" | "fora_pocos";
  };
  
  // Descontos
  descontos: Desconto[];
  trilho_desconto?: {
    nome: string;
    titulo: string;
    descricao: string;
    cap_maximo: number;
    icone?: string;
  };
  
  // Resumo financeiro
  financeiro: {
    valor_base_com_material: number;
    valor_base_sem_material: number;
    valor_material: number;
    total_desconto_percentual: number;
    total_desconto_valor: number;
    valor_final: number;
    economia_mensal: number;
    economia_anual: number;
    cap_utilizado: number;
    cap_maximo: number;
    cap_atingido: boolean;
  };
  
  // Documentação
  documentos_necessarios: string[];
  documentos_enviados: Documento[];
  documentos_pendentes: string[];
  
  // Aprovações
  aprovacoes_necessarias: {
    nivel: NivelAprovacao;
    responsavel?: string;
    data_aprovacao?: string;
    observacoes?: string;
    status: "PENDENTE" | "APROVADA" | "REJEITADA";
  }[];
  
  // Metadados
  gerado_por?: string;
  versao_sistema?: string;
  hash_validacao?: string; // Para QR Code
}
