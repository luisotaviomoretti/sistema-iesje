import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { RematriculaReadModel } from '../../types/details'

// Configuração do PDF (independente do fluxo de novo aluno)
export const PDF_CONFIG_REMATRICULA_COMPACT = {
  orientation: 'portrait' as const,
  unit: 'mm' as const,
  format: 'a4' as const,
  compress: true,
}

// Paleta de cores (espelhando o visual do Compact)
export const COLORS_REMATRICULA_COMPACT = {
  primary: '#1e40af', // Azul institucional IESJE
  text: '#000000',
  lightGray: '#f7f7f7',
  mediumGray: '#666666',
  borderGray: '#d1d5db',
  white: '#ffffff',
}

// Tipografia
export const TYPOGRAPHY_REMATRICULA_COMPACT = {
  title: { size: 16, style: 'bold' as const },
  section: { size: 11, style: 'bold' as const },
  label: { size: 9, style: 'bold' as const },
  body: { size: 9, style: 'normal' as const },
  small: { size: 8, style: 'normal' as const },
}

// Layout
export const LAYOUT_REMATRICULA_COMPACT = {
  page: { width: 210, height: 297 },
  margins: { top: 20, right: 20, bottom: 20, left: 20 },
  contentWidth: 170,
  lineHeight: 4.5,
  sectionSpacing: 6,
  elementSpacing: 2,
}

export interface RematriculaProposalCompactData {
  // Fonte única de dados (read model independente)
  readModel: RematriculaReadModel
  // Informações da série/trilha (selecionadas na UI)
  seriesInfo?: {
    id?: string
    nome?: string
    valor_material?: number
    valor_mensal_sem_material?: number
    valor_mensal_com_material?: number
  }
  trackInfo?: { id?: string; nome?: string }
  // Descontos selecionados e metadados (códigos/descrições)
  selectedDiscounts: Array<{ id: string; percentual: number }>
  discountsInfo: Array<{ id: string; codigo?: string; nome?: string }>
  // Resultado financeiro consolidado para exibição
  pricing?: {
    baseValue: number // mensalidade sem material
    materialValue: number
    totalDiscountPercentage: number
  }
  // F4 — Observações sobre a Forma de Pagamento (opcional)
  paymentNotes?: string
  // F4 — Toggle de exibição anual
  annualModeEnabled?: boolean
}

export class PDFTemplatesRematriculaCompact {
  private doc: jsPDF
  private currentY: number = LAYOUT_REMATRICULA_COMPACT.margins.top

  constructor(doc: jsPDF) {
    this.doc = doc
    this.doc.setFont('helvetica')
  }

  public generateProposal(data: RematriculaProposalCompactData): void {
    this.currentY = LAYOUT_REMATRICULA_COMPACT.margins.top

    // Header
    this.drawHeader()
    this.drawSeparator()

    // Seções
    this.drawSection('A', 'DADOS DO ALUNO', () => this.drawStudent(data))
    this.drawSeparator()

    this.drawSection('B', 'RESPONSÁVEL PRINCIPAL', () => this.drawGuardian(data))
    this.drawSeparator()

    this.drawSection('C', 'ENDEREÇO E INFORMAÇÕES ACADÊMICAS', () => this.drawAddressAcademic(data))
    this.drawSeparator()

    this.drawSection('D', 'DESCONTOS APLICADOS', () => this.drawDiscounts(data))
    this.drawSeparator()

    this.drawSection('E', 'RESUMO FINANCEIRO', () => this.drawFinancial(data))

    // F — Observações sobre a Forma de Pagamento (apenas quando houver conteúdo)
    if (data.paymentNotes && data.paymentNotes.trim().length > 0) {
      this.drawSeparator()
      this.drawSection('F', 'OBSERVAÇÕES SOBRE A FORMA DE PAGAMENTO', () => this.drawPaymentNotes(data))
    }

    // Footer
    this.drawFooter()
  }

