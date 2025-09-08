import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// Configuração do PDF
export const PDF_CONFIG_MINIMAL = {
  orientation: 'portrait' as const,
  unit: 'mm' as const,
  format: 'a4' as const,
  compress: true
}

// Paleta minimalista (máximo 2 cores + cinza)
export const COLORS_MINIMAL = {
  primary: '#1e3a8a',      // Azul escuro corporativo
  text: '#000000',         // Preto para texto
  lightGray: '#f7f7f7',    // Cinza claro para separação
  mediumGray: '#666666',   // Cinza médio para subtítulos
  borderGray: '#e5e5e5',   // Cinza para bordas
  white: '#ffffff'
}

// Tipografia moderna e hierárquica
export const TYPOGRAPHY = {
  title: { size: 18, style: 'bold' as const },
  section: { size: 14, style: 'bold' as const },
  subtitle: { size: 11, style: 'bold' as const },
  body: { size: 10, style: 'normal' as const },
  small: { size: 9, style: 'normal' as const }
}

// Layout com margens amplas e grade consistente
export const LAYOUT_MINIMAL = {
  page: { width: 210, height: 297 },
  margins: { top: 25, right: 25, bottom: 25, left: 25 }, // Margens amplas
  contentWidth: 160, // 210 - 25 - 25
  lineHeight: 5,
  sectionSpacing: 12,
  elementSpacing: 4
}

export interface ProposalDataMinimal {
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

export class PDFTemplatesMinimal {
  private doc: jsPDF
  private currentY: number = LAYOUT_MINIMAL.margins.top

  constructor(doc: jsPDF) {
    this.doc = doc
    this.doc.setFont('helvetica') // Fonte moderna padrão
  }

  /**
   * Gera proposta com design minimalista e profissional
   */
  public generateProposal(data: ProposalDataMinimal): void {
    this.currentY = LAYOUT_MINIMAL.margins.top
    
    // Cabeçalho limpo
    this.drawMinimalHeader(data)
    
    // Seções organizadas com espaçamento consistente
    this.drawSection('A', 'DADOS DO ALUNO', () => this.drawStudentData(data))
    this.drawSection('B', 'DADOS DOS RESPONSÁVEIS', () => this.drawGuardiansData(data))
    this.drawSection('C', 'ENDEREÇO RESIDENCIAL', () => this.drawAddressData(data))
    this.drawSection('D', 'INFORMAÇÕES ACADÊMICAS', () => this.drawAcademicData(data))
    this.drawSection('E', 'DESCONTOS SELECIONADOS', () => this.drawDiscountsData(data))
    this.drawSection('F', 'RESUMO FINANCEIRO', () => this.drawFinancialSummary(data))
    
    // Rodapé minimalista
    this.drawMinimalFooter()
  }

  /**
   * Cabeçalho limpo com alinhamento esquerda/direita
   */
  private drawMinimalHeader(data: ProposalDataMinimal): void {
    const { margins } = LAYOUT_MINIMAL
    
    // Logotipo e nome da instituição (esquerda)
    this.doc.setTextColor(COLORS_MINIMAL.primary)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setFontSize(TYPOGRAPHY.title.size)
    this.doc.text('IESJE', margins.left, this.currentY)
    
    this.doc.setFont('helvetica', 'normal')
    this.doc.setFontSize(TYPOGRAPHY.body.size)
    this.doc.setTextColor(COLORS_MINIMAL.mediumGray)
    this.doc.text('Instituto São João da Escócia - IESJE', margins.left, this.currentY + 6)
    
    // Informações da proposta (direita)
    const proposalNum = `${new Date().getFullYear()}${Date.now().toString().slice(-6)}`
    const currentDate = new Date().toLocaleDateString('pt-BR')
    
    this.doc.setFont('helvetica', 'bold')
    this.doc.setFontSize(TYPOGRAPHY.section.size)
    this.doc.setTextColor(COLORS_MINIMAL.text)
    const proposalText = 'PROPOSTA DE MATRÍCULA'
    this.doc.text(proposalText, 210 - margins.right - this.doc.getTextWidth(proposalText), this.currentY)
    
    this.doc.setFont('helvetica', 'normal')
    this.doc.setFontSize(TYPOGRAPHY.small.size)
    this.doc.setTextColor(COLORS_MINIMAL.mediumGray)
    const proposalInfo = [
      `Nº ${proposalNum}`,
      `${currentDate}`
    ]
    
    proposalInfo.forEach((line, index) => {
      this.doc.text(line, 210 - margins.right - this.doc.getTextWidth(line), this.currentY + 6 + (index * 4))
    })
    
    this.currentY += 25
  }

