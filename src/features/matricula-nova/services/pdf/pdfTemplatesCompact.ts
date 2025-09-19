import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// Configuração do PDF
export const PDF_CONFIG_COMPACT = {
  orientation: 'portrait' as const,
  unit: 'mm' as const,
  format: 'a4' as const,
  compress: true
}

// Paleta minimalista
export const COLORS_COMPACT = {
  primary: '#1e40af',      // Azul institucional IESJE
  text: '#000000',         // Preto para texto
  lightGray: '#f7f7f7',    // Cinza claro para fundos
  mediumGray: '#666666',   // Cinza médio
  borderGray: '#d1d5db',   // Bordas sutis
  white: '#ffffff'
}

// Tipografia otimizada para 1 página
export const TYPOGRAPHY_COMPACT = {
  title: { size: 16, style: 'bold' as const },
  section: { size: 11, style: 'bold' as const },
  label: { size: 9, style: 'bold' as const },
  body: { size: 9, style: 'normal' as const },
  small: { size: 8, style: 'normal' as const }
}

// Layout compacto para garantir 1 página
export const LAYOUT_COMPACT = {
  page: { width: 210, height: 297 },
  margins: { top: 20, right: 20, bottom: 20, left: 20 },
  contentWidth: 170,
  lineHeight: 4.5,  // Reduzido para economia de espaço
  sectionSpacing: 6, // Reduzido
  elementSpacing: 2  // Reduzido
}

export interface ProposalDataCompact {
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
  // F4 — Observações (opcional)
  paymentNotes?: string
  // F4 — Toggle de exibição anual
  annualModeEnabled?: boolean
}

export class PDFTemplatesCompact {
  private doc: jsPDF
  private currentY: number = LAYOUT_COMPACT.margins.top

  constructor(doc: jsPDF) {
    this.doc = doc
    this.doc.setFont('helvetica')
  }

  /**
   * Gera proposta compacta em 1 página
   */
  public generateProposal(data: ProposalDataCompact): void {
    this.currentY = LAYOUT_COMPACT.margins.top
    
    // Header compacto
    this.drawCompactHeader(data)
    
    // Linha separadora superior
    this.drawSeparatorLine()
    
    // Seções com separadores entre elas
    this.drawCompactSection('A', 'DADOS DO ALUNO', () => this.drawStudentData(data))
    this.drawSeparatorLine()
    
    this.drawCompactSection('B', 'RESPONSÁVEL PRINCIPAL', () => this.drawGuardianData(data))
    this.drawSeparatorLine()
    
    this.drawCompactSection('C', 'ENDEREÇO E INFORMAÇÕES ACADÊMICAS', () => this.drawAddressAcademic(data))
    this.drawSeparatorLine()
    
    this.drawCompactSection('D', 'DESCONTOS APLICADOS', () => this.drawDiscountsData(data))
    
    // Se houver observações, renderizar antes do resumo financeiro para garantir espaço
    if (data?.paymentNotes && String(data.paymentNotes).trim().length > 0) {
      this.drawSeparatorLine()
      this.drawCompactSection('E', 'OBSERVAÇÕES SOBRE A FORMA DE PAGAMENTO', () => this.drawPaymentNotes(data))
    }
    this.drawSeparatorLine()
    this.drawCompactSection('F', 'RESUMO FINANCEIRO', () => this.drawFinancialSummaryNew(data))
    
    // Footer compacto
    this.drawCompactFooter()
  }

  /**
   * Header compacto e profissional
   */
  private drawCompactHeader(data: ProposalDataCompact): void {
    const { margins } = LAYOUT_COMPACT
    
    // Logo e instituição (esquerda)
    this.doc.setTextColor(COLORS_COMPACT.primary)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setFontSize(TYPOGRAPHY_COMPACT.title.size)
    this.doc.text('IESJE', margins.left, this.currentY)
    
    this.doc.setFont('helvetica', 'normal')
    this.doc.setFontSize(TYPOGRAPHY_COMPACT.small.size)
    this.doc.setTextColor(COLORS_COMPACT.mediumGray)
    this.doc.text('Instituto São João da Escócia', margins.left, this.currentY + 5)
    
    // Proposta (direita)
    const proposalNum = `${new Date().getFullYear()}${Date.now().toString().slice(-6)}`
    const currentDate = new Date().toLocaleDateString('pt-BR')
    
    this.doc.setFont('helvetica', 'bold')
    this.doc.setFontSize(12)
    this.doc.setTextColor(COLORS_COMPACT.text)
    const proposalText = 'PROPOSTA DE MATRÍCULA'
    this.doc.text(proposalText, 210 - margins.right - this.doc.getTextWidth(proposalText), this.currentY)
    
    this.doc.setFont('helvetica', 'normal')
    this.doc.setFontSize(TYPOGRAPHY_COMPACT.small.size)
    this.doc.setTextColor(COLORS_COMPACT.mediumGray)
    this.doc.text(`Nº ${proposalNum} | ${currentDate}`, 
      210 - margins.right - this.doc.getTextWidth(`Nº ${proposalNum} | ${currentDate}`), 
      this.currentY + 5
    )
    
    this.currentY += 15
  }