  private drawHeader(): void {
    const { margins } = LAYOUT_REMATRICULA_COMPACT

    // Marca/Instituição à esquerda
    this.doc.setTextColor(COLORS_REMATRICULA_COMPACT.primary)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setFontSize(TYPOGRAPHY_REMATRICULA_COMPACT.title.size)
    this.doc.text('IESJE', margins.left, this.currentY)

    this.doc.setFont('helvetica', 'normal')
    this.doc.setFontSize(TYPOGRAPHY_REMATRICULA_COMPACT.small.size)
    this.doc.setTextColor(COLORS_REMATRICULA_COMPACT.mediumGray)
    this.doc.text('Instituto São João da Escócia', margins.left, this.currentY + 5)

    // Título/Número/ Data à direita
    const currentDate = new Date().toLocaleDateString('pt-BR')
    const proposalNum = `${new Date().getFullYear()}${Date.now().toString().slice(-6)}`

    const rightX = 210 - margins.right
    this.doc.setFont('helvetica', 'bold')
    this.doc.setFontSize(12)
    this.doc.setTextColor(COLORS_REMATRICULA_COMPACT.text)
    const title = 'PROPOSTA DE MATRÍCULA'
    this.doc.text(title, rightX - this.doc.getTextWidth(title), this.currentY)

    this.doc.setFont('helvetica', 'normal')
    this.doc.setFontSize(TYPOGRAPHY_REMATRICULA_COMPACT.small.size)
    this.doc.setTextColor(COLORS_REMATRICULA_COMPACT.mediumGray)
    const rightSub = `Nº ${proposalNum} | ${currentDate}`
    this.doc.text(rightSub, rightX - this.doc.getTextWidth(rightSub), this.currentY + 5)

    this.currentY += 15
  }

  private drawSeparator(): void {
    this.doc.setDrawColor(COLORS_REMATRICULA_COMPACT.borderGray)
    this.doc.setLineWidth(0.2)
    this.doc.line(
      LAYOUT_REMATRICULA_COMPACT.margins.left,
      this.currentY,
      210 - LAYOUT_REMATRICULA_COMPACT.margins.right,
      this.currentY,
    )
    this.currentY += 3
  }

  private drawSection(letter: string, title: string, cb: () => void): void {
    this.doc.setTextColor(COLORS_REMATRICULA_COMPACT.text)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setFontSize(TYPOGRAPHY_REMATRICULA_COMPACT.section.size)
    this.doc.text(`${letter}. ${title}`, LAYOUT_REMATRICULA_COMPACT.margins.left, this.currentY)

    this.currentY += 5
    cb()
    this.currentY += LAYOUT_REMATRICULA_COMPACT.sectionSpacing
  }

  private drawStudent(data: RematriculaProposalCompactData): void {
    const student = data.readModel?.student || ({} as any)
    const colWidth = LAYOUT_REMATRICULA_COMPACT.contentWidth / 2 - 5

    const col1 = [
      { label: 'Nome:', value: student?.name || 'N/A' },
      { label: 'CPF:', value: this.formatCPF(student?.cpf || '') || 'N/A' },
    ]
    const col2 = [
      {
        label: 'Data Nasc.:',
        value: student?.birth_date ? new Date(student.birth_date).toLocaleDateString('pt-BR') : 'N/A',
      },
      { label: 'Gênero:', value: student?.gender || 'N/A' },
    ]

    let y = this.currentY
    col1.forEach((f) => {
      this.drawField(f.label, f.value, LAYOUT_REMATRICULA_COMPACT.margins.left, y, colWidth)
      y += LAYOUT_REMATRICULA_COMPACT.lineHeight
    })

    y = this.currentY
    col2.forEach((f) => {
      this.drawField(
        f.label,
        f.value,
        LAYOUT_REMATRICULA_COMPACT.margins.left + colWidth + 10,
        y,
        colWidth,
      )
      y += LAYOUT_REMATRICULA_COMPACT.lineHeight
    })

    this.currentY +=
      Math.max(col1.length, col2.length) * LAYOUT_REMATRICULA_COMPACT.lineHeight
  }

