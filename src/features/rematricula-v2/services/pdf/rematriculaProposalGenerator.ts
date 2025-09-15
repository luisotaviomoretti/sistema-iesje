import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { RematriculaPricingService } from '../rematriculaPricingService'
import type { RematriculaReadModel } from '../../types/details'
import {
  PDFTemplatesRematriculaCompact,
  PDF_CONFIG_REMATRICULA_COMPACT,
  type RematriculaProposalCompactData,
} from './pdfTemplatesRematriculaCompact'

export interface RematriculaProposalData {
  readModel: RematriculaReadModel
  series: any | null
  discounts: Array<{ trilho?: string; tipoDescontoId?: string; percentual?: number; id?: string; codigo?: string; nome?: string }>
  // Quando não houver descontos manuais, usar o sugerido (já com CAP aplicado)
  suggestedPercentageOverride?: number | null
}

function formatCurrencyBR(value?: number | null): string {
  const v = typeof value === 'number' ? value : 0
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

function formatPercent(value?: number | null): string {
  const v = typeof value === 'number' ? value : 0
  return `${v.toFixed(2)}%`
}

export class RematriculaProposalGenerator {
  private doc: jsPDF
  private templates: PDFTemplatesRematriculaCompact

  constructor() {
    this.doc = new jsPDF(PDF_CONFIG_REMATRICULA_COMPACT)
    this.templates = new PDFTemplatesRematriculaCompact(this.doc)
  }

  private reset() {
    this.doc = new jsPDF(PDF_CONFIG_REMATRICULA_COMPACT)
    this.templates = new PDFTemplatesRematriculaCompact(this.doc)
  }

  async generateProposal(data: RematriculaProposalData): Promise<Blob> {
    // Resetar doc a cada geração
    this.reset()

    const { readModel, series, discounts, suggestedPercentageOverride } = data

    // 1) Determinar descontos efetivos (manuais ou sugerido CAP)
    let effectiveDiscounts = (discounts || []) as any[]
    const suggestedPercentage = (!effectiveDiscounts || effectiveDiscounts.length === 0)
      ? (typeof suggestedPercentageOverride === 'number'
          ? suggestedPercentageOverride
          : (readModel.financial?.total_discount_percentage || 0))
      : 0
    if ((!effectiveDiscounts || effectiveDiscounts.length === 0) && suggestedPercentage > 0) {
      effectiveDiscounts = [{ id: 'suggested', codigo: 'SUGERIDO', nome: 'Desconto do ano anterior', percentual: suggestedPercentage, trilho: 'especial' }]
    }

    const formattedDiscounts = (effectiveDiscounts || []).map((d: any) => {
      const code = d.tipoDescontoId || d.codigo || 'SUGERIDO'
      // Nome amigável para códigos padrão sem depender de chamadas extras
      let nome = d.nome as string | undefined
      if (!nome) {
        if (String(code).toUpperCase() === 'SUGERIDO') nome = 'Desconto do ano anterior'
        else if (String(code).toUpperCase() === 'PAV') nome = 'Pagamento à Vista'
        else nome = 'Desconto'
      }
      return {
        id: d.tipoDescontoId || d.id || code,
        codigo: code,
        nome,
        percentual: d.percentual || 0,
        trilho: d.trilho,
      }
    })

    // 2) Cálculo financeiro para o template
    const pricing = series ? RematriculaPricingService.calculate(series, formattedDiscounts as any) : null

    // 3) Montar dados para o template compacto (independente)
    const templateData: RematriculaProposalCompactData = {
      readModel,
      seriesInfo: {
        id: series?.id,
        nome: series?.nome || readModel.academic?.series_name,
        valor_material: series?.valor_material ?? pricing?.materialValue ?? readModel.financial?.material_cost ?? 0,
        valor_mensal_sem_material: series?.valor_mensal_sem_material ?? pricing?.baseValue ?? readModel.financial?.base_value ?? 0,
        valor_mensal_com_material:
          series?.valor_mensal_com_material ?? ((pricing?.baseValue ?? readModel.financial?.base_value ?? 0) + (pricing?.materialValue ?? readModel.financial?.material_cost ?? 0)),
      },
      trackInfo: { id: series?.trilho_id, nome: series?.trilho_nome || readModel.academic?.track_name },
      selectedDiscounts: formattedDiscounts.map((d) => ({ id: d.id, percentual: d.percentual })),
      discountsInfo: formattedDiscounts.map((d) => ({ id: d.id, codigo: d.codigo, nome: d.nome })),
      pricing: {
        baseValue: pricing?.baseValue ?? readModel.financial?.base_value ?? 0,
        materialValue: pricing?.materialValue ?? readModel.financial?.material_cost ?? 0,
        totalDiscountPercentage: pricing?.totalDiscountPercentage ?? readModel.financial?.total_discount_percentage ?? 0,
      },
    }

    // 4) Gerar o PDF com o template compacto (mesmo visual do novo aluno)
    this.templates.generateProposal(templateData)

    // 5) Retornar o blob
    return this.doc.output('blob')
  }

  async generateAndDownload(data: RematriculaProposalData, filename?: string): Promise<void> {
    const blob = await this.generateProposal(data)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    const studentName = data.readModel?.student?.name || 'aluno'
    link.download = filename || `proposta-rematricula-${studentName.replace(/\s+/g, '-').toLowerCase()}.pdf`
    document.body.appendChild(link)
    link.click()
    setTimeout(() => {
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    }, 100)
  }

  async generatePreviewURL(data: RematriculaProposalData): Promise<string> {
    const blob = await this.generateProposal(data)
    return URL.createObjectURL(blob)
  }
}

let singleton: RematriculaProposalGenerator | null = null
export function getRematriculaProposalGenerator(): RematriculaProposalGenerator {
  if (!singleton) singleton = new RematriculaProposalGenerator()
  return singleton
}