  /**
   * Template padrão para seções com título e linha separadora
   */
  private drawSection(letter: string, title: string, contentCallback: () => void): void {
    // Título da seção em caixa alta
    this.doc.setTextColor(COLORS_MINIMAL.text)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setFontSize(TYPOGRAPHY.section.size)
    this.doc.text(`${letter}. ${title}`, LAYOUT_MINIMAL.margins.left, this.currentY)
    
    // Linha horizontal sutil
    this.currentY += 3
    this.doc.setDrawColor(COLORS_MINIMAL.borderGray)
    this.doc.setLineWidth(0.3)
    this.doc.line(
      LAYOUT_MINIMAL.margins.left, 
      this.currentY, 
      210 - LAYOUT_MINIMAL.margins.right, 
      this.currentY
    )
    
    this.currentY += 8
    
    // Conteúdo da seção
    contentCallback()
    
    // Espaçamento entre seções
    this.currentY += LAYOUT_MINIMAL.sectionSpacing
  }

  /**
   * Dados do aluno em layout de duas colunas
   */
  private drawStudentData(data: ProposalDataMinimal): void {
    const { student } = data.formData
    const colWidth = LAYOUT_MINIMAL.contentWidth / 2 - 5
    
    const studentFields = [
      { label: 'Nome:', value: student?.name || 'N/A' },
      { label: 'CPF:', value: this.formatCPF(student?.cpf) || 'N/A' },
      { label: 'RG:', value: student?.rg || 'Não informado' },
      { label: 'Data de Nascimento:', value: student?.birthDate ? 
        new Date(student.birthDate).toLocaleDateString('pt-BR') : 'N/A' }
    ]

    const additionalFields = [
      { label: 'Gênero:', value: student?.gender || 'N/A' },
      { label: 'Escola Atual:', value: student?.currentSchool || 'N/A' }
    ]

    // Coluna 1
    let fieldY = this.currentY
    studentFields.forEach(field => {
      this.drawCleanField(field.label, field.value, LAYOUT_MINIMAL.margins.left, fieldY, colWidth)
      fieldY += LAYOUT_MINIMAL.lineHeight
    })

    // Coluna 2
    fieldY = this.currentY
    additionalFields.forEach(field => {
      this.drawCleanField(field.label, field.value, LAYOUT_MINIMAL.margins.left + colWidth + 10, fieldY, colWidth)
      fieldY += LAYOUT_MINIMAL.lineHeight
    })

    this.currentY += studentFields.length * LAYOUT_MINIMAL.lineHeight + LAYOUT_MINIMAL.elementSpacing
  }

  /**
   * Dados dos responsáveis
   */
  private drawGuardiansData(data: ProposalDataMinimal): void {
    const { guardians } = data.formData
    const guardian1 = guardians?.guardian1

    if (!guardian1) {
      this.doc.setTextColor(COLORS_MINIMAL.mediumGray)
      this.doc.setFont('helvetica', 'normal')
      this.doc.setFontSize(TYPOGRAPHY.body.size)
      this.doc.text('Nenhum responsável informado', LAYOUT_MINIMAL.margins.left, this.currentY)
      this.currentY += LAYOUT_MINIMAL.lineHeight
      return
    }

    const guardianFields = [
      { label: 'Nome:', value: guardian1.name || 'N/A' },
      { label: 'CPF:', value: this.formatCPF(guardian1.cpf) || 'N/A' },
      { label: 'Telefone:', value: this.formatPhone(guardian1.phone) || 'N/A' },
      { label: 'E-mail:', value: guardian1.email || 'N/A' },
      { label: 'Parentesco:', value: guardian1.relationship || 'N/A' }
    ]

    guardianFields.forEach(field => {
      this.drawCleanField(field.label, field.value, LAYOUT_MINIMAL.margins.left, this.currentY, LAYOUT_MINIMAL.contentWidth)
      this.currentY += LAYOUT_MINIMAL.lineHeight
    })

    this.currentY += LAYOUT_MINIMAL.elementSpacing
  }

  /**
   * Endereço em linha única
   */
  private drawAddressData(data: ProposalDataMinimal): void {
    const { address } = data.formData
    
    const fullAddress = [
      address?.street,
      address?.number,
      address?.neighborhood, 
      address?.city,
      address?.state,
      this.formatCEP(address?.cep)
    ].filter(Boolean).join(', ')
    
    this.drawCleanField('Endereço Completo:', fullAddress || 'N/A', LAYOUT_MINIMAL.margins.left, this.currentY, LAYOUT_MINIMAL.contentWidth)
    this.currentY += LAYOUT_MINIMAL.lineHeight + LAYOUT_MINIMAL.elementSpacing
  }