  /**
   * Linha separadora sutil
   */
  private drawSeparatorLine(): void {
    this.doc.setDrawColor(COLORS_COMPACT.borderGray)
    this.doc.setLineWidth(0.2)
    this.doc.line(
      LAYOUT_COMPACT.margins.left,
      this.currentY,
      210 - LAYOUT_COMPACT.margins.right,
      this.currentY
    )
    this.currentY += 3
  }

  /**
   * Template de seção compacta
   */
  private drawCompactSection(letter: string, title: string, contentCallback: () => void): void {
    // Título da seção
    this.doc.setTextColor(COLORS_COMPACT.text)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setFontSize(TYPOGRAPHY_COMPACT.section.size)
    this.doc.text(`${letter}. ${title}`, LAYOUT_COMPACT.margins.left, this.currentY)
    
    this.currentY += 5
    
    // Conteúdo
    contentCallback()
    
    // Espaçamento mínimo entre seções
    this.currentY += LAYOUT_COMPACT.sectionSpacing
  }

  /**
   * Dados do aluno em formato compacto (2 colunas)
   */
  private drawStudentData(data: ProposalDataCompact): void {
    const { student } = data.formData
    const colWidth = LAYOUT_COMPACT.contentWidth / 2 - 5
    
    const col1Fields = [
      { label: 'Nome:', value: student?.name || 'N/A' },
      { label: 'CPF:', value: this.formatCPF(student?.cpf) || 'N/A' }
    ]

    const col2Fields = [
      { label: 'Data Nasc.:', value: student?.birthDate ? 
        new Date(student.birthDate).toLocaleDateString('pt-BR') : 'N/A' },
      { label: 'Gênero:', value: student?.gender || 'N/A' }
    ]

    // Renderizar colunas lado a lado
    let fieldY = this.currentY
    col1Fields.forEach(field => {
      this.drawCompactField(field.label, field.value, LAYOUT_COMPACT.margins.left, fieldY, colWidth)
      fieldY += LAYOUT_COMPACT.lineHeight
    })

    fieldY = this.currentY
    col2Fields.forEach(field => {
      this.drawCompactField(field.label, field.value, LAYOUT_COMPACT.margins.left + colWidth + 10, fieldY, colWidth)
      fieldY += LAYOUT_COMPACT.lineHeight
    })

    this.currentY += (Math.max(col1Fields.length, col2Fields.length) * LAYOUT_COMPACT.lineHeight)
  }

  /**
   * Responsável principal em linha única
   */
  private drawGuardianData(data: ProposalDataCompact): void {
    const guardian = data.formData.guardians?.guardian1

    if (!guardian) {
      this.doc.setTextColor(COLORS_COMPACT.mediumGray)
      this.doc.setFontSize(TYPOGRAPHY_COMPACT.body.size)
      this.doc.text('Nenhum responsável informado', LAYOUT_COMPACT.margins.left, this.currentY)
      return
    }

    // Nome e CPF em linha
    this.drawCompactField('Nome:', guardian.name || 'N/A', LAYOUT_COMPACT.margins.left, this.currentY, 85)
    this.drawCompactField('CPF:', this.formatCPF(guardian.cpf) || 'N/A', LAYOUT_COMPACT.margins.left + 90, this.currentY, 80)
    this.currentY += LAYOUT_COMPACT.lineHeight

    // Telefone e email em linha
    this.drawCompactField('Tel:', this.formatPhone(guardian.phone) || 'N/A', LAYOUT_COMPACT.margins.left, this.currentY, 85)
    this.drawCompactField('E-mail:', guardian.email || 'N/A', LAYOUT_COMPACT.margins.left + 90, this.currentY, 80)
    this.currentY += LAYOUT_COMPACT.lineHeight
  }

