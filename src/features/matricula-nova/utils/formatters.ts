/**
 * Utilitários de formatação para campos de formulário
 */

/**
 * Formatar CPF com máscara 000.000.000-00
 */
export function formatCPF(value: string): string {
  const numbers = value.replace(/\D/g, '')
  
  if (numbers.length <= 3) return numbers
  if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`
  if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`
  return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`
}

/**
 * Formatar telefone com máscara (00) 00000-0000 ou (00) 0000-0000
 */
export function formatPhone(value: string): string {
  const numbers = value.replace(/\D/g, '')
  
  if (numbers.length <= 2) return numbers.length > 0 ? `(${numbers}` : ''
  if (numbers.length <= 6) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`
  if (numbers.length <= 10) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`
  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`
}

/**
 * Formatar CEP com máscara 00000-000
 */
export function formatCEP(value: string): string {
  const numbers = value.replace(/\D/g, '')
  
  if (numbers.length <= 5) return numbers
  return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`
}

/**
 * Formatar RG com máscara 00.000.000-0
 */
export function formatRG(value: string): string {
  const numbers = value.replace(/\D/g, '')
  
  if (numbers.length <= 2) return numbers
  if (numbers.length <= 5) return `${numbers.slice(0, 2)}.${numbers.slice(2)}`
  if (numbers.length <= 8) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5)}`
  return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}-${numbers.slice(8, 9)}`
}

/**
 * Remover formatação de CPF
 */
export function cleanCPF(value: string): string {
  return value.replace(/\D/g, '')
}

/**
 * Normaliza CPF para armazenamento/consulta (apenas dígitos).
 * - Aceita string com máscara, null/undefined e retorna sempre string.
 * - Retorna string vazia quando não houver valor.
 */
export function normalizeCPF(value?: string | null): string {
  if (!value) return ''
  return value.replace(/\D/g, '')
}

/**
 * Alias em lowerCamelCase para conveniência (mesmo comportamento de normalizeCPF).
 */
export function normalizeCpf(value?: string | null): string {
  return normalizeCPF(value)
}

/**
 * Remover formatação de telefone
 */
export function cleanPhone(value: string): string {
  return value.replace(/\D/g, '')
}

/**
 * Remover formatação de CEP
 */
export function cleanCEP(value: string): string {
  return value.replace(/\D/g, '')
}

/**
 * Remover formatação de RG
 */
export function cleanRG(value: string): string {
  return value.replace(/\D/g, '')
}

/**
 * Formatar data no formato brasileiro dd/mm/aaaa
 */
export function formatDate(value: string): string {
  const numbers = value.replace(/\D/g, '')
  
  if (numbers.length <= 2) return numbers
  if (numbers.length <= 4) return `${numbers.slice(0, 2)}/${numbers.slice(2)}`
  return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`
}

/**
 * Converter data do formato brasileiro para ISO (aaaa-mm-dd)
 */
export function dateToISO(value: string): string {
  const cleaned = value.replace(/\D/g, '')
  if (cleaned.length !== 8) return ''
  
  const day = cleaned.slice(0, 2)
  const month = cleaned.slice(2, 4)
  const year = cleaned.slice(4, 8)
  
  return `${year}-${month}-${day}`
}

/**
 * Converter data ISO para formato brasileiro
 */
export function dateFromISO(value: string): string {
  if (!value) return ''
  
  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}

/**
 * Capitalizar primeira letra de cada palavra
 */
export function capitalizeWords(value: string): string {
  return value
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Formatar nome próprio (capitalizar, remover espaços extras)
 */
export function formatName(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, ' ') // Remove espaços extras
    .split(' ')
    .map(word => {
      // Não capitalizar preposições pequenas (exceto se for a primeira palavra)
      const lowercasePrepositions = ['da', 'de', 'do', 'das', 'dos', 'e']
      if (lowercasePrepositions.includes(word.toLowerCase()) && value.indexOf(word) > 0) {
        return word.toLowerCase()
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    })
    .join(' ')
}

/**
 * Validar se string contém apenas letras e espaços
 */
export function isOnlyLetters(value: string): boolean {
  return /^[a-zA-ZÀ-ÿ\s]+$/.test(value)
}

/**
 * Validar formato de email
 */
export function isValidEmailFormat(value: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(value)
}

/**
 * Gerar iniciais do nome (máximo 3 letras)
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(word => word.length > 0)
    .slice(0, 3)
    .map(word => word.charAt(0).toUpperCase())
    .join('')
}
