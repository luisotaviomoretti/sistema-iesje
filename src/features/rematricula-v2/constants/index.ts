/**
 * Constantes do Sistema de Rematrícula V2
 */

// Configurações padrão
export const DEFAULT_CONFIG = {
  autoProgressSeries: true,
  keepPreviousDiscounts: true,
  requireDocumentValidation: false,
  enablePartialSave: true,
} as const

// Timeouts e limites
export const TIMEOUTS = {
  validation: 5000,      // 5 segundos para validar CPF
  loadPreviousData: 10000, // 10 segundos para carregar dados anteriores
  submission: 30000,     // 30 segundos para submeter
} as const

// Mensagens do sistema
export const MESSAGES = {
  validation: {
    checking: 'Verificando CPF...',
    currentYear: 'Aluno já matriculado no ano corrente.',
    previousYear: 'Aluno elegível para rematrícula.',
    notFound: 'CPF não encontrado no sistema.',
    error: 'Erro ao validar CPF. Tente novamente.',
  },
  loading: {
    previousData: 'Carregando dados do ano anterior...',
    series: 'Carregando séries disponíveis...',
    tracks: 'Carregando trilhos...',
    discounts: 'Verificando descontos elegíveis...',
  },
  submission: {
    validating: 'Validando dados...',
    submitting: 'Enviando matrícula...',
    success: 'Rematrícula realizada com sucesso!',
    error: 'Erro ao enviar rematrícula. Tente novamente.',
  },
  errors: {
    requiredField: 'Campo obrigatório',
    invalidCPF: 'CPF inválido',
    invalidEmail: 'Email inválido',
    invalidPhone: 'Telefone inválido',
    invalidDate: 'Data inválida',
    invalidCEP: 'CEP inválido',
  }
} as const

// Regex para validações
export const REGEX = {
  cpf: /^\d{3}\.\d{3}\.\d{3}-\d{2}$/,
  cpfDigits: /^\d{11}$/,
  cep: /^\d{5}-?\d{3}$/,
  phone: /^\(\d{2}\) \d{4,5}-\d{4}$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  date: /^\d{4}-\d{2}-\d{2}$/,
} as const

// Mapeamento de relacionamentos
export const RELATIONSHIPS = [
  { value: 'father', label: 'Pai' },
  { value: 'mother', label: 'Mãe' },
  { value: 'grandfather', label: 'Avô' },
  { value: 'grandmother', label: 'Avó' },
  { value: 'uncle', label: 'Tio' },
  { value: 'aunt', label: 'Tia' },
  { value: 'legal_guardian', label: 'Responsável Legal' },
  { value: 'other', label: 'Outro' },
] as const

// Estados do Brasil
export const STATES = [
  { value: 'BA', label: 'Bahia' },
  { value: 'SP', label: 'São Paulo' },
  { value: 'RJ', label: 'Rio de Janeiro' },
  { value: 'MG', label: 'Minas Gerais' },
  // Adicionar outros estados conforme necessário
] as const

// Turnos disponíveis
export const SHIFTS = [
  { value: 'morning', label: 'Manhã' },
  { value: 'afternoon', label: 'Tarde' },
  { value: 'night', label: 'Noite' },
] as const

// Gêneros
export const GENDERS = [
  { value: 'M', label: 'Masculino' },
  { value: 'F', label: 'Feminino' },
  { value: 'other', label: 'Outro' },
] as const