import React from 'react'
import { z } from 'zod'
import { VALIDATION_RULES, ERROR_MESSAGES } from '../../constants/validation'

// Schema para dados do estudante
const studentSchema = z.object({
  name: z.string()
    .min(VALIDATION_RULES.MIN_NAME_LENGTH, ERROR_MESSAGES.MIN_NAME_LENGTH)
    .max(VALIDATION_RULES.MAX_NAME_LENGTH, ERROR_MESSAGES.MAX_NAME_LENGTH)
    .trim(),
  
  // CPF passa a ser OPCIONAL no fluxo de nova matrícula
  // Quando informado, será validado pelos validadores individuais
  cpf: z.string().optional().or(z.literal('')),
  
  rg: z.string()
    .optional()
    .or(z.literal('')),
  
  birthDate: z.string()
    .refine(isValidDate, 'Data inválida')
    .refine(isValidAge, 'Idade inválida'),
  
  gender: z.enum(['M', 'F', 'other'], {
    errorMap: () => ({ message: 'Sexo é obrigatório' })
  }),
  
  escola: z.enum(['pelicano', 'sete_setembro'], {
    errorMap: () => ({ message: 'Escola é obrigatória' })
  })
})

// Schema para responsável
const guardianSchema = z.object({
  name: z.string()
    .min(VALIDATION_RULES.MIN_NAME_LENGTH, ERROR_MESSAGES.MIN_NAME_LENGTH)
    .max(VALIDATION_RULES.MAX_NAME_LENGTH, ERROR_MESSAGES.MAX_NAME_LENGTH)
    .trim(),
  
  // CPF do responsável também opcional
  cpf: z.string().optional().or(z.literal('')),
  
  phone: z.string()
    .regex(VALIDATION_RULES.PHONE_REGEX, ERROR_MESSAGES.INVALID_PHONE),
  
  email: z.string()
    .email(ERROR_MESSAGES.INVALID_EMAIL),
  
  relationship: z.string()
    .min(1, ERROR_MESSAGES.REQUIRED_FIELD)
})

// Schema para dados dos responsáveis
const guardiansSchema = z.object({
  guardian1: guardianSchema,
  guardian2: guardianSchema.optional()
})

// Schema para endereço
const addressSchema = z.object({
  cep: z.string()
    .regex(VALIDATION_RULES.CEP_REGEX, ERROR_MESSAGES.INVALID_CEP),
  
  street: z.string()
    .min(VALIDATION_RULES.MIN_ADDRESS_LENGTH, ERROR_MESSAGES.MIN_ADDRESS_LENGTH)
    .max(VALIDATION_RULES.MAX_ADDRESS_LENGTH, ERROR_MESSAGES.MAX_ADDRESS_LENGTH)
    .trim(),
  
  number: z.string()
    .min(1, ERROR_MESSAGES.REQUIRED_FIELD)
    .trim(),
  
  complement: z.string()
    .max(VALIDATION_RULES.MAX_ADDRESS_LENGTH)
    .optional()
    .or(z.literal('')),
  
  district: z.string()
    .min(2, 'Bairro deve ter pelo menos 2 caracteres')
    .max(100)
    .trim(),
  
  city: z.string()
    .min(2, 'Cidade deve ter pelo menos 2 caracteres')
    .max(100)
    .trim(),
  
  state: z.string()
    .length(2, 'Estado deve ter 2 caracteres')
    .toUpperCase()
})

// Schema para dados acadêmicos
const academicSchema = z.object({
  seriesId: z.string()
    .min(1, ERROR_MESSAGES.REQUIRED_SERIES),
  
  // trackId removido deste passo; será validado no passo de Descontos
  trackId: z.string().optional().or(z.literal('')).optional(),
  
  shift: z.enum(['morning', 'afternoon', 'night'], {
    errorMap: () => ({ message: 'Turno deve ser manhã, tarde ou noite' })
  })
})

// Schema principal do formulário
export const enrollmentSchema = z.object({
  student: studentSchema.nullable().refine(
    (data) => data !== null, 
    { message: 'Dados do aluno são obrigatórios' }
  ),
  
  guardians: guardiansSchema.nullable().refine(
    (data) => data !== null,
    { message: 'Dados dos responsáveis são obrigatórios' }
  ),
  
  address: addressSchema.nullable().refine(
    (data) => data !== null,
    { message: 'Dados de endereço são obrigatórios' }
  ),
  
  academic: academicSchema.nullable().refine(
    (data) => data !== null,
    { message: 'Dados acadêmicos são obrigatórios' }
  ),
  
  selectedDiscounts: z.array(z.string()).default([]),
  
  currentStep: z.number().min(0).max(6).default(0),
  
  isSubmitting: z.boolean().default(false),
  
  errors: z.record(z.string()).default({})
})

