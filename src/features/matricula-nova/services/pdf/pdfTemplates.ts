import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { 
  PAGE_DIMENSIONS, 
  COLORS, 
  FONTS, 
  POSITIONS,
  formatCurrency,
  formatDate,
  formatCPF,
  formatPhone,
  formatCEP,
  DEFAULT_TEXTS,
  TABLE_STYLES
} from './pdfStyles'

export class PDFTemplates {
  private doc: jsPDF
  private currentY: number

  constructor(doc: jsPDF) {
    this.doc = doc
    this.currentY = PAGE_DIMENSIONS.margins.top
  }

  // Reset Y position for new page
  public resetY(): void {
    this.currentY = PAGE_DIMENSIONS.margins.top
  }

  // Check if needs new page
  public checkPageBreak(requiredSpace: number = 30): boolean {
    if (this.currentY + requiredSpace > PAGE_DIMENSIONS.height - PAGE_DIMENSIONS.margins.bottom) {
      this.doc.addPage()
      this.resetY()
      return true
    }
    return false
  }

  // Add spacing
  public addSpace(space: number = 5): void {
    this.currentY += space
  }

  // Draw header with logo and title
  public drawHeader(proposalNumber: string): void {
    // Background header
    this.doc.setFillColor(COLORS.primary)
    this.doc.rect(0, 0, PAGE_DIMENSIONS.width, 40, 'F')

    // Logo area (placeholder - você pode adicionar uma imagem real aqui)
    this.doc.setFillColor(COLORS.white)
    this.doc.setDrawColor(COLORS.white)
    this.doc.rect(POSITIONS.logo.x, POSITIONS.logo.y, POSITIONS.logo.width, POSITIONS.logo.height, 'FD')
    
    // Logo text
    this.doc.setTextColor(COLORS.primary)
    this.doc.setFontSize(14)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text('IESJE', POSITIONS.logo.x + POSITIONS.logo.width / 2, POSITIONS.logo.y + POSITIONS.logo.height / 2, { 
      align: 'center',
      baseline: 'middle'
    })

    // Title
    this.doc.setTextColor(COLORS.white)
    this.doc.setFontSize(FONTS.title.size)
    this.doc.text(DEFAULT_TEXTS.header.title, PAGE_DIMENSIONS.width / 2, POSITIONS.title.y, { 
      align: 'center' 
    })

    // Subtitle
    this.doc.setFontSize(FONTS.subheading.size)
    this.doc.text(DEFAULT_TEXTS.header.subtitle, PAGE_DIMENSIONS.width / 2, POSITIONS.title.y + 7, { 
      align: 'center' 
    })

    // Proposal number and date
    this.doc.setFontSize(FONTS.normal.size)
    const rightX = PAGE_DIMENSIONS.width - PAGE_DIMENSIONS.margins.right
    this.doc.text(`Proposta Nº: ${proposalNumber}`, rightX, POSITIONS.logo.y + 3, { 
      align: 'right' 
    })
    this.doc.text(`Data: ${formatDate(new Date())}`, rightX, POSITIONS.logo.y + 8, { 
      align: 'right' 
    })

    this.currentY = 45
  }

  // Draw section title
  public drawSectionTitle(title: string, icon?: string): void {
    this.checkPageBreak()
    
    // Background
    this.doc.setFillColor(COLORS.background)
    this.doc.rect(PAGE_DIMENSIONS.margins.left, this.currentY, PAGE_DIMENSIONS.contentWidth, 8, 'F')
    
    // Border
    this.doc.setDrawColor(COLORS.primary)
    this.doc.setLineWidth(0.5)
    this.doc.line(PAGE_DIMENSIONS.margins.left, this.currentY + 8, 
                  PAGE_DIMENSIONS.margins.left + PAGE_DIMENSIONS.contentWidth, this.currentY + 8)

    // Text
    this.doc.setTextColor(COLORS.primary)
    this.doc.setFontSize(FONTS.heading.size)
    this.doc.setFont('helvetica', 'bold')
    
    const textX = icon ? PAGE_DIMENSIONS.margins.left + 8 : PAGE_DIMENSIONS.margins.left + 3
    this.doc.text(`${icon ? icon + ' ' : ''}${title}`, textX, this.currentY + 5)

    this.currentY += 12
  }

