import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { PDFTemplatesCompact, PDF_CONFIG_COMPACT, type ProposalDataCompact } from './pdfTemplatesCompact'
import type { EnrollmentFormData } from '../../types/forms'
import type { PricingCalculation } from '../../types/business'
import { getSeriesAnnualValuesConfig } from '@/lib/config/config.service'

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
  // F4 — Observações da Forma de Pagamento (opcional)
  paymentNotes?: string
}

export class ProposalGeneratorCompact {
  private doc: jsPDF
  private templates: PDFTemplatesCompact

  constructor() {
    this.doc = new jsPDF(PDF_CONFIG_COMPACT)
    this.templates = new PDFTemplatesCompact(this.doc)
  }

  /**
   * Gera proposta compacta em 1 página
   */
  public async generateProposal(data: ProposalData): Promise<Blob> {
    try {
      console.log('[ProposalGeneratorCompact] Iniciando geração do PDF compacto')
      
      // F4 — Toggle: Valores Anuais
      const annualCfg = await getSeriesAnnualValuesConfig()

      // Validar e limpar dados
      const cleanData = this.sanitizeData(data)
      // Propagar flag anual para o template
      cleanData.annualModeEnabled = Boolean(annualCfg?.enabled)
      
      // Gerar PDF compacto
      this.templates.generateProposal(cleanData)
      
      // Retornar blob
      const pdfBlob = this.doc.output('blob')
      console.log('[ProposalGeneratorCompact] PDF compacto gerado com sucesso')
      
      return pdfBlob
      
    } catch (error) {
      console.error('[ProposalGeneratorCompact] Erro ao gerar PDF:', error)
      throw new Error(`Falha na geração do PDF compacto: ${error.message}`)
    }
  }

  /**
   * Download direto
   */
  public async downloadProposal(data: ProposalData): Promise<void> {
    try {
      const blob = await this.generateProposal(data)
      const filename = this.generateFilename(data)
      
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      console.log('[ProposalGeneratorCompact] Download concluído:', filename)
      
    } catch (error) {
      console.error('[ProposalGeneratorCompact] Erro no download:', error)
      throw error
    }
  }

  /**
   * Preview URL
   */
  public async generatePreview(data: ProposalData): Promise<string> {
    try {
      const blob = await this.generateProposal(data)
      return URL.createObjectURL(blob)
    } catch (error) {
      console.error('[ProposalGeneratorCompact] Erro ao gerar preview:', error)
      throw error
    }
  }

  /**
   * Sanitização de dados
   */
  private sanitizeData(data: ProposalData): ProposalDataCompact {
    const cleanString = (text: string | undefined | null): string => {
      if (!text) return ''
      
      return String(text)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\x20-\x7E\u00A0-\u00FF\u0100-\u017F]/g, '')
        .trim()
        .substring(0, 150) // Limitar para economia de espaço
    }

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

    if (!data?.formData) {
      throw new Error('Dados do formulário são obrigatórios')
    }

    const sanitizedData: ProposalDataCompact = {
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
      approvalInfo: sanitizeObject(data.approvalInfo),
      // Propagar notes sanitizadas (preserva quebras de linha e limita tamanho para caber no layout compacto)
      paymentNotes: (() => {
        const raw = data.paymentNotes || ''
        if (!raw) return ''
        try {
          let s = String(raw)
            .replace(/\r\n?/g, '\n')    // CRLF/CR -> LF
            .trim()
            .replace(/\n{3,}/g, '\n\n') // colapsa 3+ LFs
          // Remover caracteres não imprimíveis mantendo básico latino
          s = s
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^\x20-\x7E\u00A0-\u00FF\u0100-\u017F\n]/g, '')
          // Limitar para não estourar 1 página (valor conservador)
          if (s.length > 600) s = s.slice(0, 600)
          return s
        } catch {
          return ''
        }
      })()
    }

    // O sinalizador anual será definido no generateProposal após fetch do config
    // mas deixamos o campo existir no objeto
    sanitizedData.annualModeEnabled = Boolean((data as any).annualModeEnabled)

    // Adicionar cálculo de desconto percentual se não existir
    if (sanitizedData.pricing && !sanitizedData.pricing.discountPercent) {
      const baseValue = sanitizedData.seriesInfo?.valor_mensal_sem_material || sanitizedData.pricing.baseValue || 0
      const discountAmount = sanitizedData.pricing.discountAmount || 0
      
      if (baseValue > 0) {
        sanitizedData.pricing.discountPercent = Math.round((discountAmount / baseValue) * 100)
      }
    }

    return sanitizedData
  }

  /**
   * Nome do arquivo
   */
  private generateFilename(data: ProposalData): string {
    const studentName = data.formData?.student?.name || 'Aluno'
    const date = new Date().toISOString().split('T')[0]
    
    const safeName = studentName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 20)
    
    return `Proposta_${safeName}_${date}.pdf`
  }

  /**
   * Limpeza
   */
  public dispose(): void {
    this.doc = null as any
    this.templates = null as any
  }
}

// Funções de compatibilidade
export async function generateProposalPDF(data: ProposalData): Promise<void> {
  const generator = new ProposalGeneratorCompact()
  try {
    await generator.downloadProposal(data)
  } finally {
    generator.dispose()
  }
}

export async function generateProposalPreview(data: ProposalData): Promise<string> {
  const generator = new ProposalGeneratorCompact()
  try {
    return await generator.generatePreview(data)
  } finally {
    generator.dispose()
  }
}

export async function generateProposalBlob(data: ProposalData): Promise<Blob> {
  const generator = new ProposalGeneratorCompact()
  try {
    return await generator.generateProposal(data)
  } finally {
    generator.dispose()
  }
}