// Schemas para validação de steps individuais
export const studentStepSchema = z.object({
  student: studentSchema
})

export const guardiansStepSchema = z.object({
  guardians: guardiansSchema
})

export const addressStepSchema = z.object({
  address: addressSchema
})

export const academicStepSchema = z.object({
  academic: academicSchema
})

export const discountsStepSchema = z.object({
  selectedDiscounts: z.array(z.string()),
  academic: academicSchema.nullable()
}).refine(
  (data) => {
    // Validar que descontos não excedem limite
    // Esta validação seria mais robusta com dados reais dos descontos
    return data.selectedDiscounts.length <= 5 // Limite arbitrário
  },
  { message: 'Muitos descontos selecionados' }
)

// Funções de validação personalizadas

/**
 * Valida se o CPF é válido
 */
function isValidCpf(cpf: string): boolean {
  const cleanCpf = cpf.replace(/\D/g, '')
  
  if (cleanCpf.length !== 11) return false
  if (/^(\d)\1+$/.test(cleanCpf)) return false // Todos os dígitos iguais

  // Validação do primeiro dígito verificador
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCpf[i]) * (10 - i)
  }
  let remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== parseInt(cleanCpf[9])) return false

  // Validação do segundo dígito verificador
  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCpf[i]) * (11 - i)
  }
  remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== parseInt(cleanCpf[10])) return false

  return true
}

/**
 * Valida se a data é válida
 */
function isValidDate(dateString: string): boolean {
  const date = new Date(dateString)
  return !isNaN(date.getTime()) && date < new Date()
}

/**
 * Valida se a idade está dentro dos limites
 */
function isValidAge(dateString: string): boolean {
  const today = new Date()
  const birthDate = new Date(dateString)
  
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  
  return age >= VALIDATION_RULES.MIN_AGE && age <= VALIDATION_RULES.MAX_AGE
}

/**
 * Valida um step específico do formulário de forma menos rigorosa para navegação
 */
export function validateStep(stepNumber: number, formData: any): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []
  
  try {
    switch (stepNumber) {
      case 0: // Dados do aluno - Validação básica para navegação
        if (formData.student?.name) {
          // Validação básica de nome
          if (!formData.student.name.trim()) {
            errors.push('Nome do aluno é obrigatório')
          }
        }
        return { isValid: errors.length === 0, errors }
      
      case 1: // Responsáveis - Validação básica
        if (formData.guardians?.guardian1?.name) {
          if (!formData.guardians.guardian1.name.trim()) {
            errors.push('Nome do responsável é obrigatório')
          }
          if (formData.guardians.guardian1.email && !VALIDATION_RULES.EMAIL_REGEX.test(formData.guardians.guardian1.email)) {
            errors.push('Email deve ter formato válido')
          }
          if (formData.guardians.guardian1.phone && !VALIDATION_RULES.PHONE_REGEX.test(formData.guardians.guardian1.phone)) {
            errors.push('Telefone deve estar no formato correto')
          }
        }
        return { isValid: errors.length === 0, errors }
      
      case 2: // Endereço - Validação básica
        if (formData.address?.cep && !VALIDATION_RULES.CEP_REGEX.test(formData.address.cep)) {
          errors.push('CEP deve estar no formato correto')
        }
        return { isValid: errors.length === 0, errors }
      
      case 3: // Acadêmico - Sempre válido para navegação básica
        return { isValid: true, errors: [] }
      
      case 4: // Descontos - Sempre válido para navegação básica  
        return { isValid: true, errors: [] }
      
      default:
        return { isValid: true, errors: [] }
    }
  } catch (error) {
    return { isValid: false, errors: ['Erro de validação desconhecido'] }
  }
}

/**
 * Valida todo o formulário antes do envio
 */
export function validateFullForm(formData: any): {
  isValid: boolean
  errors: Record<string, string[]>
  stepErrors: Record<number, string[]>
} {
  const errors: Record<string, string[]> = {}
  const stepErrors: Record<number, string[]> = {}
  
  try {
    enrollmentSchema.parse(formData)
    return { isValid: true, errors: {}, stepErrors: {} }
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Organizar erros por campo e step
      error.errors.forEach(err => {
        const path = err.path.join('.')
        const message = err.message
        
        if (!errors[path]) {
          errors[path] = []
        }
        errors[path].push(message)
        
        // Mapear erros para steps
        const stepNumber = getStepFromPath(err.path[0] as string)
        if (stepNumber > 0) {
          if (!stepErrors[stepNumber]) {
            stepErrors[stepNumber] = []
          }
          stepErrors[stepNumber].push(message)
        }
      })
    }
    
    return { 
      isValid: false, 
      errors, 
      stepErrors 
    }
  }
}

