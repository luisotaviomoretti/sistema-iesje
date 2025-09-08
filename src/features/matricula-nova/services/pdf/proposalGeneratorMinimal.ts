import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { PDFTemplatesMinimal, PDF_CONFIG_MINIMAL, type ProposalDataMinimal } from './pdfTemplatesMinimal'
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

export class ProposalGeneratorMinimal {
  private doc: jsPDF
  private templates: PDFTemplatesMinimal

  constructor() {
    this.doc = new jsPDF(PDF_CONFIG_MINIMAL)
    this.templates = new PDFTemplatesMinimal(this.doc)
  }

  /**
   * Gera proposta minimalista e profissional
   */
  public async generateProposal(data: ProposalData): Promise<Blob> {
    try {
      console.log('[ProposalGeneratorMinimal] Iniciando geração do PDF')
      
      // Validar e limpar dados
      const cleanData = this.sanitizeData(data)
      
      // Gerar PDF com design minimalista
      this.templates.generateProposal(cleanData)
      
      // Retornar blob
      const pdfBlob = this.doc.output('blob')
      console.log('[ProposalGeneratorMinimal] PDF gerado com sucesso')
      
      return pdfBlob
      
    } catch (error) {
      console.error('[ProposalGeneratorMinimal] Erro ao gerar PDF:', error)
      throw new Error(`Falha na geração do PDF minimalista: ${error.message}`)
    }
  }

  /**
   * Download direto do PDF
   */
  public async downloadProposal(data: ProposalData): Promise<void> {
    try {
      const blob = await this.generateProposal(data)
      const filename = this.generateFilename(data)
      
      // Criar e clicar no link de download
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      console.log('[ProposalGeneratorMinimal] Download concluído:', filename)
      
    } catch (error) {
      console.error('[ProposalGeneratorMinimal] Erro no download:', error)
      throw error
    }
  }

  /**
   * Gera URL de preview
   */
  public async generatePreview(data: ProposalData): Promise<string> {
    try {
      const blob = await this.generateProposal(data)
      return URL.createObjectURL(blob)
    } catch (error) {
      console.error('[ProposalGeneratorMinimal] Erro ao gerar preview:', error)
      throw error
    }
  }

  /**
   * Sanitiza dados para evitar problemas de renderização
   */
  private sanitizeData(data: ProposalData): ProposalDataMinimal {
    // Função para limpar strings
    const cleanString = (text: string | undefined | null): string => {
      if (!text) return 'N/A'
      
      return String(text)
        .normalize('NFD') // Normalizar Unicode
        .replace(/[\u0300-\u036f]/g, '') // Remover acentos se necessário
        .replace(/[^\x20-\x7E\u00A0-\u00FF\u0100-\u017F]/g, '') // Manter apenas caracteres seguros
        .trim()
        .substring(0, 200) // Limitar tamanho
    }

    // Função recursiva para sanitizar objetos
    const sanitizeObject = (obj: any): any => {
      if (!obj || typeof obj !== 'object') {
        return typeof obj === 'string' ? cleanString(obj) : obj
      }
      
      const sanitized: any = Array.isArray(obj) ? [] : {}
      
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
          sanitized[key] = cleanString(value)
        } else if (typeof value === 'object') {
          sanitized[key] = sanitizeObject(value)
        } else {
          sanitized[key] = value
        }
      }
      
      return sanitized
    }

    // Validações básicas
    if (!data?.formData) {
      throw new Error('Dados do formulário são obrigatórios')
    }

    // Estrutura de dados limpa
    const sanitizedData: ProposalDataMinimal = {
      formData: {
        student: sanitizeObject(data.formData.student) || {},
        guardians: sanitizeObject(data.formData.guardians) || {},
        address: sanitizeObject(data.formData.address) || {},
        academic: sanitizeObject(data.formData.academic) || {},
        selectedDiscounts: Array.isArray(data.formData.selectedDiscounts) 
          ? data.formData.selectedDiscounts.map(d => sanitizeObject(d))
          : []
      },
      pricing: data.pricing,
      seriesInfo: sanitizeObject(data.seriesInfo),
      trackInfo: sanitizeObject(data.trackInfo),
      discountsInfo: Array.isArray(data.discountsInfo) 
        ? data.discountsInfo.map(d => sanitizeObject(d))
        : [],
      approvalInfo: sanitizeObject(data.approvalInfo)
    }

    return sanitizedData
  }

  /**
   * Gera nome do arquivo
   */
  private generateFilename(data: ProposalData): string {
    const studentName = data.formData?.student?.name || 'Aluno'
    const date = new Date().toISOString().split('T')[0]
    
    // Nome limpo para arquivo
    const safeName = studentName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 25)
    
    return `Proposta_Matricula_${safeName}_${date}.pdf`
  }

  /**
   * Limpeza de recursos
   */
  public dispose(): void {
    this.doc = null as any
    this.templates = null as any
  }
}

// Funções de conveniência para compatibilidade com código existente
export async function generateProposalPDF(data: ProposalData): Promise<void> {
  const generator = new ProposalGeneratorMinimal()
  try {
    await generator.downloadProposal(data)
  } finally {
    generator.dispose()
  }
}

export async function generateProposalPreview(data: ProposalData): Promise<string> {
  const generator = new ProposalGeneratorMinimal()
  try {
    return await generator.generatePreview(data)
  } finally {
    generator.dispose()
  }
}

export async function generateProposalBlob(data: ProposalData): Promise<Blob> {
  const generator = new ProposalGeneratorMinimal()
  try {
    return await generator.generateProposal(data)
  } finally {
    generator.dispose()
  }
}