  /**
   * Endereço e acadêmico combinados para economia
   */
  private drawAddressAcademic(data: ProposalDataCompact): void {
    const { address, academic } = data.formData
    const { seriesInfo, trackInfo } = data
    
    // Endereço compacto
    const fullAddress = [
      address?.street,
      address?.number,
      address?.neighborhood,
      `${address?.city}/${address?.state}`,
      this.formatCEP(address?.cep)
    ].filter(Boolean).join(', ')
    
    this.drawCompactField('Endereço:', fullAddress || 'N/A', LAYOUT_COMPACT.margins.left, this.currentY, LAYOUT_COMPACT.contentWidth)
    this.currentY += LAYOUT_COMPACT.lineHeight

    // Info acadêmica em linha
    const colWidth = LAYOUT_COMPACT.contentWidth / 3 - 2
    this.drawCompactField('Série:', seriesInfo?.nome || 'N/A', LAYOUT_COMPACT.margins.left, this.currentY, colWidth)
    this.drawCompactField('Trilho:', trackInfo?.nome || 'N/A', LAYOUT_COMPACT.margins.left + colWidth + 5, this.currentY, colWidth)
    this.drawCompactField('Turno:', academic?.shift || 'N/A', LAYOUT_COMPACT.margins.left + (colWidth * 2) + 10, this.currentY, colWidth)
    this.currentY += LAYOUT_COMPACT.lineHeight
  }

  /**
   * Descontos em tabela ultra compacta
   */
  private drawDiscountsData(data: ProposalDataCompact): void {
    const { selectedDiscounts } = data.formData
    const { discountsInfo } = data
    
    if (!selectedDiscounts?.length) {
      this.doc.setTextColor(COLORS_COMPACT.mediumGray)
      this.doc.setFontSize(TYPOGRAPHY_COMPACT.body.size)
      this.doc.text('Nenhum desconto aplicado', LAYOUT_COMPACT.margins.left, this.currentY)
      this.currentY += LAYOUT_COMPACT.lineHeight
      return
    }

    const discountData = selectedDiscounts.map(selected => {
      const discount = discountsInfo?.find(d => d.id === selected.id)
      return [
        discount?.codigo || selected.id,
        discount?.nome ? this.truncateText(discount.nome, 70) : 'Desconto',
        `${selected.percentual || 0}%`
      ]
    })

    const totalDiscount = selectedDiscounts.reduce((sum, d) => sum + (d.percentual || 0), 0)

    autoTable(this.doc, {
      startY: this.currentY,
      head: [['Cód.', 'Descrição', '%']],
      body: discountData,
      margin: { 
        left: LAYOUT_COMPACT.margins.left, 
        right: LAYOUT_COMPACT.margins.right 
      },
      styles: {
        fontSize: 8,
        cellPadding: 1.5,
        lineColor: COLORS_COMPACT.borderGray,
        lineWidth: 0.2
      },
      headStyles: {
        fillColor: COLORS_COMPACT.lightGray,
        textColor: COLORS_COMPACT.text,
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { cellWidth: 15 },
        1: { cellWidth: 120 },  
        2: { cellWidth: 20, halign: 'center' }
      }
    })

    this.currentY = (this.doc as any).lastAutoTable.finalY + 2

    // Total inline compacto
    this.doc.setFont('helvetica', 'bold')
    this.doc.setFontSize(TYPOGRAPHY_COMPACT.body.size)
    this.doc.setTextColor(COLORS_COMPACT.primary)
    this.doc.text(`Total de descontos: ${totalDiscount}%`, LAYOUT_COMPACT.margins.left, this.currentY)
    
    this.currentY += 3
  }