  /**
   * Informações acadêmicas
   */
  private drawAcademicData(data: ProposalDataMinimal): void {
    const { academic } = data.formData
    const { seriesInfo, trackInfo } = data
    
    const acadFields = [
      { label: 'Série:', value: seriesInfo?.nome || 'N/A' },
      { label: 'Trilho de Desconto:', value: trackInfo?.nome || 'N/A' },
      { label: 'Turno:', value: academic?.shift || 'N/A' }
    ]

    acadFields.forEach(field => {
      this.drawCleanField(field.label, field.value, LAYOUT_MINIMAL.margins.left, this.currentY, LAYOUT_MINIMAL.contentWidth)
      this.currentY += LAYOUT_MINIMAL.lineHeight
    })

    this.currentY += LAYOUT_MINIMAL.elementSpacing
  }

  /**
   * Tabela minimalista de descontos
   */
  private drawDiscountsData(data: ProposalDataMinimal): void {
    const { selectedDiscounts } = data.formData
    const { discountsInfo } = data
    
    if (!selectedDiscounts?.length) {
      this.doc.setTextColor(COLORS_MINIMAL.mediumGray)
      this.doc.setFont('helvetica', 'normal')
      this.doc.setFontSize(TYPOGRAPHY.body.size)
      this.doc.text('Nenhum desconto aplicado', LAYOUT_MINIMAL.margins.left, this.currentY)
      this.currentY += LAYOUT_MINIMAL.lineHeight
      return
    }

    const discountData = selectedDiscounts.map(selected => {
      const discount = discountsInfo?.find(d => d.id === selected.id)
      return [
        discount?.codigo || selected.id,
        discount?.nome || 'Desconto não identificado',
        `${selected.percentual || 0}%`
      ]
    })

    const totalDiscount = selectedDiscounts.reduce((sum, d) => sum + (d.percentual || 0), 0)

    autoTable(this.doc, {
      startY: this.currentY,
      head: [['Código', 'Descrição', 'Percentual']],
      body: discountData,
      margin: { 
        left: LAYOUT_MINIMAL.margins.left, 
        right: LAYOUT_MINIMAL.margins.right 
      },
      styles: {
        fontSize: TYPOGRAPHY.body.size,
        cellPadding: 3,
        lineColor: COLORS_MINIMAL.borderGray,
        lineWidth: 0.3,
        textColor: COLORS_MINIMAL.text
      },
      headStyles: {
        fillColor: COLORS_MINIMAL.white,
        textColor: COLORS_MINIMAL.text,
        fontSize: TYPOGRAPHY.subtitle.size,
        fontStyle: 'bold',
        halign: 'left'
      },
      alternateRowStyles: {
        fillColor: COLORS_MINIMAL.lightGray
      },
      columnStyles: {
        0: { cellWidth: 30, halign: 'left' },
        1: { cellWidth: 100, halign: 'left' },  
        2: { cellWidth: 30, halign: 'center', fontStyle: 'bold' }
      }
    })

    this.currentY = (this.doc as any).lastAutoTable.finalY + 5

    // Total destacado
    this.doc.setFont('helvetica', 'bold')
    this.doc.setFontSize(TYPOGRAPHY.subtitle.size)
    this.doc.setTextColor(COLORS_MINIMAL.primary)
    this.doc.text(
      `Total de descontos aplicados: ${totalDiscount}%`, 
      LAYOUT_MINIMAL.margins.left, 
      this.currentY
    )
    
    this.currentY += LAYOUT_MINIMAL.elementSpacing * 2
  }

