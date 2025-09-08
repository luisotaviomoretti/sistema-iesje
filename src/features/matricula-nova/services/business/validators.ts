import { VALIDATION_RULES, ERROR_MESSAGES } from '../../constants/validation'

/**
 * Resultado de validação individual
 */
export interface ValidationResult {
  valid: boolean
  message?: string
}

/**
 * Validadores individuais para campos do formulário
 */
export const validators = {
  /**
   * Valida nome (aluno ou responsável)
   */
  name: (value: string): ValidationResult => {
    if (!value || value.trim().length < VALIDATION_RULES.MIN_NAME_LENGTH) {
      return {
        valid: false,
        message: ERROR_MESSAGES.MIN_NAME_LENGTH
      }
    }

    if (value.length > VALIDATION_RULES.MAX_NAME_LENGTH) {
      return {
        valid: false,
        message: ERROR_MESSAGES.MAX_NAME_LENGTH
      }
    }

    // Verificar se contém apenas letras e espaços
    const namePattern = /^[a-zA-ZÀ-ÿ\s]+$/
    if (!namePattern.test(value)) {
      return {
        valid: false,
        message: 'Nome deve conter apenas letras e espaços'
      }
    }

    return { valid: true }
  },

  /**
   * Valida CPF
   */
  cpf: (value: string): ValidationResult => {
    if (!value) {
      return {
        valid: false,
        message: ERROR_MESSAGES.REQUIRED_CPF
      }
    }

    // Verificar formato
    if (!VALIDATION_RULES.CPF_REGEX.test(value)) {
      return {
        valid: false,
        message: ERROR_MESSAGES.INVALID_CPF
      }
    }

    // Validar dígitos verificadores
    const cleanCpf = value.replace(/\D/g, '')
    
    // Verificar se todos os dígitos são iguais
    if (/^(\d)\1+$/.test(cleanCpf)) {
      return {
        valid: false,
        message: ERROR_MESSAGES.INVALID_CPF_DIGITS
      }
    }

    // Validação matemática do CPF
    let sum = 0
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cleanCpf[i]) * (10 - i)
    }
    let remainder = (sum * 10) % 11
    if (remainder === 10 || remainder === 11) remainder = 0
    if (remainder !== parseInt(cleanCpf[9])) {
      return {
        valid: false,
        message: ERROR_MESSAGES.INVALID_CPF_DIGITS
      }
    }

    sum = 0
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cleanCpf[i]) * (11 - i)
    }
    remainder = (sum * 10) % 11
    if (remainder === 10 || remainder === 11) remainder = 0
    if (remainder !== parseInt(cleanCpf[10])) {
      return {
        valid: false,
        message: ERROR_MESSAGES.INVALID_CPF_DIGITS
      }
    }

    return { valid: true }
  },

  /**
   * Valida RG (opcional)
   */
  rg: (value: string): ValidationResult => {
    if (!value) {
      return { valid: true } // RG é opcional
    }

    // Formato básico do RG: XX.XXX.XXX-X
    const rgPattern = /^\d{2}\.\d{3}\.\d{3}-\d{1}$/
    if (!rgPattern.test(value)) {
      return {
        valid: false,
        message: 'RG deve estar no formato 00.000.000-0'
      }
    }

    return { valid: true }
  },

  /**
   * Valida data de nascimento
   */
  birthDate: (value: string): ValidationResult => {
    if (!value) {
      return {
        valid: false,
        message: ERROR_MESSAGES.REQUIRED_BIRTH_DATE
      }
    }

    const date = new Date(value)
    if (isNaN(date.getTime())) {
      return {
        valid: false,
        message: ERROR_MESSAGES.INVALID_DATE
      }
    }

    // Verificar idade
    const today = new Date()
    const age = today.getFullYear() - date.getFullYear()
    const monthDiff = today.getMonth() - date.getMonth()
    const adjustedAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate()) 
      ? age - 1 
      : age

    if (adjustedAge < VALIDATION_RULES.MIN_AGE) {
      return {
        valid: false,
        message: ERROR_MESSAGES.MIN_AGE
      }
    }

    if (adjustedAge > VALIDATION_RULES.MAX_AGE) {
      return {
        valid: false,
        message: ERROR_MESSAGES.MAX_AGE
      }
    }

    return { valid: true }
  },

  /**
   * Valida telefone
   */
  phone: (value: string, required: boolean = true): ValidationResult => {
    if (!value) {
      return {
        valid: !required,
        message: required ? ERROR_MESSAGES.REQUIRED_PHONE : undefined
      }
    }

    if (!VALIDATION_RULES.PHONE_REGEX.test(value)) {
      return {
        valid: false,
        message: ERROR_MESSAGES.INVALID_PHONE
      }
    }

    return { valid: true }
  },

  /**
   * Valida email
   */
  email: (value: string, required: boolean = true): ValidationResult => {
    if (!value) {
      return {
        valid: !required,
        message: required ? ERROR_MESSAGES.REQUIRED_EMAIL : undefined
      }
    }

    if (!VALIDATION_RULES.EMAIL_REGEX.test(value)) {
      return {
        valid: false,
        message: ERROR_MESSAGES.INVALID_EMAIL
      }
    }

    return { valid: true }
  },

  /**
   * Valida CEP
   */
  cep: (value: string): ValidationResult => {
    if (!value) {
      return {
        valid: false,
        message: ERROR_MESSAGES.REQUIRED_CEP
      }
    }

    if (!VALIDATION_RULES.CEP_REGEX.test(value)) {
      return {
        valid: false,
        message: ERROR_MESSAGES.INVALID_CEP
      }
    }

    return { valid: true }
  },

  /**
   * Valida campos de endereço (logradouro, bairro, cidade)
   */
  address: (value: string): ValidationResult => {
    if (!value || value.trim().length < VALIDATION_RULES.MIN_ADDRESS_LENGTH) {
      return {
        valid: false,
        message: ERROR_MESSAGES.MIN_ADDRESS_LENGTH
      }
    }

    if (value.length > VALIDATION_RULES.MAX_ADDRESS_LENGTH) {
      return {
        valid: false,
        message: ERROR_MESSAGES.MAX_ADDRESS_LENGTH
      }
    }

    return { valid: true }
  },

  /**
   * Valida número do endereço
   */
  addressNumber: (value: string): ValidationResult => {
    if (!value || value.trim().length === 0) {
      return {
        valid: false,
        message: 'Número do endereço é obrigatório'
      }
    }

    // Permitir números e letras (ex: 123A, S/N)
    const numberPattern = /^[0-9A-Za-z\s/-]+$/
    if (!numberPattern.test(value)) {
      return {
        valid: false,
        message: 'Número deve conter apenas letras, números e símbolos básicos'
      }
    }

    return { valid: true }
  },

  /**
   * Valida relacionamento do responsável
   */
  guardianRelationship: (value: string): ValidationResult => {
    if (!value) {
      return {
        valid: false,
        message: 'Relacionamento é obrigatório'
      }
    }

    const validRelationships = [
      'pai', 'mae', 'avo', 'ava', 'tio', 'tia', 
      'irmao', 'irma', 'tutor', 'responsavel'
    ]

    if (!validRelationships.includes(value)) {
      return {
        valid: false,
        message: 'Selecione um relacionamento válido'
      }
    }

    return { valid: true }
  },

  /**
   * Valida seleção de gênero
   */
  gender: (value: string): ValidationResult => {
    if (!value) {
      return {
        valid: false,
        message: 'Sexo é obrigatório'
      }
    }

    if (!['M', 'F', 'other'].includes(value)) {
      return {
        valid: false,
        message: 'Selecione uma opção válida'
      }
    }

    return { valid: true }
  },

  /**
   * Valida seleção de turno
   */
  shift: (value: string): ValidationResult => {
    if (!value) {
      return {
        valid: false,
        message: 'Turno é obrigatório'
      }
    }

    if (!['morning', 'afternoon', 'night'].includes(value)) {
      return {
        valid: false,
        message: 'Selecione um turno válido'
      }
    }

    return { valid: true }
  },

  /**
   * Valida seleção de série
   */
  series: (value: string): ValidationResult => {
    if (!value) {
      return {
        valid: false,
        message: ERROR_MESSAGES.REQUIRED_SERIES
      }
    }

    return { valid: true }
  },

  /**
   * Valida seleção de trilho
   */
  track: (value: string): ValidationResult => {
    if (!value) {
      return {
        valid: false,
        message: 'Trilho de desconto é obrigatório'
      }
    }

    return { valid: true }
  }
}