import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { PDFTemplates } from './pdfTemplates'
import { PDF_CONFIG, COLORS, formatDate } from './pdfStyles'
import { pdfCache, validateProposalData, sanitizeProposalData, generatePDFFilename } from '../../utils/pdfHelpers'
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

export class ProposalGenerator {
  private doc: jsPDF
  private templates: PDFTemplates
  private generationTimeout = 30000 // 30 segundos

  constructor() {
    this.doc = new jsPDF(PDF_CONFIG)
    this.templates = new PDFTemplates(this.doc)
  }

  /**
   * Gera uma proposta de matrícula em PDF com validação e cache
   */
  async generateProposal(data: ProposalData): Promise<Blob> {
    // Verificar cache primeiro
    const cached = pdfCache.get(data)
    if (cached) {
      console.log('PDF obtido do cache')
      return cached
    }

    // Validar dados
    const validation = validateProposalData(data)
    if (!validation.isValid) {
      console.error('Dados inválidos para geração de PDF:', validation.errors)
      throw new Error(`Dados inválidos: ${validation.errors.join(', ')}`)
    }

    // Sanitizar dados
    const sanitizedData = sanitizeProposalData(data)

    // Gerar com timeout
    const generator = new Promise<Blob>(async (resolve, reject) => {
      try {
        // Reinicializar documento para garantir limpeza
        this.doc = new jsPDF(PDF_CONFIG)
        this.templates = new PDFTemplates(this.doc)
        // Generate proposal number based on timestamp
        const proposalNumber = this.generateProposalNumber()
        
        // Draw header
        this.templates.drawHeader(proposalNumber)
        
        // Draw student section
        this.templates.drawStudentSection(sanitizedData.formData)
        
        // Draw guardians section
        this.templates.drawGuardiansSection(sanitizedData.formData)
        
        // Draw address section  
        this.templates.drawAddressSection(sanitizedData.formData)
        
        // Draw academic section
        this.templates.drawAcademicSection(
          sanitizedData.formData,
          sanitizedData.seriesInfo,
          sanitizedData.trackInfo
        )
        
        // Draw selected discounts if any
        if (sanitizedData.formData.selectedDiscounts && sanitizedData.formData.selectedDiscounts.length > 0) {
          this.drawDiscountsSection(sanitizedData)
        }
        
        // Draw financial section
        this.templates.drawFinancialSection(
          sanitizedData.pricing,
          sanitizedData.discountsInfo || []
        )
        
        // Draw approval info if needed
        if (sanitizedData.approvalInfo && sanitizedData.approvalInfo.level !== 'automatic') {
          this.drawApprovalSection(sanitizedData.approvalInfo)
        }
        
        // Add new page for terms and signature
        this.doc.addPage()
        this.templates.resetY()
        
        // Draw terms and conditions
        this.templates.drawTermsSection()
        
        // Draw signature section
        this.templates.drawSignatureSection()
        
        // Draw footer on all pages
        this.templates.drawFooter()
        
        // Generate blob
        const blob = this.doc.output('blob')
        
        // Armazenar no cache
        pdfCache.set(data, blob)
        
        resolve(blob)
      } catch (error) {
        console.error('Erro ao gerar PDF:', error)
        reject(error instanceof Error ? error : new Error('Falha ao gerar proposta de matrícula'))
      }
    })

    // Aplicar timeout
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Tempo limite excedido na geração do PDF')), this.generationTimeout)
    })

    try {
      return await Promise.race([generator, timeout])
    } catch (error) {
      // Limpar recursos em caso de erro
      this.cleanup()
      throw error
    }
  }

  /**
   * Gera e faz download do PDF
   */
  async generateAndDownload(data: ProposalData, filename?: string): Promise<void> {
    try {
      // Generate PDF
      const blob = await this.generateProposal(data)
      
      // Create new document from blob for download
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      
      // Generate filename if not provided
      const studentName = data.formData.student?.name || 'aluno'
      const finalFilename = filename || generatePDFFilename(studentName)
      
      link.download = finalFilename
      document.body.appendChild(link)
      link.click()
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      }, 100)
      
    } catch (error) {
      console.error('Erro ao gerar/baixar PDF:', error)
      throw error
    }
  }

  /**
   * Retorna o PDF como base64
   */
  async generateBase64(data: ProposalData): Promise<string> {
    try {
      await this.generateProposal(data)
      return this.doc.output('datauristring')
    } catch (error) {
      console.error('Erro ao gerar PDF base64:', error)
      throw error
    }
  }

  /**
   * Retorna o PDF como URL para preview
   */
  async generatePreviewURL(data: ProposalData): Promise<string> {
    try {
      const blob = await this.generateProposal(data)
      return URL.createObjectURL(blob)
    } catch (error) {
      console.error('Erro ao gerar URL de preview:', error)
      throw error
    }
  }

  /**
   * Draw discounts section
   */
  private drawDiscountsSection(data: ProposalData) {
    this.templates.drawSectionTitle('DESCONTOS SELECIONADOS', '💰')
    
    const selectedDiscounts = data.formData.selectedDiscounts || []
    const discountsInfo = data.discountsInfo || []
    
    // Group discounts by category
    const discountsByCategory = {
      especial: [] as any[],
      regular: [] as any[],
      negociacao: [] as any[]
    }
    
    selectedDiscounts.forEach(selected => {
      const info = discountsInfo.find(d => d.id === selected.id)
      if (info) {
        const category = info.categoria || 'regular'
        if (discountsByCategory[category as keyof typeof discountsByCategory]) {
          discountsByCategory[category as keyof typeof discountsByCategory].push({
            ...info,
            percentualAplicado: selected.percentual
          })
        }
      }
    })
    
    // Draw each category
    Object.entries(discountsByCategory).forEach(([category, discounts]) => {
      if (discounts.length > 0) {
        this.doc.setFont('helvetica', 'bold')
        this.doc.setFontSize(10)
        this.doc.setTextColor(COLORS.secondary)
        
        const categoryLabels: Record<string, string> = {
          especial: '⭐ Descontos Especiais',
          regular: '📊 Descontos Regulares',
          negociacao: '🤝 Descontos de Negociação'
        }
        
        this.doc.text(
          categoryLabels[category] || category,
          15,
          this.templates['currentY']
        )
        this.templates['currentY'] += 5
        
        // Draw discounts in category
        discounts.forEach((discount: any) => {
          this.templates.drawDataRow(
            `${discount.codigo} - ${discount.nome}`,
            `${discount.percentualAplicado.toFixed(1)}%`
          )
        })
        
        this.templates.addSpace(3)
      }
    })
    
    // Draw total
    const totalPercentage = selectedDiscounts.reduce((sum, d) => sum + d.percentual, 0)
    this.doc.setFillColor(COLORS.primary)
    this.doc.setTextColor(COLORS.white)
    const boxY = this.templates['currentY']
    this.doc.rect(15, boxY, 180, 8, 'F')
    
    this.doc.setFontSize(11)
    this.doc.text(
      `TOTAL DE DESCONTOS APLICADOS: ${totalPercentage.toFixed(1)}%`,
      105,
      boxY + 5,
      { align: 'center' }
    )
    
    this.templates['currentY'] = boxY + 12
  }

  /**
   * Draw approval section
   */
  private drawApprovalSection(approvalInfo: any) {
    this.templates.checkPageBreak(30)
    this.templates.drawSectionTitle('INFORMAÇÕES DE APROVAÇÃO', '⚠️')
    
    // Approval level box
    const levelColors: Record<string, string> = {
      coordinator: '#eab308',  // Yellow
      director: '#dc2626',      // Red
      special: '#7c3aed'        // Purple
    }
    
    const levelLabels: Record<string, string> = {
      coordinator: 'APROVAÇÃO DA COORDENAÇÃO',
      director: 'APROVAÇÃO DA DIREÇÃO',
      special: 'APROVAÇÃO ESPECIAL'
    }
    
    const color = levelColors[approvalInfo.level] || COLORS.primary
    
    this.doc.setFillColor(color)
    this.doc.setTextColor(COLORS.white)
    const boxY = this.templates['currentY']
    this.doc.rect(15, boxY, 180, 10, 'F')
    
    this.doc.setFontSize(11)
    this.doc.text(
      levelLabels[approvalInfo.level] || 'APROVAÇÃO NECESSÁRIA',
      105,
      boxY + 4,
      { align: 'center' }
    )
    
    this.doc.setFontSize(9)
    this.doc.text(
      approvalInfo.description,
      105,
      boxY + 8,
      { align: 'center' }
    )
    
    this.templates['currentY'] = boxY + 15
    
    // Additional info
    this.doc.setTextColor(COLORS.gray)
    this.doc.setFontSize(8)
    this.doc.text(
      'Obs: Esta matrícula será processada após aprovação do setor responsável.',
      15,
      this.templates['currentY']
    )
    
    this.templates['currentY'] += 10
  }

  /**
   * Generate proposal number
   */
  private generateProposalNumber(): string {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const timestamp = Date.now().toString().slice(-6)
    
    return `${year}${month}${day}-${timestamp}`
  }

  /**
   * Limpa recursos e reseta o documento
   */
  private cleanup(): void {
    try {
      // Resetar documento
      this.doc = new jsPDF(PDF_CONFIG)
      this.templates = new PDFTemplates(this.doc)
    } catch (error) {
      console.error('Erro ao limpar recursos do PDF:', error)
    }
  }
}

// Singleton instance
let proposalGeneratorInstance: ProposalGenerator | null = null

/**
 * Get or create ProposalGenerator instance
 */
export function getProposalGenerator(): ProposalGenerator {
  if (!proposalGeneratorInstance) {
    proposalGeneratorInstance = new ProposalGenerator()
  }
  return proposalGeneratorInstance
}

/**
 * Helper function to generate and download proposal
 */
export async function generateProposalPDF(data: ProposalData, filename?: string): Promise<void> {
  const generator = getProposalGenerator()
  await generator.generateAndDownload(data, filename)
}

/**
 * Helper function to generate proposal as blob
 */
export async function generateProposalBlob(data: ProposalData): Promise<Blob> {
  const generator = new ProposalGenerator() // New instance for each generation
  return await generator.generateProposal(data)
}

/**
 * Helper function to generate proposal preview URL
 */
export async function generateProposalPreview(data: ProposalData): Promise<string> {
  const generator = new ProposalGenerator() // New instance for each generation
  return await generator.generatePreviewURL(data)
}