  /**
   * Resumo financeiro com destaque no valor final
   */
  private drawFinancialSummary(data: ProposalDataMinimal): void {
    const { pricing } = data
    
    if (!pricing?.isValid) {
      this.doc.setTextColor(COLORS_MINIMAL.mediumGray)
      this.doc.setFont('helvetica', 'normal')
      this.doc.setFontSize(TYPOGRAPHY.body.size)
      this.doc.text('Cálculo financeiro não disponível', LAYOUT_MINIMAL.margins.left, this.currentY)
      return
    }

    const financialData = [
      ['Valor Base da Série', this.formatCurrency(pricing.baseValue || 0)],
      ['Descontos Aplicados', `- ${this.formatCurrency(pricing.discountAmount || 0)}`]
    ]

    // Material didático se aplicável
    if (pricing.materialCost && pricing.materialCost > 0) {
      financialData.push(['Material Didático', this.formatCurrency(pricing.materialCost)])
    }

    autoTable(this.doc, {
      startY: this.currentY,
      body: financialData,
      margin: { 
        left: LAYOUT_MINIMAL.margins.left, 
        right: LAYOUT_MINIMAL.margins.right 
      },
      styles: {
        fontSize: TYPOGRAPHY.body.size,
        cellPadding: 4,
        lineColor: COLORS_MINIMAL.borderGray,
        lineWidth: 0.3,
        textColor: COLORS_MINIMAL.text
      },
      columnStyles: {
        0: { cellWidth: 100, fontStyle: 'normal', halign: 'left' },
        1: { cellWidth: 60, fontStyle: 'bold', halign: 'right' }
      },
      alternateRowStyles: {
        fillColor: COLORS_MINIMAL.lightGray
      }
    })

    this.currentY = (this.doc as any).lastAutoTable.finalY + 8

    // Valor final destacado
    this.doc.setFillColor(COLORS_MINIMAL.white)
    this.doc.setDrawColor(COLORS_MINIMAL.primary)
    this.doc.setLineWidth(1)
    this.doc.rect(LAYOUT_MINIMAL.margins.left, this.currentY - 3, LAYOUT_MINIMAL.contentWidth, 12)
    
    this.doc.setFont('helvetica', 'bold')
    this.doc.setFontSize(16) // Valor final em destaque
    this.doc.setTextColor(COLORS_MINIMAL.primary)
    this.doc.text('VALOR FINAL MENSAL:', LAYOUT_MINIMAL.margins.left + 5, this.currentY + 4)
    
    const finalValue = this.formatCurrency(pricing.finalValue || 0)
    const finalValueWidth = this.doc.getTextWidth(finalValue)
    this.doc.text(
      finalValue, 
      210 - LAYOUT_MINIMAL.margins.right - 5 - finalValueWidth, 
      this.currentY + 4
    )
    
    this.currentY += 15
  }

  /**
   * Rodapé minimalista
   */
  private drawMinimalFooter(): void {
    const footerY = 297 - 30
    
    // Linha separadora sutil
    this.doc.setDrawColor(COLORS_MINIMAL.borderGray)
    this.doc.setLineWidth(0.3)
    this.doc.line(LAYOUT_MINIMAL.margins.left, footerY, 210 - LAYOUT_MINIMAL.margins.right, footerY)
    
    // Instruções
    this.doc.setTextColor(COLORS_MINIMAL.mediumGray)
    this.doc.setFontSize(TYPOGRAPHY.small.size)
    this.doc.setFont('helvetica', 'normal')
    
    const instructions = [
      'Entregue os documentos necessários na secretaria em até 5 dias úteis.',
      'Aguarde a confirmação da matrícula por e-mail ou telefone.'
    ]
    
    instructions.forEach((instruction, index) => {
      this.doc.text(instruction, LAYOUT_MINIMAL.margins.left, footerY + 8 + (index * 4))
    })
    
    // Assinatura
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(COLORS_MINIMAL.text)
    this.doc.text(
      'Assinatura do Responsável:', 
      LAYOUT_MINIMAL.margins.left, 
      footerY + 20
    )
    
    // Linha para assinatura
    this.doc.setDrawColor(COLORS_MINIMAL.borderGray)
    this.doc.line(
      LAYOUT_MINIMAL.margins.left + 70, 
      footerY + 22, 
      210 - LAYOUT_MINIMAL.margins.right, 
      footerY + 22
    )
  }

  /**
   * Campo limpo com tipografia consistente
   */
  private drawCleanField(label: string, value: string, x: number, y: number, maxWidth: number): void {
    // Label em negrito
    this.doc.setTextColor(COLORS_MINIMAL.text)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setFontSize(TYPOGRAPHY.body.size)
    const labelWidth = this.doc.getTextWidth(label)
    this.doc.text(label, x, y)
    
    // Valor normal
    this.doc.setFont('helvetica', 'normal')
    this.doc.setTextColor(COLORS_MINIMAL.text)
    
    const valueX = x + labelWidth + 3
    const availableWidth = maxWidth - labelWidth - 3
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
    
    let truncated = text
    while (this.doc.getTextWidth(truncated + '...') > maxWidth && truncated.length > 0) {
      truncated = truncated.slice(0, -1)
    }
    
    return truncated + '...'
  }
}