  // Draw data row
  public drawDataRow(label: string, value: string, highlight: boolean = false): void {
    this.doc.setFontSize(FONTS.normal.size)
    
    // Label
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(COLORS.gray)
    this.doc.text(`${label}:`, PAGE_DIMENSIONS.margins.left, this.currentY)
    
    // Value
    this.doc.setFont('helvetica', 'normal')
    this.doc.setTextColor(highlight ? COLORS.primary : COLORS.dark)
    this.doc.text(value || '-', PAGE_DIMENSIONS.margins.left + 60, this.currentY)
    
    this.currentY += 5
  }

  // Draw student data section with validation
  public drawStudentSection(data: any): void {
    try {
      this.drawSectionTitle('DADOS DO ALUNO', '👤')
      
      const studentData = data?.student || {}
      this.drawDataRow('Nome', studentData.name || 'Não informado')
      this.drawDataRow('CPF', studentData.cpf ? formatCPF(studentData.cpf) : 'Não informado')
      this.drawDataRow('RG', studentData.rg || 'Não informado')
      this.drawDataRow('Data de Nascimento', studentData.birthDate ? formatDate(studentData.birthDate) : 'Não informado')
      this.drawDataRow('Gênero', this.formatGender(studentData.gender))
      this.drawDataRow('Escola', this.formatSchool(studentData.escola))
      
      this.addSpace(5)
    } catch (error) {
      console.error('Erro ao desenhar seção do aluno:', error)
      this.drawDataRow('Erro', 'Não foi possível carregar dados do aluno')
      this.addSpace(5)
    }
  }

  // Draw guardians section with validation
  public drawGuardiansSection(data: any): void {
    try {
      this.drawSectionTitle('DADOS DOS RESPONSÁVEIS', '👨‍👩‍👧‍👦')
      
      const guardians = data?.guardians || {}
      
      // Guardian 1
      if (guardians.guardian1) {
        this.doc.setFont('helvetica', 'bold')
        this.doc.setTextColor(COLORS.secondary)
        this.doc.text('Responsável Principal:', PAGE_DIMENSIONS.margins.left, this.currentY)
        this.currentY += 5
        
        this.drawDataRow('Nome', guardians.guardian1.name)
        this.drawDataRow('CPF', guardians.guardian1.cpf ? formatCPF(guardians.guardian1.cpf) : '-')
        this.drawDataRow('Telefone', guardians.guardian1.phone ? formatPhone(guardians.guardian1.phone) : '-')
        this.drawDataRow('E-mail', guardians.guardian1.email)
        this.drawDataRow('Parentesco', this.formatRelationship(guardians.guardian1.relationship))
        this.addSpace(3)
      }
      
      // Guardian 2 (if exists)
      if (guardians.guardian2 && guardians.guardian2.name) {
        this.doc.setFont('helvetica', 'bold')
        this.doc.setTextColor(COLORS.secondary)
        this.doc.text('Segundo Responsável:', PAGE_DIMENSIONS.margins.left, this.currentY)
        this.currentY += 5
        
        this.drawDataRow('Nome', guardians.guardian2.name)
        this.drawDataRow('CPF', guardians.guardian2.cpf ? formatCPF(guardians.guardian2.cpf) : '-')
        this.drawDataRow('Telefone', guardians.guardian2.phone ? formatPhone(guardians.guardian2.phone) : '-')
        this.drawDataRow('E-mail', guardians.guardian2.email)
        this.drawDataRow('Parentesco', this.formatRelationship(guardians.guardian2.relationship))
      }
      
      this.addSpace(5)
    } catch (error) {
      console.error('Erro ao desenhar seção dos responsáveis:', error)
      this.drawDataRow('Erro', 'Não foi possível carregar dados dos responsáveis')
      this.addSpace(5)
    }
  }

  // Draw address section with validation
  public drawAddressSection(data: any): void {
    try {
      this.drawSectionTitle('ENDEREÇO RESIDENCIAL', '🏠')
      
      const address = data?.address || {}
      
      // Format complete address
      const completeAddress = [
        address.street,
        address.number,
        address.complement,
        address.district,
        address.city,
        address.state
      ].filter(Boolean).join(', ')
      
      this.drawDataRow('CEP', address.cep ? formatCEP(address.cep) : 'Não informado')
      this.drawDataRow('Endereço Completo', completeAddress || 'Não informado')
      
      this.addSpace(5)
    } catch (error) {
      console.error('Erro ao desenhar seção de endereço:', error)
      this.drawDataRow('Erro', 'Não foi possível carregar dados de endereço')
      this.addSpace(5)
    }
  }

