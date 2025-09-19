import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// Configuração otimizada para página única
export const PDF_CONFIG_V2 = {
  orientation: 'portrait' as const,
  unit: 'mm' as const,
  format: 'a4' as const,
  compress: true
}

// Cores profissionais e neutras
export const COLORS_V2 = {
  primary: '#2563eb',      // Azul institucional
  secondary: '#64748b',    // Cinza elegante  
  text: '#1e293b',         // Cinza escuro
  lightText: '#64748b',    // Texto secundário
  border: '#e2e8f0',       // Bordas suaves
  background: '#f8fafc',   // Fundo seções
  white: '#ffffff'
}

// Tipografia otimizada
export const FONTS_V2 = {
  title: { size: 16, style: 'bold' as const },
  section: { size: 12, style: 'bold' as const },
  label: { size: 9, style: 'bold' as const },
  text: { size: 9, style: 'normal' as const },
  small: { size: 8, style: 'normal' as const }
}

// Dimensões para página única
export const LAYOUT_V2 = {
  page: { width: 210, height: 297 },
  margins: { top: 15, right: 15, bottom: 15, left: 15 },
  contentWidth: 180,
  sections: {
    header: 25,      // Logo + Proposta info
    student: 35,     // Dados aluno + responsáveis
    location: 20,    // Endereço + acadêmico  
    discounts: 30,   // Descontos aplicados
    financial: 25,   // Resumo financeiro
    footer: 15       // Footer
  }
}

export interface ProposalDataV2 {
  formData: {
    student: any
    guardians: any
    address: any  
    academic: any
    selectedDiscounts: any[]
  }
  pricing: any
  seriesInfo?: any
  trackInfo?: any
  discountsInfo?: any[]
  approvalInfo?: any
}

export class PDFTemplatesV2 {
  private doc: jsPDF
  private currentY: number = LAYOUT_V2.margins.top

  constructor(doc: jsPDF) {
    this.doc = doc
  }

  /**
   * Gera proposta completa em página única
   */
  public generateProposal(data: ProposalDataV2): void {
    // Limpar e configurar
    this.currentY = LAYOUT_V2.margins.top
    this.doc.setFont('helvetica')
    
    // Header institucional
    this.drawHeader(data)
    
    // Seção dados pessoais (compacta)
    this.drawPersonalData(data)
    
    // Seção localização + acadêmico
    this.drawLocationAndAcademic(data)
    
    // Seção descontos
    this.drawDiscountsSection(data)
    
    // Seção financeira
    this.drawFinancialSummary(data)
    
    // Footer
    this.drawFooter()
  }

  /**
   * Header profissional com logo e informações da proposta
   */
  private drawHeader(data: ProposalDataV2): void {
    const { margins } = LAYOUT_V2
    
    // Fundo azul institucional
    this.doc.setFillColor(COLORS_V2.primary)
    this.doc.rect(0, 0, 210, 30, 'F')
    
    // Logo IESJE (simulado com texto estilizado)
    this.doc.setTextColor(COLORS_V2.white)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setFontSize(20)
    this.doc.text('IESJE', margins.left, 15)
    
    this.doc.setFontSize(10)
    this.doc.setFont('helvetica', 'normal')
    this.doc.text('Instituto São João da Escócia', margins.left, 20)
    
    // Informações da proposta (lado direito)
    const proposalNum = `2025${Date.now().toString().slice(-6)}`
    const currentDate = new Date().toLocaleDateString('pt-BR')
    
    this.doc.setFont('helvetica', 'bold')
    this.doc.setFontSize(12)
    const proposalText = `PROPOSTA DE MATRÍCULA`
    this.doc.text(proposalText, 210 - margins.right - this.doc.getTextWidth(proposalText), 12)
    
    this.doc.setFont('helvetica', 'normal')
    this.doc.setFontSize(9)
    const proposalInfo = [
      `Proposta Nº: ${proposalNum}`,
      `Data: ${currentDate}`
    ]
    
    proposalInfo.forEach((line, index) => {
      this.doc.text(line, 210 - margins.right - this.doc.getTextWidth(line), 18 + (index * 4))
    })
    
    this.currentY = 35
  }

