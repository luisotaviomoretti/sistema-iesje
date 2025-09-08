import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { PDFTemplatesV2, PDF_CONFIG_V2, type ProposalDataV2 } from './pdfTemplatesV2'
import type { EnrollmentFormData } from '../../types/forms'
import type { PricingCalculation } from '../../types/business'

export interface ProposalData {
  formData: EnrollmentFormData
  pricing: PricingCalculation | null
  seriesInfo?: {
    id: string
    nome: string
    valor_material?: number
    valor_mensal_sem_material?: number
    valor_mensal_com_material?: number
  }
  trackInfo?: {
    id: string
    nome: string
    cap_maximo?: number
    tipo?: string
  }
  discountsInfo?: Array<{
    id: string
    codigo: string
    nome: string
    percentual_maximo?: number
    categoria?: string
  }>
  approvalInfo?: {
    level: string
    description: string
  }
}

export class ProposalGeneratorV2 {
  private doc: jsPDF
  private templates: PDFTemplatesV2

  constructor() {
    this.doc = new jsPDF(PDF_CONFIG_V2)
    this.templates = new PDFTemplatesV2(this.doc)
  }

  /**
   * Gera uma proposta de matrícula em PDF - Versão otimizada
   */
  public async generateProposal(data: ProposalData): Promise<Blob> {
    try {
      // Validar dados de entrada
      const validatedData = this.validateAndSanitizeData(data)
      
      // Gerar PDF usando templates V2
      this.templates.generateProposal(validatedData)
      
      // Retornar blob
      const pdfBlob = this.doc.output('blob')
      return pdfBlob
      
    } catch (error) {
      console.error('[ProposalGeneratorV2] Erro ao gerar PDF:', error)
      throw new Error(`Falha na geração do PDF: ${error.message}`)
    }
  }

  /**
   * Gera PDF e força download
   */
  public async downloadProposal(data: ProposalData): Promise<void> {
    try {
      const blob = await this.generateProposal(data)
      const filename = this.generateFilename(data)
      
      // Criar URL e fazer download
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
    } catch (error) {
      console.error('[ProposalGeneratorV2] Erro no download:', error)
      throw error
    }
  }

  /**
   * Gera preview do PDF
   */
  public async generatePreview(data: ProposalData): Promise<string> {
    try {
      const blob = await this.generateProposal(data)
      return URL.createObjectURL(blob)
    } catch (error) {
      console.error('[ProposalGeneratorV2] Erro ao gerar preview:', error)
      throw error
    }
  }

  /**
   * Valida e sanitiza dados de entrada
   */
  private validateAndSanitizeData(data: ProposalData): ProposalDataV2 {
    // Sanitizar strings para evitar problemas de encoding
    const sanitize = (text: string | undefined | null): string => {
      if (!text) return 'N/A'
      
      return String(text)
        .normalize('NFD') // Normalizar caracteres Unicode
        .replace(/[\u0300-\u036f]/g, '') // Remover diacríticos
        .replace(/[^\x20-\x7E\u00A0-\u00FF]/g, '') // Manter apenas caracteres seguros
        .trim()
    }

    // Função para sanitizar objetos recursivamente
    const sanitizeObject = (obj: any): any => {
      if (!obj || typeof obj !== 'object') return obj
      
      const sanitized: any = Array.isArray(obj) ? [] : {}
      
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
          sanitized[key] = sanitize(value)
        } else if (typeof value === 'object') {
          sanitized[key] = sanitizeObject(value)
        } else {
          sanitized[key] = value
        }
      }
      
      return sanitized
    }

    // Validar dados essenciais
    if (!data.formData) {
      throw new Error('Dados do formulário são obrigatórios')
    }

    // Sanitizar todos os dados
    const sanitizedFormData = sanitizeObject(data.formData)
    
    // Garantir que campos essenciais existem
    const validatedData: ProposalDataV2 = {
      formData: {
        student: sanitizedFormData.student || {},
        guardians: sanitizedFormData.guardians || {},
        address: sanitizedFormData.address || {},
        academic: sanitizedFormData.academic || {},
        selectedDiscounts: sanitizedFormData.selectedDiscounts || []
      },
      pricing: data.pricing,
      seriesInfo: sanitizeObject(data.seriesInfo),
      trackInfo: sanitizeObject(data.trackInfo),
      discountsInfo: sanitizeObject(data.discountsInfo),
      approvalInfo: sanitizeObject(data.approvalInfo)
    }

    return validatedData
  }

  /**
   * Gera nome do arquivo PDF
   */
  private generateFilename(data: ProposalData): string {
    const studentName = data.formData?.student?.name || 'Aluno'
    const date = new Date().toISOString().split('T')[0]
    
    // Sanitizar nome para filename
    const safeName = studentName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 30)
    
    return `Proposta_Matricula_${safeName}_${date}.pdf`
  }

  /**
   * Limpa recursos
   */
  public dispose(): void {
    // Limpar referências
    this.doc = null as any
    this.templates = null as any
  }
}

// Funções utilitárias para uso externo (compatibilidade)
export async function generateProposalPDF(data: ProposalData): Promise<void> {
  const generator = new ProposalGeneratorV2()
  try {
    await generator.downloadProposal(data)
  } finally {
    generator.dispose()
  }
}

export async function generateProposalPreview(data: ProposalData): Promise<string> {
  const generator = new ProposalGeneratorV2()
  try {
    return await generator.generatePreview(data)
  } finally {
    generator.dispose()
  }
}

export async function generateProposalBlob(data: ProposalData): Promise<Blob> {
  const generator = new ProposalGeneratorV2()
  try {
    return await generator.generateProposal(data)
  } finally {
    generator.dispose()
  }
}