  // Draw academic section with validation
  public drawAcademicSection(data: any, seriesInfo: any, trackInfo: any): void {
    try {
      this.drawSectionTitle('INFORMAÇÕES ACADÊMICAS', '🎓')
      
      const academic = data?.academic || {}
      
      this.drawDataRow('Série', seriesInfo?.nome || 'Não selecionada')
      this.drawDataRow('Trilho de Desconto', trackInfo?.nome || 'Não selecionado')
      this.drawDataRow('Turno', this.formatShift(academic.shift))
      
      if (trackInfo?.cap_maximo) {
        this.drawDataRow('CAP Máximo', `${trackInfo.cap_maximo}%`, true)
      }
      
      this.addSpace(5)
    } catch (error) {
      console.error('Erro ao desenhar seção acadêmica:', error)
      this.drawDataRow('Erro', 'Não foi possível carregar dados acadêmicos')
      this.addSpace(5)
    }
  }

  // Draw financial section with table and validation
  public drawFinancialSection(pricing: any, discounts: any[]): void {
    try {
      this.checkPageBreak(60)
      this.drawSectionTitle('RESUMO FINANCEIRO', '💰')
      
      if (!pricing || !pricing.finalValue) {
        this.doc.setTextColor(COLORS.gray)
        this.doc.text('Informações financeiras não disponíveis', PAGE_DIMENSIONS.margins.left, this.currentY)
        this.addSpace(10)
        return
      }

      // Financial table data
      const tableData = []
      
      // Base values
      tableData.push(['Mensalidade com Material', formatCurrency(pricing.baseValue)])
      
      // Discounts
      if (pricing.discounts && pricing.discounts.length > 0) {
        tableData.push(['', '']) // Empty row for spacing
        tableData.push(['DESCONTOS APLICADOS', ''])
        
        pricing.discounts.forEach((discount: any) => {
          const value = (pricing.baseValue * discount.percentage) / 100
          tableData.push([
            `  • ${discount.name} (${discount.percentage.toFixed(1)}%)`,
            `- ${formatCurrency(value)}`
          ])
        })
        
        tableData.push(['Total de Descontos', `- ${formatCurrency(pricing.totalDiscountValue)}`])
      }
      
      // Final value
      tableData.push(['', '']) // Empty row for spacing
      
      // Draw table
      autoTable(this.doc, {
        startY: this.currentY,
        head: [['Descrição', 'Valor']],
        body: tableData,
        foot: [['MENSALIDADE FINAL', formatCurrency(pricing.finalValue)]],
        ...TABLE_STYLES.financial,
        didDrawPage: (data) => {
          this.currentY = (data.cursor?.y || this.currentY) + 5
        }
      })

      // Add economia info if has discounts
      if (pricing.totalDiscountPercentage > 0) {
        this.doc.setFillColor(COLORS.secondary)
        this.doc.setTextColor(COLORS.white)
        const boxY = this.currentY
        this.doc.rect(PAGE_DIMENSIONS.margins.left, boxY, PAGE_DIMENSIONS.contentWidth, 15, 'F')
        
        this.doc.setFontSize(FONTS.subheading.size)
        this.doc.text(
          `✅ ECONOMIA: ${formatCurrency(pricing.totalDiscountValue)} por mês (${pricing.totalDiscountPercentage.toFixed(1)}% de desconto)`,
          PAGE_DIMENSIONS.width / 2,
          boxY + 7,
          { align: 'center' }
        )
        
        this.doc.setFontSize(FONTS.small.size)
        this.doc.text(
          `Economia anual: ${formatCurrency(pricing.totalDiscountValue * 12)}`,
          PAGE_DIMENSIONS.width / 2,
          boxY + 12,
          { align: 'center' }
        )
        
        this.currentY = boxY + 20
      }
    } catch (error) {
      console.error('Erro ao desenhar seção financeira:', error)
      this.doc.setTextColor(COLORS.gray)
      this.doc.text('Erro ao processar informações financeiras', PAGE_DIMENSIONS.margins.left, this.currentY)
      this.addSpace(10)
    }
  }

  // Draw terms and conditions
  public drawTermsSection(): void {
    this.checkPageBreak(50)
    this.drawSectionTitle(DEFAULT_TEXTS.terms.title, '📋')
    
    this.doc.setFontSize(FONTS.small.size)
    this.doc.setTextColor(COLORS.dark)
    
    DEFAULT_TEXTS.terms.content.forEach((term: string) => {
      const lines = this.doc.splitTextToSize(term, PAGE_DIMENSIONS.contentWidth)
      this.doc.text(lines, PAGE_DIMENSIONS.margins.left, this.currentY)
      this.currentY += lines.length * 3 + 2
    })
    
    this.addSpace(5)
  }