  /**
   * Dados pessoais em layout compacto (2 colunas)
   */
  private drawPersonalData(data: ProposalDataV2): void {
    const startY = this.currentY
    const { student, guardians } = data.formData
    const colWidth = LAYOUT_V2.contentWidth / 2 - 5
    
    // Título da seção
    this.drawSectionTitle('DADOS DO ALUNO', 'A')
    
    // Coluna 1 - Aluno
    this.doc.setTextColor(COLORS_V2.text)
    
    const studentFields = [
      { label: 'Nome:', value: student?.name || 'N/A' },
      { label: 'CPF:', value: this.formatCPF(student?.cpf) || 'N/A' },
      { label: 'RG:', value: student?.rg || 'Não informado' },
      { label: 'Data de Nascimento:', value: student?.birthDate ? 
        new Date(student.birthDate).toLocaleDateString('pt-BR') : 'N/A' },
      { label: 'Gênero:', value: student?.gender || 'N/A' },
      { label: 'Escola:', value: student?.currentSchool || 'N/A' }
    ]

    let fieldY = this.currentY
    studentFields.forEach(field => {
      this.drawField(field.label, field.value, LAYOUT_V2.margins.left, fieldY, colWidth)
      fieldY += 5
    })

    // Coluna 2 - Responsável principal
    const guardian1 = guardians?.guardian1
    if (guardian1) {
      this.drawSubsectionTitle('RESPONSÁVEL PRINCIPAL', LAYOUT_V2.margins.left + colWidth + 10, this.currentY)
      
      const guardianFields = [
        { label: 'Nome:', value: guardian1.name || 'N/A' },
        { label: 'CPF:', value: this.formatCPF(guardian1.cpf) || 'N/A' },  
        { label: 'Telefone:', value: this.formatPhone(guardian1.phone) || 'N/A' },
        { label: 'E-mail:', value: guardian1.email || 'N/A' },
        { label: 'Parentesco:', value: guardian1.relationship || 'N/A' }
      ]

      let guardianY = this.currentY + 6
      guardianFields.forEach(field => {
        this.drawField(field.label, field.value, LAYOUT_V2.margins.left + colWidth + 10, guardianY, colWidth)
        guardianY += 5
      })
    }

    this.currentY = Math.max(fieldY, this.currentY + 35)
  }

  /**
   * Endereço e informações acadêmicas em linha
   */
  private drawLocationAndAcademic(data: ProposalDataV2): void {
    const { address, academic } = data.formData
    const { seriesInfo, trackInfo } = data
    
    this.drawSectionTitle('ENDEREÇO RESIDENCIAL', 'B')
    
    // Endereço em linha compacta
    const fullAddress = [
      address?.street,
      address?.number,
      address?.neighborhood,
      address?.city,
      address?.state,
      this.formatCEP(address?.cep)
    ].filter(Boolean).join(', ')
    
    this.drawField('Endereço Completo:', fullAddress || 'N/A', LAYOUT_V2.margins.left, this.currentY, LAYOUT_V2.contentWidth)
    this.currentY += 8

    // Informações acadêmicas
    this.drawSectionTitle('INFORMAÇÕES ACADÊMICAS', 'C')
    
    const acadFields = [
      { label: 'Série:', value: seriesInfo?.nome || 'N/A' },
      { label: 'Trilho de Desconto:', value: trackInfo?.nome || 'N/A' },
      { label: 'Turno:', value: academic?.shift || 'Não informado' }
    ]

    acadFields.forEach(field => {
      this.drawField(field.label, field.value, LAYOUT_V2.margins.left, this.currentY, LAYOUT_V2.contentWidth / 3)
      this.currentY += 5
    })

    this.currentY += 5
  }

  /**
   * Seção de descontos aplicados
   */
  private drawDiscountsSection(data: ProposalDataV2): void {
    const { selectedDiscounts } = data.formData
    const { discountsInfo } = data
    
    this.drawSectionTitle('DESCONTOS SELECIONADOS', 'D')
    
    if (!selectedDiscounts?.length) {
      this.doc.setTextColor(COLORS_V2.lightText)
      this.doc.setFontSize(FONTS_V2.text.size)
      this.doc.text('Nenhum desconto aplicado', LAYOUT_V2.margins.left, this.currentY)
      this.currentY += 10
      return
    }

    // Tabela compacta de descontos
    const discountData = selectedDiscounts.map(selected => {
      const discount = discountsInfo?.find(d => d.id === selected.id)
      return [
        discount?.codigo || selected.id,
        discount?.nome || 'Desconto não identificado',
        `${selected.percentual || 0}%`
      ]
    })

    // Total de descontos
    const totalDiscount = selectedDiscounts.reduce((sum, d) => sum + (d.percentual || 0), 0)
    
    // Configurar tabela
    autoTable(this.doc, {
      startY: this.currentY,
      head: [['Código', 'Descrição', 'Percentual']],
      body: discountData,
      foot: [['', 'TOTAL DE DESCONTOS APLICADOS:', `${totalDiscount}%`]],
      margin: { left: LAYOUT_V2.margins.left, right: LAYOUT_V2.margins.right },
      styles: {
        fontSize: 8,
        cellPadding: 2
      },
      headStyles: {
        fillColor: COLORS_V2.primary,
        textColor: COLORS_V2.white,
        fontSize: 9,
        fontStyle: 'bold'
      },
      footStyles: {
        fillColor: COLORS_V2.primary,
        textColor: COLORS_V2.white,
        fontSize: 9,
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 110 },  
        2: { cellWidth: 25, halign: 'center' }
      }
    })

