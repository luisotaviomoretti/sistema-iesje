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
