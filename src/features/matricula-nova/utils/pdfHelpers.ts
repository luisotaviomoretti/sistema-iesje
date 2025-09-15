/**
 * Utilitários para otimização e validação de PDF
 */

import type { ProposalData } from '../services/pdf/proposalGenerator'

/**
 * Cache de PDFs gerados para evitar regeneração desnecessária
 */
class PDFCache {
  private cache: Map<string, { blob: Blob; timestamp: number }> = new Map()
  private maxAge = 5 * 60 * 1000 // 5 minutos

  /**
   * Gera uma chave única baseada nos dados
   */
  private generateKey(data: ProposalData): string {
    const key = JSON.stringify({
      student: data.formData.student?.cpf,
      series: data.formData.academic?.seriesId,
      discounts: data.formData.selectedDiscounts?.map(d => `${d.id}-${d.percentual}`),
      pricing: data.pricing?.finalValue
    })
    return btoa(key)
  }

  /**
   * Obtém um PDF do cache se ainda válido
   */
  get(data: ProposalData): Blob | null {
    const key = this.generateKey(data)
    const cached = this.cache.get(key)
    
    if (!cached) return null
    
    const age = Date.now() - cached.timestamp
    if (age > this.maxAge) {
      this.cache.delete(key)
      return null
    }
    
    return cached.blob
  }

  /**
   * Armazena um PDF no cache
   */
  set(data: ProposalData, blob: Blob): void {
    const key = this.generateKey(data)
    this.cache.set(key, { blob, timestamp: Date.now() })
    
    // Limpar cache antigo
    this.cleanup()
  }

  /**
   * Limpa entradas antigas do cache
   */
  private cleanup(): void {
    const now = Date.now()
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.maxAge) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * Limpa todo o cache
   */
  clear(): void {
    this.cache.clear()
  }
}

// Instância singleton do cache
export const pdfCache = new PDFCache()

/**
 * Valida os dados antes de gerar o PDF
 */
export function validateProposalData(data: ProposalData): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  // Validar dados do aluno
  if (!data.formData.student?.name) {
    errors.push('Nome do aluno é obrigatório')
  }

  // Validar responsáveis
  if (!data.formData.guardians?.guardian1?.name) {
    errors.push('Responsável principal é obrigatório')
  }

  // Validar endereço
  if (!data.formData.address?.cep) {
    errors.push('CEP é obrigatório')
  }

  // Validar dados acadêmicos
  if (!data.formData.academic?.seriesId) {
    errors.push('Série deve ser selecionada')
  }
  if (!data.formData.academic?.trackId) {
    errors.push('Trilho deve ser selecionado')
  }

  // Validar pricing
  if (!data.pricing || data.pricing.finalValue <= 0) {
    errors.push('Cálculo de valores inválido')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Sanitiza dados para evitar problemas no PDF
 */
export function sanitizeProposalData(data: ProposalData): ProposalData {
  const sanitized = JSON.parse(JSON.stringify(data)) // Deep clone

  // Sanitizar strings
  const sanitizeString = (str: any): string => {
    if (typeof str !== 'string') return ''
    return str
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove caracteres de controle
      .replace(/[<>]/g, '') // Remove tags HTML básicas
      .trim()
  }

  // Recursivamente sanitizar todas as strings
  const sanitizeObject = (obj: any): any => {
    if (!obj) return obj
    
    if (typeof obj === 'string') {
      return sanitizeString(obj)
    }
    
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject)
    }
    
    if (typeof obj === 'object') {
      const result: any = {}
      for (const [key, value] of Object.entries(obj)) {
        result[key] = sanitizeObject(value)
      }
      return result
    }
    
    return obj
  }

  return sanitizeObject(sanitized) as ProposalData
}

/**
 * Debounce para evitar múltiplas gerações simultâneas
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null

  return function debounced(...args: Parameters<T>) {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(() => {
      func(...args)
      timeoutId = null
    }, wait)
  }
}

/**
 * Formata bytes para tamanho legível
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

/**
 * Verifica se o navegador suporta geração de PDF
 */
export function isPDFSupported(): boolean {
  // Verifica se as APIs necessárias estão disponíveis
  return !!(
    window.Blob &&
    window.URL &&
    window.URL.createObjectURL &&
    document.createElement('canvas').getContext
  )
}

/**
 * Gera um nome de arquivo único para o PDF
 */
export function generatePDFFilename(studentName: string, timestamp?: Date): string {
  const date = timestamp || new Date()
  const sanitizedName = studentName
    .toLowerCase()
    .replace(/[^a-z0-9]/gi, '_')
    .replace(/_+/g, '_')
    .substring(0, 30)
  
  const dateStr = date.toISOString().split('T')[0].replace(/-/g, '')
  const timeStr = date.getHours().toString().padStart(2, '0') + 
                  date.getMinutes().toString().padStart(2, '0')
  
  return `proposta_matricula_${sanitizedName}_${dateStr}_${timeStr}.pdf`
}