  /**
   * Resumo financeiro reformulado conforme especificação
   */
  private drawFinancialSummaryNew(data: ProposalDataCompact): void {
    const { pricing, seriesInfo } = data
    
    if (!pricing?.isValid) {
      this.doc.setTextColor(COLORS_COMPACT.mediumGray)
      this.doc.setFontSize(TYPOGRAPHY_COMPACT.body.size)
      this.doc.text('Cálculo não disponível', LAYOUT_COMPACT.margins.left, this.currentY)
      return
    }

    // Usar valores reais da série ou estimativas baseadas no pricing (mesma lógica do FinancialBreakdownCard)
    const valorMaterial = seriesInfo?.valor_material || (pricing.baseValue * 0.15)
    const valorMensalSemMaterial = seriesInfo?.valor_mensal_sem_material || (pricing.baseValue - valorMaterial)
    const valorMensalComMaterial = seriesInfo?.valor_mensal_com_material || pricing.baseValue
    
    // Calcular valores finais (mesma lógica do FinancialBreakdownCard)
    const descontoSobreSemMaterial = (valorMensalSemMaterial * pricing.totalDiscountPercentage) / 100
    const mensalidadeFinalSemMaterial = valorMensalSemMaterial - descontoSobreSemMaterial
    const mensalidadeFinalComMaterial = mensalidadeFinalSemMaterial + valorMaterial
    
    // Percentual e valor absoluto do desconto
    const descontoPercentual = pricing.totalDiscountPercentage || 0
    const descontoValor = descontoSobreSemMaterial
    const isAnnual = !!data.annualModeEnabled
    const descontoAnual = descontoValor * 12

    // Totais Anuais (sem desconto) — calcular também aqui para usar no modo anual
    const toNumEarly = (v: any) => {
      const n = Number(v)
      return Number.isFinite(n) ? n : null
    }
    const round2Early = (n: number) => Math.round((Number(n) + Number.EPSILON) * 100) / 100

    const dbAnualSemEarly = toNumEarly((seriesInfo as any)?.valor_anual_sem_material)
    const dbAnualMatEarly = toNumEarly((seriesInfo as any)?.valor_anual_material)
    const dbAnualComEarly = toNumEarly((seriesInfo as any)?.valor_anual_com_material)

    const derivedSemEarly = round2Early(valorMensalSemMaterial * 12)
    const derivedMatEarly = round2Early(valorMaterial * 12)
    const derivedComEarly = round2Early(valorMensalComMaterial * 12)

    const annualBaseEarly = round2Early(dbAnualSemEarly ?? derivedSemEarly)
    const annualMatEarly = round2Early(dbAnualMatEarly ?? derivedMatEarly)
    const annualComEarly = round2Early(dbAnualComEarly ?? (annualBaseEarly + annualMatEarly))

    // Tabela com fundo cinza claro
    const tableData = isAnnual
      ? [
          ['Anual sem material:', this.formatCurrency(annualBaseEarly)],
          ['Anual com material:', this.formatCurrency(annualComEarly)],
          ['Desconto aplicado (anual):', `${descontoPercentual.toFixed(1)}% (${this.formatCurrency(descontoAnual)})`]
        ]
      : [
          ['Valor sem material:', this.formatCurrency(valorMensalSemMaterial)],
          ['Valor com material:', this.formatCurrency(valorMensalComMaterial)],
          ['Desconto aplicado:', `${descontoPercentual.toFixed(1)}% (${this.formatCurrency(descontoValor)})`]
        ]

    // Desenhar tabela com fundo
    const startX = LAYOUT_COMPACT.margins.left
    const startY = this.currentY
    const tableWidth = LAYOUT_COMPACT.contentWidth
    const rowHeight = 7
    const tableHeight = tableData.length * rowHeight

    // Fundo cinza claro
    this.doc.setFillColor(COLORS_COMPACT.lightGray)
    this.doc.rect(startX, startY, tableWidth, tableHeight, 'F')

    // Bordas sutis
    this.doc.setDrawColor(COLORS_COMPACT.borderGray)
    this.doc.setLineWidth(0.2)
    this.doc.rect(startX, startY, tableWidth, tableHeight)

    // Renderizar linhas
    let currentRowY = startY + 5
    tableData.forEach((row, index) => {
      this.doc.setFont('helvetica', 'normal')
      this.doc.setFontSize(TYPOGRAPHY_COMPACT.body.size)
      this.doc.setTextColor(COLORS_COMPACT.text)
      this.doc.text(row[0], startX + 3, currentRowY)
      
      this.doc.setFont('helvetica', 'bold')
      this.doc.text(row[1], startX + tableWidth - 3 - this.doc.getTextWidth(row[1]), currentRowY)
      
      // Linha separadora entre rows
      if (index < tableData.length - 1) {
        this.doc.setDrawColor(COLORS_COMPACT.borderGray)
        this.doc.line(startX, currentRowY + 2, startX + tableWidth, currentRowY + 2)
      }
      
      currentRowY += rowHeight
    })

    this.currentY = startY + tableHeight + 8

    // VALOR FINAL (mensal/anual) em destaque
    const finalBoxHeight = 12
    const finalBoxY = this.currentY

    // Borda destacada
    this.doc.setDrawColor(COLORS_COMPACT.primary)
    this.doc.setLineWidth(1)
    this.doc.rect(startX, finalBoxY, tableWidth, finalBoxHeight)

    // Texto centralizado
    this.doc.setFont('helvetica', 'bold')
    this.doc.setFontSize(14) // Maior destaque
    this.doc.setTextColor(COLORS_COMPACT.primary)
    
    const finalText = isAnnual ? 'VALOR FINAL ANUAL:' : 'VALOR FINAL MENSAL:'
    const finalAnnualSem = mensalidadeFinalSemMaterial * 12
    const finalAnnualCom = finalAnnualSem + annualMatEarly
    const finalValue2 = this.formatCurrency(isAnnual ? finalAnnualCom : mensalidadeFinalComMaterial)
    const fullText = `${finalText} ${finalValue2}`
    
    // Centralizar horizontalmente
    const textWidth = this.doc.getTextWidth(fullText)
    const centerX = startX + (tableWidth / 2) - (textWidth / 2)
    
    // Centralizar verticalmente
    const centerY = finalBoxY + (finalBoxHeight / 2) + 2
    
    this.doc.text(fullText, centerX, centerY)
    
    this.currentY = finalBoxY + finalBoxHeight + 5
  }