/**
 * Mapeia campo do formulário para número do step
 */
function getStepFromPath(fieldPath: string): number {
  const stepMap: Record<string, number> = {
    'student': 0,
    'guardians': 1,
    'address': 2,
    'academic': 3,
    'selectedDiscounts': 4
  }
  
  return stepMap[fieldPath] ?? 0
}

/**
 * Valida campos obrigatórios de um step
 */
export function validateRequiredFields(stepNumber: number, formData: any): {
  hasRequiredFields: boolean
  missingFields: string[]
} {
  const missingFields: string[] = []
  
  switch (stepNumber) {
    case 0: // Dados do aluno
      if (!formData.student?.name?.trim()) missingFields.push('Nome do aluno')
      if (!formData.student?.birthDate) missingFields.push('Data de nascimento')
      if (!formData.student?.gender) missingFields.push('Sexo do aluno')
      if (!formData.student?.escola) missingFields.push('Escola do aluno')
      break
      
    case 1: // Responsáveis
      if (!formData.guardians?.guardian1?.name?.trim()) missingFields.push('Nome do responsável')
      if (!formData.guardians?.guardian1?.phone?.trim()) missingFields.push('Telefone do responsável')
      if (!formData.guardians?.guardian1?.email?.trim()) missingFields.push('Email do responsável')
      break
      
    case 2: // Endereço
      if (!formData.address?.cep?.trim()) missingFields.push('CEP')
      if (!formData.address?.street?.trim()) missingFields.push('Logradouro')
      if (!formData.address?.number?.trim()) missingFields.push('Número')
      if (!formData.address?.city?.trim()) missingFields.push('Cidade')
      break
      
    case 3: // Acadêmico
      if (!formData.academic?.seriesId) missingFields.push('Série')
      if (!formData.academic?.shift) missingFields.push('Turno')
      break
    
    case 4: // Descontos — exigir trilho definido aqui
      if (!formData.academic?.trackId) missingFields.push('Trilho de desconto')
      break
  }
  
  return {
    hasRequiredFields: missingFields.length === 0,
    missingFields
  }
}

/**
 * Validadores individuais para uso nos componentes
 */
