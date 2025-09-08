// Regras de validação
export const VALIDATION_RULES = {
  CPF_REGEX: /^\d{3}\.\d{3}\.\d{3}-\d{2}$/,
  CEP_REGEX: /^\d{5}-\d{3}$/,
  PHONE_REGEX: /^\(\d{2}\) \d{4,5}-\d{4}$/,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  
  // Comprimento de campos
  MIN_NAME_LENGTH: 3,
  MAX_NAME_LENGTH: 100,
  MIN_ADDRESS_LENGTH: 5,
  MAX_ADDRESS_LENGTH: 200,
  
  // Idades
  MIN_AGE: 3,
  MAX_AGE: 80,
  
  // Descontos
  MAX_DISCOUNT_PERCENTAGE: 101,
  MAX_INTEGRAL_DISCOUNT: 100,
  
  // CPF
  CPF_LENGTH: 14, // Com pontos e hífen
  CPF_NUMBERS_ONLY_LENGTH: 11
} as const

// Mensagens de erro
export const ERROR_MESSAGES = {
  // Campos obrigatórios
  REQUIRED_FIELD: 'Este campo é obrigatório',
  REQUIRED_NAME: 'Nome é obrigatório',
  REQUIRED_CPF: 'CPF é obrigatório',
  REQUIRED_BIRTH_DATE: 'Data de nascimento é obrigatória',
  REQUIRED_EMAIL: 'Email é obrigatório',
  REQUIRED_PHONE: 'Telefone é obrigatório',
  REQUIRED_CEP: 'CEP é obrigatório',
  REQUIRED_ADDRESS: 'Endereço é obrigatório',
  REQUIRED_SERIES: 'Série é obrigatória',
  
  // Formatos inválidos
  INVALID_CPF: 'CPF deve estar no formato 000.000.000-00',
  INVALID_CEP: 'CEP deve estar no formato 00000-000',
  INVALID_EMAIL: 'Email deve ter um formato válido',
  INVALID_PHONE: 'Telefone deve estar no formato (00) 0000-0000 ou (00) 00000-0000',
  INVALID_DATE: 'Data deve estar em formato válido',
  
  // Comprimentos
  MIN_NAME_LENGTH: 'Nome deve ter pelo menos 3 caracteres',
  MAX_NAME_LENGTH: 'Nome deve ter no máximo 100 caracteres',
  MIN_ADDRESS_LENGTH: 'Endereço deve ter pelo menos 5 caracteres',
  MAX_ADDRESS_LENGTH: 'Endereço deve ter no máximo 200 caracteres',
  
  // Idades
  MIN_AGE: 'Idade mínima é 3 anos',
  MAX_AGE: 'Idade máxima é 80 anos',
  INVALID_AGE: 'Idade deve ser um número válido',
  
  // Descontos
  MAX_DISCOUNT_EXCEEDED: 'Desconto máximo de 101% excedido (exceto bolsas integrais)',
  INCOMPATIBLE_DISCOUNTS: 'Descontos selecionados são incompatíveis',
  DISCOUNT_REQUIRES_DOCUMENT: 'Este desconto requer documentação',
  
  // CPF específicos
  CPF_ALREADY_EXISTS: 'CPF já cadastrado no sistema',
  INVALID_CPF_DIGITS: 'CPF contém dígitos inválidos',
  
  // CEP específicos
  CEP_NOT_FOUND: 'CEP não encontrado',
  CEP_SERVICE_UNAVAILABLE: 'Serviço de CEP indisponível',
  
  // Sistema
  NETWORK_ERROR: 'Erro de conexão. Tente novamente.',
  SAVE_ERROR: 'Erro ao salvar dados. Tente novamente.',
  LOAD_ERROR: 'Erro ao carregar dados. Tente novamente.',
  GENERIC_ERROR: 'Ocorreu um erro inesperado. Tente novamente.',
} as const

// Mensagens de sucesso
export const SUCCESS_MESSAGES = {
  ENROLLMENT_CREATED: 'Matrícula criada com sucesso!',
  DATA_SAVED: 'Dados salvos com sucesso!',
  STUDENT_FOUND: 'Aluno encontrado no sistema',
  CEP_FOUND: 'Endereço encontrado pelo CEP',
  DISCOUNT_APPLIED: 'Desconto aplicado com sucesso',
} as const

// Mensagens de aviso
export const WARNING_MESSAGES = {
  UNSAVED_CHANGES: 'Você tem alterações não salvas. Deseja continuar?',
  DISCOUNT_APPROVAL_REQUIRED: 'Este desconto requer aprovação da coordenação/direção',
  HIGH_DISCOUNT_WARNING: 'Desconto alto aplicado. Verifique documentação.',
  INCOMPLETE_DATA: 'Alguns dados estão incompletos',
  DUPLICATE_STUDENT_WARNING: 'Encontrado aluno com dados similares',
} as const

// Relacionamentos permitidos
export const GUARDIAN_RELATIONSHIPS = [
  { value: 'pai', label: 'Pai' },
  { value: 'mae', label: 'Mãe' },
  { value: 'avo', label: 'Avô' },
  { value: 'ava', label: 'Avó' },
  { value: 'tio', label: 'Tio' },
  { value: 'tia', label: 'Tia' },
  { value: 'irmao', label: 'Irmão' },
  { value: 'irma', label: 'Irmã' },
  { value: 'tutor', label: 'Tutor Legal' },
  { value: 'responsavel', label: 'Responsável' }
] as const

// Turnos disponíveis
export const SHIFTS = [
  { value: 'morning', label: 'Manhã' },
  { value: 'afternoon', label: 'Tarde' },
  { value: 'night', label: 'Noite' }
] as const

// Estados brasileiros
export const BRAZILIAN_STATES = [
  { value: 'AC', label: 'Acre' },
  { value: 'AL', label: 'Alagoas' },
  { value: 'AP', label: 'Amapá' },
  { value: 'AM', label: 'Amazonas' },
  { value: 'BA', label: 'Bahia' },
  { value: 'CE', label: 'Ceará' },
  { value: 'DF', label: 'Distrito Federal' },
  { value: 'ES', label: 'Espírito Santo' },
  { value: 'GO', label: 'Goiás' },
  { value: 'MA', label: 'Maranhão' },
  { value: 'MT', label: 'Mato Grosso' },
  { value: 'MS', label: 'Mato Grosso do Sul' },
  { value: 'MG', label: 'Minas Gerais' },
  { value: 'PA', label: 'Pará' },
  { value: 'PB', label: 'Paraíba' },
  { value: 'PR', label: 'Paraná' },
  { value: 'PE', label: 'Pernambuco' },
  { value: 'PI', label: 'Piauí' },
  { value: 'RJ', label: 'Rio de Janeiro' },
  { value: 'RN', label: 'Rio Grande do Norte' },
  { value: 'RS', label: 'Rio Grande do Sul' },
  { value: 'RO', label: 'Rondônia' },
  { value: 'RR', label: 'Roraima' },
  { value: 'SC', label: 'Santa Catarina' },
  { value: 'SP', label: 'São Paulo' },
  { value: 'SE', label: 'Sergipe' },
  { value: 'TO', label: 'Tocantins' }
] as const