  // Draw signature section
  public drawSignatureSection(): void {
    this.checkPageBreak(60)
    this.drawSectionTitle(DEFAULT_TEXTS.signature.title, '✍️')
    
    const signatureY = this.currentY + 10
    const leftX = PAGE_DIMENSIONS.margins.left
    const rightX = PAGE_DIMENSIONS.margins.left + PAGE_DIMENSIONS.contentWidth / 2 + 10
    const lineWidth = 70
    
    // Signature lines
    this.doc.setDrawColor(COLORS.dark)
    this.doc.setLineWidth(0.3)
    
    // Student signature
    this.doc.line(leftX, signatureY, leftX + lineWidth, signatureY)
    this.doc.setFontSize(FONTS.small.size)
    this.doc.setTextColor(COLORS.gray)
    this.doc.text(DEFAULT_TEXTS.signature.student, leftX + lineWidth / 2, signatureY + 3, { align: 'center' })
    
    // Guardian signature
    this.doc.line(rightX, signatureY, rightX + lineWidth, signatureY)
    this.doc.text(DEFAULT_TEXTS.signature.guardian, rightX + lineWidth / 2, signatureY + 3, { align: 'center' })
    
    // Date and place
    const dateY = signatureY + 20
    this.doc.text(`${DEFAULT_TEXTS.signature.place}, ____/____/${new Date().getFullYear()}`, 
                  PAGE_DIMENSIONS.width / 2, dateY, { align: 'center' })
    
    this.currentY = dateY + 10
  }

  // Draw footer
  public drawFooter(): void {
    const footerY = PAGE_DIMENSIONS.height - 15
    
    // Line separator
    this.doc.setDrawColor(COLORS.lightGray)
    this.doc.setLineWidth(0.3)
    this.doc.line(PAGE_DIMENSIONS.margins.left, footerY - 5, 
                  PAGE_DIMENSIONS.width - PAGE_DIMENSIONS.margins.right, footerY - 5)
    
    // Footer text
    this.doc.setFontSize(FONTS.small.size)
    this.doc.setTextColor(COLORS.gray)
    
    // Validity
    this.doc.text(DEFAULT_TEXTS.footer.validity, PAGE_DIMENSIONS.margins.left, footerY)
    
    // Contact
    this.doc.text(DEFAULT_TEXTS.footer.contact, PAGE_DIMENSIONS.width / 2, footerY, { align: 'center' })
    
    // Page number
    const pageCount = this.doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      this.doc.setPage(i)
      this.doc.text(
        `Página ${i} de ${pageCount}`, 
        PAGE_DIMENSIONS.width - PAGE_DIMENSIONS.margins.right, 
        footerY, 
        { align: 'right' }
      )
    }
  }

  // Helper methods for formatting with null safety
  private formatGender(gender: string | undefined | null): string {
    if (!gender) return 'Não informado'
    const genderMap: Record<string, string> = {
      'M': 'Masculino',
      'F': 'Feminino',
      'other': 'Outro'
    }
    return genderMap[gender] || gender || 'Não informado'
  }

  private formatSchool(school: string | undefined | null): string {
    if (!school) return 'Não informado'
    const schoolMap: Record<string, string> = {
      'pelicano': 'Colégio Pelicano',
      'sete_setembro': 'Colégio Sete de Setembro'
    }
    return schoolMap[school] || school || 'Não informado'
  }

  private formatShift(shift: string | undefined | null): string {
    if (!shift) return 'Não informado'
    const shiftMap: Record<string, string> = {
      'morning': 'Matutino',
      'afternoon': 'Vespertino',
      'night': 'Noturno'
    }
    return shiftMap[shift] || shift || 'Não informado'
  }

  private formatRelationship(relationship: string | undefined | null): string {
    if (!relationship) return 'Não informado'
    const relationshipMap: Record<string, string> = {
      'pai': 'Pai',
      'mae': 'Mãe',
      'avo': 'Avô',
      'ava': 'Avó',
      'tio': 'Tio',
      'tia': 'Tia',
      'irmao': 'Irmão',
      'irma': 'Irmã',
      'tutor': 'Tutor Legal',
      'responsavel': 'Responsável'
    }
    return relationshipMap[relationship] || relationship || 'Não informado'
  }
}