  private drawGuardian(data: RematriculaProposalCompactData): void {
    const g1 = data.readModel?.guardians?.guardian1 as any
    if (!g1) {
      this.doc.setTextColor(COLORS_REMATRICULA_COMPACT.mediumGray)
      this.doc.setFontSize(TYPOGRAPHY_REMATRICULA_COMPACT.body.size)
      this.doc.text('Nenhum responsável informado', LAYOUT_REMATRICULA_COMPACT.margins.left, this.currentY)
      return
    }

    this.drawField('Nome:', g1?.name || 'N/A', LAYOUT_REMATRICULA_COMPACT.margins.left, this.currentY, 85)
    this.drawField('CPF:', this.formatCPF(g1?.cpf || ''), LAYOUT_REMATRICULA_COMPACT.margins.left + 90, this.currentY, 80)
    this.currentY += LAYOUT_REMATRICULA_COMPACT.lineHeight

    this.drawField('Tel:', this.formatPhone(g1?.phone || ''), LAYOUT_REMATRICULA_COMPACT.margins.left, this.currentY, 85)
    this.drawField('E-mail:', g1?.email || 'N/A', LAYOUT_REMATRICULA_COMPACT.margins.left + 90, this.currentY, 80)
    this.currentY += LAYOUT_REMATRICULA_COMPACT.lineHeight
  }

  private drawAddressAcademic(data: RematriculaProposalCompactData): void {
    const addr = data.readModel?.address || ({} as any)
    const academic = data.readModel?.academic || ({} as any)

    const fullAddress = [
      addr?.street,
      addr?.number,
      addr?.district,
      `${addr?.city}/${addr?.state}`,
      this.formatCEP(addr?.cep || ''),
    ]
      .filter(Boolean)
      .join(', ')

    this.drawField('Endereço:', fullAddress || 'N/A', LAYOUT_REMATRICULA_COMPACT.margins.left, this.currentY, LAYOUT_REMATRICULA_COMPACT.contentWidth)
    this.currentY += LAYOUT_REMATRICULA_COMPACT.lineHeight

    const colWidth = LAYOUT_REMATRICULA_COMPACT.contentWidth / 3 - 2
    this.drawField('Série:', data.seriesInfo?.nome || academic?.series_name || 'N/A', LAYOUT_REMATRICULA_COMPACT.margins.left, this.currentY, colWidth)
    this.drawField('Trilho:', data.trackInfo?.nome || academic?.track_name || 'N/A', LAYOUT_REMATRICULA_COMPACT.margins.left + colWidth + 5, this.currentY, colWidth)
    this.drawField('Turno:', academic?.shift || 'N/A', LAYOUT_REMATRICULA_COMPACT.margins.left + colWidth * 2 + 10, this.currentY, colWidth)
    this.currentY += LAYOUT_REMATRICULA_COMPACT.lineHeight
  }

  private drawDiscounts(data: RematriculaProposalCompactData): void {
    const selected = data.selectedDiscounts || []
    const info = data.discountsInfo || []

    if (!selected.length) {
      this.doc.setTextColor(COLORS_REMATRICULA_COMPACT.mediumGray)
      this.doc.setFontSize(TYPOGRAPHY_REMATRICULA_COMPACT.body.size)
      this.doc.text('Nenhum desconto aplicado', LAYOUT_REMATRICULA_COMPACT.margins.left, this.currentY)
      this.currentY += LAYOUT_REMATRICULA_COMPACT.lineHeight
      return
    }

    const rows = selected.map((s) => {
      const d = info.find((i) => i.id === s.id)
      return [d?.codigo || s.id, this.truncate(d?.nome || 'Desconto', 70), `${(s.percentual || 0).toFixed(1)}%`]
    })

    autoTable(this.doc, {
      startY: this.currentY,
      head: [['Cód.', 'Descrição', '%']],
      body: rows,
      margin: { left: LAYOUT_REMATRICULA_COMPACT.margins.left, right: LAYOUT_REMATRICULA_COMPACT.margins.right },
      styles: { fontSize: 8, cellPadding: 1.5, lineColor: COLORS_REMATRICULA_COMPACT.borderGray, lineWidth: 0.2 },
      headStyles: { fillColor: COLORS_REMATRICULA_COMPACT.lightGray, textColor: COLORS_REMATRICULA_COMPACT.text, fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 15 }, 1: { cellWidth: 120 }, 2: { cellWidth: 20, halign: 'center' } },
    })