export const validators = {
  /**
   * Validar CPF
   */
  cpf: (value: string): { valid: boolean; message: string } => {
    // CPF passa a ser opcional: quando vazio, é considerado válido (sem mensagem)
    if (!value) return { valid: true, message: '' }
    
    const cleanValue = value.replace(/\D/g, '')
    if (cleanValue.length !== 11) {
      return { valid: false, message: 'CPF deve ter 11 dígitos' }
    }
    
    if (!isValidCpf(value)) {
      return { valid: false, message: 'CPF inválido' }
    }
    
    return { valid: true, message: 'CPF válido' }
  },

  /**
   * Validar email
   */
  email: (value: string, required = false): { valid: boolean; message: string } => {
    if (!value) {
      return required 
        ? { valid: false, message: 'Email é obrigatório' }
        : { valid: true, message: '' }
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(value)) {
      return { valid: false, message: 'Formato de email inválido' }
    }
    
    return { valid: true, message: 'Email válido' }
  },

  /**
   * Validar telefone
   */
  phone: (value: string, required = false): { valid: boolean; message: string } => {
    if (!value) {
      return required 
        ? { valid: false, message: 'Telefone é obrigatório' }
        : { valid: true, message: '' }
    }
    
    const cleanValue = value.replace(/\D/g, '')
    if (cleanValue.length < 10 || cleanValue.length > 11) {
      return { valid: false, message: 'Telefone deve ter 10 ou 11 dígitos' }
    }
    
    const phoneRegex = /^\(\d{2}\) \d{4,5}-\d{4}$/
    if (!phoneRegex.test(value)) {
      return { valid: false, message: 'Formato: (11) 99999-9999' }
    }
    
    return { valid: true, message: 'Telefone válido' }
  },

  /**
   * Validar campo obrigatório
   */
  required: (value: any): { valid: boolean; message: string } => {
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      return { valid: false, message: 'Este campo é obrigatório' }
    }
    return { valid: true, message: '' }
  },

  /**
   * Validar nome
   */
  name: (value: string): { valid: boolean; message: string } => {
    if (!value || value.trim() === '') {
      return { valid: false, message: 'Nome é obrigatório' }
    }
    
    if (value.trim().length < 3) {
      return { valid: false, message: 'Nome deve ter pelo menos 3 caracteres' }
    }
    
    if (value.trim().length > 100) {
      return { valid: false, message: 'Nome deve ter no máximo 100 caracteres' }
    }
    
    // Validar se contém apenas letras, espaços e acentos
    const nameRegex = /^[a-zA-ZÀ-ÿ\s]+$/
    if (!nameRegex.test(value)) {
      return { valid: false, message: 'Nome deve conter apenas letras' }
    }
    
    return { valid: true, message: 'Nome válido' }
  },

  /**
   * Validar data de nascimento
   */
  birthDate: (value: string): { valid: boolean; message: string } => {
    if (!value) {
      return { valid: false, message: 'Data de nascimento é obrigatória' }
    }
    
    const date = new Date(value)
    if (isNaN(date.getTime())) {
      return { valid: false, message: 'Data inválida' }
    }
    
    // Verificar se não é data futura
    if (date > new Date()) {
      return { valid: false, message: 'Data não pode ser futura' }
    }
    
    // Verificar idade mínima e máxima
    const today = new Date()
    let age = today.getFullYear() - date.getFullYear()
    const monthDiff = today.getMonth() - date.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
      age--
    }
    
    if (age < VALIDATION_RULES.MIN_AGE) {
      return { valid: false, message: `Idade mínima: ${VALIDATION_RULES.MIN_AGE} anos` }
    }
    
    if (age > VALIDATION_RULES.MAX_AGE) {
      return { valid: false, message: `Idade máxima: ${VALIDATION_RULES.MAX_AGE} anos` }
    }
    
    return { valid: true, message: 'Data válida' }
  },

  /**
   * Validar CEP
   */
  cep: (value: string): { valid: boolean; message: string } => {
    if (!value) {
      return { valid: false, message: 'CEP é obrigatório' }
    }
    
    const cleanValue = value.replace(/\D/g, '')
    if (cleanValue.length !== 8) {
      return { valid: false, message: 'CEP deve ter 8 dígitos' }
    }
    
    const cepRegex = /^\d{5}-\d{3}$/
    if (!cepRegex.test(value)) {
      return { valid: false, message: 'Formato: 00000-000' }
    }
    
    return { valid: true, message: 'CEP válido' }
  },

  /**
   * Validar campo de texto simples
   */
  text: (value: string, minLength = 1, maxLength = 255): { valid: boolean; message: string } => {
    if (!value || value.trim() === '') {
      return { valid: false, message: 'Campo é obrigatório' }
    }
    
    if (value.trim().length < minLength) {
      return { valid: false, message: `Mínimo ${minLength} caracteres` }
    }
    
    if (value.trim().length > maxLength) {
      return { valid: false, message: `Máximo ${maxLength} caracteres` }
    }
    
    return { valid: true, message: 'Campo válido' }
  },

  /**
   * Validar RG
   */
  rg: (value: string): { valid: boolean; message: string } => {
    if (!value) return { valid: true, message: '' } // RG é opcional
    
    const cleanValue = value.replace(/\D/g, '')
    if (cleanValue.length < 7 || cleanValue.length > 9) {
      return { valid: false, message: 'RG deve ter entre 7 e 9 dígitos' }
    }
    
    return { valid: true, message: 'RG válido' }
  },

  /**
   * Validar seleção obrigatória
   */
  select: (value: string): { valid: boolean; message: string } => {
    if (!value || value === '') {
      return { valid: false, message: 'Seleção é obrigatória' }
    }
    
    return { valid: true, message: 'Seleção válida' }
  }
}

/**
 * Hook para usar validadores individuais
 */
export function useFieldValidator(value: any, validatorType: keyof typeof validators, ...args: any[]) {
  const [feedback, setFeedback] = React.useState<{
    isValid: boolean
    isInvalid: boolean
    message: string
  }>({
    isValid: false,
    isInvalid: false,
    message: ''
  })

  React.useEffect(() => {
    if (!value) {
      setFeedback({ isValid: false, isInvalid: false, message: '' })
      return
    }

    const validator = validators[validatorType] as (...args: any[]) => { valid: boolean; message: string }
    const result = validator(value, ...args)
    
    setFeedback({
      isValid: result.valid,
      isInvalid: !result.valid,
      message: result.message
    })
  }, [value, validatorType, ...args])

  return feedback
}

// Tipos derivados dos schemas
export type EnrollmentFormSchema = z.infer<typeof enrollmentSchema>
export type StudentSchema = z.infer<typeof studentSchema>
export type GuardianSchema = z.infer<typeof guardianSchema>
export type GuardiansSchema = z.infer<typeof guardiansSchema>
export type AddressSchema = z.infer<typeof addressSchema>
export type AcademicSchema = z.infer<typeof academicSchema>
