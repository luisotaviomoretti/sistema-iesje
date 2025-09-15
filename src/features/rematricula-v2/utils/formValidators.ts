/**
 * Validadores e utilitários para o formulário de rematrícula
 * Funções auxiliares independentes para validação e formatação
 */

// Validação de CPF
export function validateCPF(cpf: string): boolean {
  const cleanCPF = cpf.replace(/\D/g, '')
  
  if (cleanCPF.length !== 11) return false
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false
  
  // Validação do primeiro dígito
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (10 - i)
  }
  let digit = 11 - (sum % 11)
  if (digit >= 10) digit = 0
  if (digit !== parseInt(cleanCPF.charAt(9))) return false
  
  // Validação do segundo dígito
  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (11 - i)
  }
  digit = 11 - (sum % 11)
  if (digit >= 10) digit = 0
  if (digit !== parseInt(cleanCPF.charAt(10))) return false
  
  return true
}

// Formatação de CPF
export function formatCPF(cpf: string): string {
  const clean = cpf.replace(/\D/g, '')
  if (clean.length !== 11) return cpf
  return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

// Limpeza de CPF (apenas dígitos)
export function cleanCPF(cpf: string): string {
  return cpf.replace(/\D/g, '')
}

// Validação de telefone
export function validatePhone(phone: string): boolean {
  const cleanPhone = phone.replace(/\D/g, '')
  return cleanPhone.length === 10 || cleanPhone.length === 11
}

// Formatação de telefone
export function formatPhone(phone: string): string {
  const clean = phone.replace(/\D/g, '')
  
  if (clean.length === 11) {
    return clean.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  } else if (clean.length === 10) {
    return clean.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
  }
  
  return phone
}

// Validação de CEP
export function validateCEP(cep: string): boolean {
  const cleanCEP = cep.replace(/\D/g, '')
  return cleanCEP.length === 8
}

// Formatação de CEP
export function formatCEP(cep: string): string {
  const clean = cep.replace(/\D/g, '')
  if (clean.length !== 8) return cep
  return clean.replace(/(\d{5})(\d{3})/, '$1-$2')
}

// Validação de e-mail
export function validateEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return regex.test(email)
}

// Normalização de nome (capitalização)
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

// Validação de idade mínima/máxima baseada na data de nascimento
export function validateAge(birthDate: string, minAge = 3, maxAge = 25): boolean {
  const birth = new Date(birthDate)
  const today = new Date()
  const age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  
  const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate()) 
    ? age - 1 
    : age
  
  return actualAge >= minAge && actualAge <= maxAge
}

// Cálculo de idade
export function calculateAge(birthDate: string): number {
  const birth = new Date(birthDate)
  const today = new Date()
  const age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  
  return monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate()) 
    ? age - 1 
    : age
}

// Validação de campos obrigatórios
export function validateRequiredFields(data: Record<string, any>, requiredFields: string[]): {
  isValid: boolean
  missingFields: string[]
} {
  const missingFields: string[] = []
  
  requiredFields.forEach(field => {
    const value = field.split('.').reduce((obj, key) => obj?.[key], data)
    if (!value || (typeof value === 'string' && !value.trim())) {
      missingFields.push(field)
    }
  })
  
  return {
    isValid: missingFields.length === 0,
    missingFields
  }
}

// Comparação de objetos para detectar mudanças
export function hasFormChanges(original: any, current: any): boolean {
  return JSON.stringify(original) !== JSON.stringify(current)
}

// Sanitização de entrada (remove caracteres especiais perigosos)
export function sanitizeInput(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim()
}

// Validação de relacionamento/parentesco
export function validateRelationship(relationship: string): boolean {
  const validRelationships = [
    'Pai', 'Mãe', 'Avô', 'Avó', 'Tio', 'Tia', 
    'Irmão', 'Irmã', 'Padrasto', 'Madrasta', 
    'Responsável Legal', 'Tutor', 'Outro'
  ]
  return validRelationships.includes(relationship)
}

// Validação de turno
export function validateShift(shift: string): boolean {
  return ['morning', 'afternoon', 'evening'].includes(shift)
}

// Formatação de turno para exibição
export function formatShift(shift: string): string {
  const shifts: Record<string, string> = {
    'morning': 'Manhã',
    'afternoon': 'Tarde',
    'evening': 'Noite'
  }
  return shifts[shift] || shift
}

// Validação de estado brasileiro
export function validateState(state: string): boolean {
  const states = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
    'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
    'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
  ]
  return states.includes(state.toUpperCase())
}

// Geração de mensagem de erro amigável
export function getFieldErrorMessage(field: string, errorType: string): string {
  const messages: Record<string, Record<string, string>> = {
    cpf: {
      required: 'CPF é obrigatório',
      invalid: 'CPF inválido',
      duplicate: 'CPF já cadastrado'
    },
    email: {
      required: 'E-mail é obrigatório',
      invalid: 'E-mail inválido',
      duplicate: 'E-mail já cadastrado'
    },
    phone: {
      required: 'Telefone é obrigatório',
      invalid: 'Telefone inválido. Use (XX) XXXXX-XXXX'
    },
    cep: {
      required: 'CEP é obrigatório',
      invalid: 'CEP inválido',
      notFound: 'CEP não encontrado'
    },
    birthDate: {
      required: 'Data de nascimento é obrigatória',
      invalid: 'Data de nascimento inválida',
      tooYoung: 'Idade mínima é 3 anos',
      tooOld: 'Idade máxima é 25 anos'
    }
  }
  
  return messages[field]?.[errorType] || `Erro no campo ${field}`
}

// Exportação de todos os validadores
export const formValidators = {
  cpf: validateCPF,
  phone: validatePhone,
  cep: validateCEP,
  email: validateEmail,
  age: validateAge,
  relationship: validateRelationship,
  shift: validateShift,
  state: validateState
}

// Exportação de todos os formatadores
export const formFormatters = {
  cpf: formatCPF,
  phone: formatPhone,
  cep: formatCEP,
  name: normalizeName,
  shift: formatShift
}

// Exportação de utilitários
export const formUtils = {
  cleanCPF,
  calculateAge,
  validateRequiredFields,
  hasFormChanges,
  sanitizeInput,
  getFieldErrorMessage
}