    this.currentY = (this.doc as any).lastAutoTable.finalY + 2

    const totalPct = selected.reduce((sum, d) => sum + (d.percentual || 0), 0)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setFontSize(TYPOGRAPHY_REMATRICULA_COMPACT.body.size)
    this.doc.setTextColor(COLORS_REMATRICULA_COMPACT.primary)
    this.doc.text(`Total de descontos: ${totalPct.toFixed(1)}%`, LAYOUT_REMATRICULA_COMPACT.margins.left, this.currentY)

    this.currentY += 3
  }

  private drawFinancial(data: RematriculaProposalCompactData): void {
    const pricing = data.pricing || { baseValue: 0, materialValue: 0, totalDiscountPercentage: 0 }

    // Valores baseados no pricing da Rematrícula (sem material + material)
    const valorSemMaterial = data.seriesInfo?.valor_mensal_sem_material ?? pricing.baseValue
    const valorMaterial = data.seriesInfo?.valor_material ?? pricing.materialValue
    const valorComMaterial = data.seriesInfo?.valor_mensal_com_material ?? (valorSemMaterial + valorMaterial)

    const descontoPercentual = pricing.totalDiscountPercentage || 0
    const descontoValor = (valorSemMaterial * descontoPercentual) / 100
    const mensalidadeFinalSemMaterial = valorSemMaterial - descontoValor
    const mensalidadeFinalComMaterial = mensalidadeFinalSemMaterial + valorMaterial

    // Totais Anuais (sem desconto) — usar campos anuais do banco (quando houver), senão x12 do mensal
    const toNum = (v: any) => {
      const n = Number(v)
      return Number.isFinite(n) ? n : null
    }
    const round2 = (n: number) => Math.round((Number(n) + Number.EPSILON) * 100) / 100

    const dbAnualSem = toNum((data.seriesInfo as any)?.valor_anual_sem_material)
    const dbAnualMat = toNum((data.seriesInfo as any)?.valor_anual_material)
    const dbAnualCom = toNum((data.seriesInfo as any)?.valor_anual_com_material)

    const derivedSem = round2(valorSemMaterial * 12)
    const derivedMat = round2(valorMaterial * 12)
    const derivedCom = round2(valorComMaterial * 12)

    const useDb = [dbAnualSem, dbAnualMat, dbAnualCom].some(v => typeof v === 'number')
    const annualBase = round2(dbAnualSem ?? derivedSem)
    const annualMat = round2(dbAnualMat ?? derivedMat)
    const annualCom = round2(dbAnualCom ?? (annualBase + annualMat))

    // Descontos anuais — calcular sobre a BASE ANUAL (sem material)
    const descontoAnual = round2((annualBase * descontoPercentual) / 100)
    const finalAnnualSemMat = round2(mensalidadeFinalSemMaterial * 12)
    const finalAnnualComMat = round2(finalAnnualSemMat + annualMat)

    const isAnnual = !!data.annualModeEnabled

    const tableData: [string, string][] = isAnnual
      ? [
          ['Anual sem material:', this.formatCurrency(annualBase)],
          ['Anual com material:', this.formatCurrency(annualCom)],
          ['Desconto aplicado (anual):', `${descontoPercentual.toFixed(1)}% (${this.formatCurrency(descontoAnual)})`],
        ]
      : [
          ['Valor sem material:', this.formatCurrency(valorSemMaterial)],
          ['Valor com material:', this.formatCurrency(valorComMaterial)],
          ['Desconto aplicado:', `${descontoPercentual.toFixed(1)}% (${this.formatCurrency(descontoValor)})`],
        ]

    const startX = LAYOUT_REMATRICULA_COMPACT.margins.left
    const startY = this.currentY
    const tableWidth = LAYOUT_REMATRICULA_COMPACT.contentWidth
    const rowHeight = 7
    const tableHeight = tableData.length * rowHeight

    // Fundo cinza
    this.doc.setFillColor(COLORS_REMATRICULA_COMPACT.lightGray)
    this.doc.rect(startX, startY, tableWidth, tableHeight, 'F')

    // Bordas
    this.doc.setDrawColor(COLORS_REMATRICULA_COMPACT.borderGray)
    this.doc.setLineWidth(0.2)
    this.doc.rect(startX, startY, tableWidth, tableHeight)

    // Linhas
    let y = startY + 5
    tableData.forEach((row, idx) => {
      this.doc.setFont('helvetica', 'normal')
      this.doc.setFontSize(TYPOGRAPHY_REMATRICULA_COMPACT.body.size)
      this.doc.setTextColor(COLORS_REMATRICULA_COMPACT.text)
      this.doc.text(row[0], startX + 3, y)

      this.doc.setFont('helvetica', 'bold')
      this.doc.text(row[1], startX + tableWidth - 3 - this.doc.getTextWidth(row[1]), y)

      if (idx < tableData.length - 1) {
        this.doc.setDrawColor(COLORS_REMATRICULA_COMPACT.borderGray)
        this.doc.line(startX, y + 2, startX + tableWidth, y + 2)
      }

      y += rowHeight
    })

    this.currentY = startY + tableHeight + 8

    autoTable(this.doc, {
      startY: this.currentY,
      head: [['Totais Anuais (sem desconto)', 'Valor']],
      body: [
        ['Anual sem material', this.formatCurrency(annualBase)],
        ['Anual material', this.formatCurrency(annualMat)],
        ['Anual com material', this.formatCurrency(annualCom)],
      ],
      margin: { left: LAYOUT_REMATRICULA_COMPACT.margins.left, right: LAYOUT_REMATRICULA_COMPACT.margins.right },
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: COLORS_REMATRICULA_COMPACT.lightGray, textColor: COLORS_REMATRICULA_COMPACT.text, fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 120 }, 1: { cellWidth: 40, halign: 'right' } },
    })

    this.currentY = (this.doc as any).lastAutoTable.finalY + 3
    this.doc.setTextColor(COLORS_REMATRICULA_COMPACT.mediumGray)
    this.doc.setFont('helvetica', 'normal')
    this.doc.setFontSize(TYPOGRAPHY_REMATRICULA_COMPACT.small.size)
    this.doc.text(`Fonte: ${useDb ? 'banco' : 'x12 (derivado)'}`, LAYOUT_REMATRICULA_COMPACT.margins.left, this.currentY)
    this.currentY += 5

    // Destaque de VALOR FINAL (mensal ou anual conforme toggle)
    const finalBoxHeight = 12
    const finalBoxY = this.currentY

    this.doc.setDrawColor(COLORS_REMATRICULA_COMPACT.primary)
    this.doc.setLineWidth(1)
    this.doc.rect(startX, finalBoxY, tableWidth, finalBoxHeight)

    this.doc.setFont('helvetica', 'bold')
    this.doc.setFontSize(14)
    this.doc.setTextColor(COLORS_REMATRICULA_COMPACT.primary)

    const finalText = isAnnual ? 'VALOR FINAL ANUAL:' : 'VALOR FINAL MENSAL:'
    const finalValue = isAnnual ? this.formatCurrency(finalAnnualComMat) : this.formatCurrency(mensalidadeFinalComMaterial)
    const fullText = `${finalText} ${finalValue}`

    const textWidth = this.doc.getTextWidth(fullText)
    const centerX = startX + tableWidth / 2 - textWidth / 2
    const centerY = finalBoxY + finalBoxHeight / 2 + 2

    this.doc.text(fullText, centerX, centerY)

    this.currentY = finalBoxY + finalBoxHeight + 5
  }

  private drawFooter(): void {
    const footerY = 297 - 25

    // Linha
    this.doc.setDrawColor(COLORS_REMATRICULA_COMPACT.borderGray)
    this.doc.setLineWidth(0.2)
    this.doc.line(LAYOUT_REMATRICULA_COMPACT.margins.left, footerY, 210 - LAYOUT_REMATRICULA_COMPACT.margins.right, footerY)

    // Texto auxiliar
    this.doc.setTextColor(COLORS_REMATRICULA_COMPACT.mediumGray)
    this.doc.setFontSize(TYPOGRAPHY_REMATRICULA_COMPACT.small.size)
    this.doc.setFont('helvetica', 'normal')
    this.doc.text('Documentos na secretaria em 5 dias úteis | Confirmação por e-mail/telefone', LAYOUT_REMATRICULA_COMPACT.margins.left, footerY + 5)

    // Assinatura
    this.doc.setTextColor(COLORS_REMATRICULA_COMPACT.text)
    this.doc.text('Assinatura:', LAYOUT_REMATRICULA_COMPACT.margins.left, footerY + 10)

    this.doc.setDrawColor(COLORS_REMATRICULA_COMPACT.borderGray)
    this.doc.line(LAYOUT_REMATRICULA_COMPACT.margins.left + 20, footerY + 11, 210 - LAYOUT_REMATRICULA_COMPACT.margins.right, footerY + 11)
  }

  private drawPaymentNotes(data: RematriculaProposalCompactData): void {
    const text = (data.paymentNotes || '').trim()
    if (!text) {
      this.doc.setTextColor(COLORS_REMATRICULA_COMPACT.mediumGray)
      this.doc.setFontSize(TYPOGRAPHY_REMATRICULA_COMPACT.body.size)
      this.doc.text('—', LAYOUT_REMATRICULA_COMPACT.margins.left, this.currentY)
      this.currentY += LAYOUT_REMATRICULA_COMPACT.lineHeight
      return
    }

    // Normalizar quebras de linha e dividir por largura
    const normalized = text.replace(/\r\n?/g, '\n')
    const lines = this.doc.splitTextToSize(normalized, LAYOUT_REMATRICULA_COMPACT.contentWidth)

    // Checar espaço restante na página; se insuficiente, cria nova página antes de desenhar
    const bottomLimit = 297 - LAYOUT_REMATRICULA_COMPACT.margins.bottom - 20
    const estimatedHeight = lines.length * (TYPOGRAPHY_REMATRICULA_COMPACT.body.size * 0.5 + 3)
    if (this.currentY + estimatedHeight > bottomLimit) {
      this.doc.addPage()
      this.currentY = LAYOUT_REMATRICULA_COMPACT.margins.top
    }

    this.doc.setTextColor(COLORS_REMATRICULA_COMPACT.text)
    this.doc.setFont('helvetica', 'normal')
    this.doc.setFontSize(TYPOGRAPHY_REMATRICULA_COMPACT.body.size)
    this.doc.text(lines as any, LAYOUT_REMATRICULA_COMPACT.margins.left, this.currentY)

    this.currentY += (lines.length * 5) + 2
  }

  // Utilitários
  private drawField(label: string, value: string, x: number, y: number, maxWidth: number): void {
    this.doc.setTextColor(COLORS_REMATRICULA_COMPACT.text)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setFontSize(TYPOGRAPHY_REMATRICULA_COMPACT.label.size)
    const labelWidth = this.doc.getTextWidth(label)
    this.doc.text(label, x, y)

    this.doc.setFont('helvetica', 'normal')
    this.doc.setFontSize(TYPOGRAPHY_REMATRICULA_COMPACT.body.size)

    const valueX = x + labelWidth + 2
    const availableWidth = maxWidth - labelWidth - 2
    const truncated = this.truncate(value, availableWidth)
    this.doc.text(truncated, valueX, y)
  }

  private formatCPF(cpf: string): string {
    if (!cpf) return ''
    const cleaned = cpf.replace(/\D/g, '')
    if (cleaned.length !== 11) return cpf
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }

  private formatPhone(phone: string): string {
    if (!phone) return ''
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length === 11) return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1)$2-$3')
    if (cleaned.length === 10) return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1)$2-$3')
    return phone
  }

  private formatCEP(cep: string): string {
    if (!cep) return ''
    const cleaned = cep.replace(/\D/g, '')
    if (cleaned.length !== 8) return cep
    return cleaned.replace(/(\d{5})(\d{3})/, '$1-$2')
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
  }

  private truncate(text: string, maxWidth: number): string {
    if (!text) return ''
    const w = this.doc.getTextWidth(text)
    if (w <= maxWidth) return text
    let t = text
    while (this.doc.getTextWidth(t + '...') > maxWidth && t.length > 0) {
      t = t.slice(0, -1)
    }
    return t + '...'
  }
}