  /**
   * F4 — Observações da forma de pagamento (compacto e multi-linha)
   * Renderiza apenas texto puro, com quebras respeitadas e limite de linhas para manter 1 página
   */
  private drawPaymentNotes(data: ProposalDataCompact): void {
    const raw = (data?.paymentNotes || '').trim()
    if (!raw) return

    this.doc.setFont('helvetica', 'normal')
    this.doc.setFontSize(TYPOGRAPHY_COMPACT.body.size)
    this.doc.setTextColor(COLORS_COMPACT.text)

    const maxWidth = LAYOUT_COMPACT.contentWidth
    const lines = this.doc.splitTextToSize(raw, maxWidth)

    // Calcular espaço disponível antes do rodapé fixo
    const footerY = 297 - 25 // mesmo valor de drawCompactFooter
    const safetySpacing = LAYOUT_COMPACT.sectionSpacing // respeitar espaçamento pós-seção
    const available = Math.max(0, footerY - this.currentY - safetySpacing)
    const maxLinesBySpace = Math.floor(available / LAYOUT_COMPACT.lineHeight)
    const maxAllowed = Math.max(0, Math.min(8, maxLinesBySpace)) // também respeitar limite conservador de 8 linhas
    const limited = Array.isArray(lines) ? lines.slice(0, maxAllowed) : []

    let y = this.currentY
    for (const line of limited) {
      this.doc.text(line, LAYOUT_COMPACT.margins.left, y)
      y += LAYOUT_COMPACT.lineHeight
    }
    this.currentY = y
  }

  /**
   * Footer ultra compacto
   */
  private drawCompactFooter(): void {
    const footerY = 297 - 25 // Ajustado para caber em 1 página
    
    // Linha separadora
    this.doc.setDrawColor(COLORS_COMPACT.borderGray)
    this.doc.setLineWidth(0.2)
    this.doc.line(LAYOUT_COMPACT.margins.left, footerY, 210 - LAYOUT_COMPACT.margins.right, footerY)
    
    // Texto compacto
    this.doc.setTextColor(COLORS_COMPACT.mediumGray)
    this.doc.setFontSize(TYPOGRAPHY_COMPACT.small.size)
    this.doc.setFont('helvetica', 'normal')
    
    this.doc.text(
      'Documentos na secretaria em 5 dias úteis | Confirmação por e-mail/telefone', 
      LAYOUT_COMPACT.margins.left, 
      footerY + 5
    )
    
    // Assinatura
    this.doc.setTextColor(COLORS_COMPACT.text)
    this.doc.text('Assinatura:', LAYOUT_COMPACT.margins.left, footerY + 10)
    
    this.doc.setDrawColor(COLORS_COMPACT.borderGray)
    this.doc.line(
      LAYOUT_COMPACT.margins.left + 20, 
      footerY + 11, 
      210 - LAYOUT_COMPACT.margins.right, 
      footerY + 11
    )
  }

  /**
   * Campo compacto otimizado
   */
  private drawCompactField(label: string, value: string, x: number, y: number, maxWidth: number): void {
    this.doc.setTextColor(COLORS_COMPACT.text)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setFontSize(TYPOGRAPHY_COMPACT.label.size)
    const labelWidth = this.doc.getTextWidth(label)
    this.doc.text(label, x, y)
    
    this.doc.setFont('helvetica', 'normal')
    this.doc.setFontSize(TYPOGRAPHY_COMPACT.body.size)
    
    const valueX = x + labelWidth + 2
    const availableWidth = maxWidth - labelWidth - 2
    const truncatedValue = this.truncateText(value, availableWidth)
    this.doc.text(truncatedValue, valueX, y)
  }

  /**
   * Utilitários
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
      return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1)$2-$3')
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