    this.currentY = (this.doc as any).lastAutoTable.finalY + 8
  }

  /**
   * Resumo financeiro com Totais Anuais (sem desconto)
   */
  private drawFinancialSummary(data: ProposalDataV2): void {
    const { pricing } = data
    
    if (!pricing?.isValid) {
      return
    }

    this.drawSectionTitle('RESUMO FINANCEIRO', 'E')
    
    // Valores principais em formato compacto
    const financialData: [string, string][] = [
      ['Valor Base da Série', this.formatCurrency(pricing.baseValue || 0)],
      ['Descontos Aplicados', `- ${this.formatCurrency(pricing.discountAmount || 0)}`],
      ['Valor Final Mensal', this.formatCurrency(pricing.finalValue || 0)]
    ]

    // Material didático se aplicável
    if (pricing.materialCost && pricing.materialCost > 0) {
      financialData.splice(1, 0, ['Material Didático', this.formatCurrency(pricing.materialCost)])
    }

    autoTable(this.doc, {
      startY: this.currentY,
      body: financialData,
      margin: { left: LAYOUT_V2.margins.left, right: LAYOUT_V2.margins.right },
      styles: {
        fontSize: 10,
        cellPadding: 3
      },
      columnStyles: {
        0: { cellWidth: 120, fontStyle: 'bold' },
        1: { cellWidth: 40, halign: 'right', fontStyle: 'bold', textColor: COLORS_V2.primary }
      },
      alternateRowStyles: { fillColor: COLORS_V2.background }
    })

    this.currentY = (this.doc as any).lastAutoTable.finalY + 5

    // Totais Anuais (sem desconto) — usar campos anuais do banco quando disponíveis; fallback x12
    const toNum = (v: any) => {
      const n = Number(v)
      return Number.isFinite(n) ? n : null
    }
    const round2 = (n: number) => Math.round((Number(n) + Number.EPSILON) * 100) / 100

    const mensalSem = toNum(data.seriesInfo?.valor_mensal_sem_material) ?? toNum(pricing.baseValue) ?? 0
    const mensalMat = toNum(data.seriesInfo?.valor_material) ?? toNum(pricing.materialCost) ?? 0
    const mensalCom = toNum(data.seriesInfo?.valor_mensal_com_material) ?? (mensalSem + mensalMat)

    const dbAnualSem = toNum((data.seriesInfo as any)?.valor_anual_sem_material)
    const dbAnualMat = toNum((data.seriesInfo as any)?.valor_anual_material)
    const dbAnualCom = toNum((data.seriesInfo as any)?.valor_anual_com_material)

    const derivedSem = round2(mensalSem * 12)
    const derivedMat = round2(mensalMat * 12)
    const derivedCom = round2(mensalCom * 12)

    const useDb = [dbAnualSem, dbAnualMat, dbAnualCom].some(v => typeof v === 'number')
    const annualBase = round2(dbAnualSem ?? derivedSem)
    const annualMat = round2(dbAnualMat ?? derivedMat)
    const annualCom = round2(dbAnualCom ?? (annualBase + annualMat))

    const annualData: [string, string][] = [
      ['Anual sem material', this.formatCurrency(annualBase)],
      ['Anual material', this.formatCurrency(annualMat)],
      ['Anual com material', this.formatCurrency(annualCom)],
    ]

    autoTable(this.doc, {
      startY: this.currentY,
      head: [['Totais Anuais (sem desconto)', 'Valor']],
      body: annualData,
      margin: { left: LAYOUT_V2.margins.left, right: LAYOUT_V2.margins.right },
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: COLORS_V2.primary, textColor: COLORS_V2.white, fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 120 }, 1: { cellWidth: 40, halign: 'right' } },
    })

    this.currentY = (this.doc as any).lastAutoTable.finalY + 3
    this.doc.setTextColor(COLORS_V2.lightText)
    this.doc.setFont('helvetica', 'normal')
    this.doc.setFontSize(FONTS_V2.small.size)
    const sourceText = `Fonte: ${useDb ? 'banco' : 'x12 (derivado)'}`
    this.doc.text(sourceText, LAYOUT_V2.margins.left, this.currentY)
    this.currentY += 3
  }

  /**
   * Footer com instruções
   */
  private drawFooter(): void {
    const footerY = 297 - 20 // 20mm do fim da página
    
    this.doc.setDrawColor(COLORS_V2.border)
    this.doc.line(LAYOUT_V2.margins.left, footerY - 5, 210 - LAYOUT_V2.margins.right, footerY - 5)
    
    this.doc.setTextColor(COLORS_V2.lightText)
    this.doc.setFontSize(FONTS_V2.small.size)
    this.doc.setFont('helvetica', 'normal')
    
    const instructions = [
      '• Gere e imprima a proposta em PDF',
      '• Entregue os documentos na secretaria em até 5 dias úteis',  
      '• Aguarde a confirmação da matrícula'
    ]
    
    instructions.forEach((instruction, index) => {
      this.doc.text(instruction, LAYOUT_V2.margins.left, footerY + (index * 4))
    })
    
    // Linha para assinatura
    this.doc.text('Assinatura do Responsável: ___________________________', 
      210 - LAYOUT_V2.margins.right - 80, footerY + 15)
    
    // Número da página
    this.doc.text('Página 1 de 1', 
      210 - LAYOUT_V2.margins.right - 20, 297 - 5)
  }

  /**
   * Utilitários de desenho
   */
  private drawSectionTitle(title: string, prefix: string): void {
    // Fundo colorido para seção
    this.doc.setFillColor(COLORS_V2.primary)
    this.doc.rect(LAYOUT_V2.margins.left - 2, this.currentY - 2, LAYOUT_V2.contentWidth + 4, 8, 'F')
    
    // Texto da seção
    this.doc.setTextColor(COLORS_V2.white)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setFontSize(FONTS_V2.section.size)
    this.doc.text(`${prefix} ${title}`, LAYOUT_V2.margins.left, this.currentY + 3)
    
    this.currentY += 12
  }

  private drawSubsectionTitle(title: string, x: number, y: number): void {
    this.doc.setTextColor(COLORS_V2.primary)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setFontSize(FONTS_V2.label.size)
    this.doc.text(title, x, y + 3)
  }

  private drawField(label: string, value: string, x: number, y: number, maxWidth: number): void {
    // Label
    this.doc.setTextColor(COLORS_V2.lightText)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setFontSize(FONTS_V2.label.size)
    const labelWidth = this.doc.getTextWidth(label)
    this.doc.text(label, x, y)
    
    // Value
    this.doc.setTextColor(COLORS_V2.text)
    this.doc.setFont('helvetica', 'normal')
    this.doc.setFontSize(FONTS_V2.text.size)
    
    const valueX = x + labelWidth + 2
    const availableWidth = maxWidth - labelWidth - 2
    const truncatedValue = this.truncateText(value, availableWidth)
    this.doc.text(truncatedValue, valueX, y)
  }

  /**
   * Utilitários de formatação
   */
  private formatCPF(cpf: string): string {
    if (!cpf) return ''
    const cleaned = cpf.replace(/\D/g, '')
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }

  private formatPhone(phone: string): string {
    if (!phone) return ''
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
    }
    return phone
  }

  private formatCEP(cep: string): string {
    if (!cep) return ''
    const cleaned = cep.replace(/\D/g, '')
    return cleaned.replace(/(\d{5})(\d{3})/, '$1-$2')
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  private truncateText(text: string, maxWidth: number): string {
    if (!text) return ''
    
    const currentWidth = this.doc.getTextWidth(text)
    if (currentWidth <= maxWidth) return text
    
    // Truncar com reticências
    let truncated = text
    while (this.doc.getTextWidth(truncated + '...') > maxWidth && truncated.length > 0) {
      truncated = truncated.slice(0, -1)
    }
    
    return truncated + '...'
  }
}