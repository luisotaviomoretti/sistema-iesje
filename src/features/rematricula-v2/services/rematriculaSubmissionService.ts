import { supabase } from '@/lib/supabase'
import { RematriculaPricingService } from './rematriculaPricingService'
import { isMacomTrack } from '../utils/track'
import type { RematriculaReadModel } from '../types/details'

export interface CurrentUserLike {
  id: string | null
  email: string | null
  name: string | null
  type: 'admin' | 'matricula' | 'anonymous'
}

export interface BuildPayloadInput {
  readModel: RematriculaReadModel
  series: any | null
  discounts: Array<{ trilho?: string; tipoDescontoId?: string; percentual?: number; id?: string; codigo?: string; nome?: string }>
  shift?: 'morning' | 'afternoon' | 'night' | string | null
  currentUser?: CurrentUserLike
  destinationSchoolFormValue?: string | null
  // Quando não há descontos manuais, usar este percentual sugerido (ex.: já aplicando CAP)
  suggestedPercentageOverride?: number
  // F3 — Observações da Forma de Pagamento (flag + valor opcional)
  paymentNotesEnabled?: boolean
  paymentNotes?: string
}

export interface BuildPayloadOutput {
  p_enrollment: Record<string, any>
  p_discounts: Array<Record<string, any>>
  client_tx_id: string
}

function generateClientTxId(): string {
  try {
    // @ts-ignore
    if (typeof crypto !== 'undefined' && typeof (crypto as any).randomUUID === 'function') {
      // @ts-ignore
      return (crypto as any).randomUUID()
    }
  } catch {}
  // Fallback simples
  const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1)
  return `${s4()}${s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`
}

function toDateOnly(value?: string | null): string | null {
  if (!value) return null
  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
    const d = new Date(value)
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
    return null
  } catch {
    return null
  }
}

export const RematriculaSubmissionService = {
  buildPayload({ readModel, series, discounts, shift, currentUser, destinationSchoolFormValue, suggestedPercentageOverride, paymentNotesEnabled, paymentNotes }: BuildPayloadInput): BuildPayloadOutput {
    const student = readModel.student || ({} as any)
    const guardians = readModel.guardians || ({} as any)
    const address = readModel.address || ({} as any)
    const academic = readModel.academic || ({} as any)

    // Calcular pricing com base na série selecionada + descontos (ou sugerido)
    let effectiveDiscounts = (discounts || []) as any[]
    // F6: Se MACOM e sem descontos manuais, nunca injete "SUGERIDO"
    const macom = isMacomTrack(readModel as any)
    const suggestedPercentage = (!effectiveDiscounts || effectiveDiscounts.length === 0)
      ? (
          macom
            ? 0
            : (
                typeof suggestedPercentageOverride === 'number'
                  ? suggestedPercentageOverride
                  : (readModel?.financial?.total_discount_percentage || 0)
              )
        )
      : 0
    if ((!effectiveDiscounts || effectiveDiscounts.length === 0) && suggestedPercentage > 0) {
      effectiveDiscounts = [{ id: 'suggested', codigo: 'SUGERIDO', nome: 'Desconto do ano anterior', percentual: suggestedPercentage, trilho: 'especial' }]
    }

    // Formatar descontos para o serviço de cálculo (com nomes amigáveis quando necessário)
    const formattedDiscounts = (effectiveDiscounts || []).map((d: any) => {
      const code = d.tipoDescontoId || d.codigo || 'SUGERIDO'
      let nome = d.nome as string | undefined
      if (!nome) {
        const up = String(code).toUpperCase()
        if (up === 'SUGERIDO') nome = 'Desconto do ano anterior'
        else if (up === 'PAV') nome = 'Pagamento à Vista'
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

    // Rodar cálculo apenas se houver série selecionada
    const pricing = series ? RematriculaPricingService.calculate(series, formattedDiscounts as any) : null

    // Derivar campos financeiros (fallbacks do read model)
    const base_value = pricing?.baseValue ?? readModel.financial?.base_value ?? 0
    const material_cost = pricing?.materialValue ?? readModel.financial?.material_cost ?? 0
    const total_discount_percentage = pricing?.totalDiscountPercentage ?? readModel.financial?.total_discount_percentage ?? 0
    const total_discount_value = pricing?.totalDiscountValue ?? readModel.financial?.total_discount_value ?? 0
    // Alinhamento de semântica com fluxo de Novo Aluno:
    // final_monthly_value = base_value - total_discount_value (SEM material)
    // material_cost é persistido no campo próprio.
    const final_monthly_value = Math.max(0,
      (typeof pricing?.baseValue === 'number' && typeof pricing?.totalDiscountValue === 'number')
        ? (pricing.baseValue - pricing.totalDiscountValue)
        : (typeof readModel.financial?.base_value === 'number' && typeof readModel.financial?.total_discount_value === 'number')
          ? (readModel.financial.base_value - readModel.financial.total_discount_value)
          : (base_value - total_discount_value)
    )

    // Determinar nível de aprovação (espelhando regra simplificada)
    const approval_level = total_discount_percentage <= 20 ? 'automatic' : total_discount_percentage <= 50 ? 'coordinator' : 'director'

    // Série / trilho
    const series_id = series?.id || academic.series_id || ''
    const series_name = series?.nome || academic.series_name || 'N/A'
    // Ainda não há seleção de trilho na UI — manter o do ano anterior se presente
    const track_id = academic.track_id || 'track-regular'
    const track_name = academic.track_name || 'Regular'

    // Turno: priorizar o selecionado, senão o do modelo
    const shiftValue = (shift as any) || academic.shift || null

    // Escola: destino deve prevalecer sobre origem quando informado
    const finalEscola = (destinationSchoolFormValue && typeof destinationSchoolFormValue === 'string'
      ? destinationSchoolFormValue
      : student.escola) || 'pelicano'

    const p_enrollment: Record<string, any> = {
      // Aluno
      student_name: student.name || '',
      student_cpf: (student.cpf || '').replace(/\D/g, ''),
      student_rg: null,
      student_birth_date: toDateOnly(student.birth_date),
      student_gender: student.gender || null,
      student_escola: finalEscola,

      // Acadêmico
      series_id,
      series_name,
      track_id,
      track_name,
      shift: shiftValue,

      // Responsáveis
      guardian1_name: guardians?.guardian1?.name || '',
      guardian1_cpf: (guardians?.guardian1?.cpf || '').replace(/\D/g, ''),
      guardian1_phone: guardians?.guardian1?.phone || '',
      guardian1_email: guardians?.guardian1?.email || '',
      guardian1_relationship: guardians?.guardian1?.relationship || 'responsavel',

      guardian2_name: guardians?.guardian2?.name || null,
      guardian2_cpf: (guardians?.guardian2?.cpf || '').replace(/\D/g, '') || null,
      guardian2_phone: guardians?.guardian2?.phone || null,
      guardian2_email: guardians?.guardian2?.email || null,
      guardian2_relationship: guardians?.guardian2?.relationship || null,

      // Endereço
      address_cep: address?.cep || '',
      address_street: address?.street || '',
      address_number: address?.number || '',
      address_complement: address?.complement || null,
      address_district: address?.district || '',
      address_city: address?.city || '',
      address_state: address?.state || '',

      // Financeiro
      base_value,
      total_discount_percentage,
      total_discount_value,
      final_monthly_value,
      material_cost,

      // Status
      status: 'submitted',
      approval_level,
      approval_status: 'pending',

      // PDF (não aplicável nesta fase)
      pdf_url: null,
      pdf_generated_at: null,

      // Tracking de usuário
      created_by_user_id: currentUser?.id || null,
      created_by_user_email: currentUser?.email || null,
      created_by_user_name: currentUser?.name || null,
      created_by_user_type: currentUser?.type || 'anonymous',
      
      // tag_matricula derivada no servidor (trigger BEFORE INSERT)
    }

    // F3 — Incluir observações de pagamento, quando habilitado e preenchido (sanitização leve no cliente)
    if (paymentNotesEnabled) {
      const raw = (paymentNotes || '').toString()
      const trimmed = raw.trim()
      if (trimmed.length > 0) {
        // Normalizar quebras de linha para LF, colapsar 3+ em 2, limitar 1000 chars
        const normalized = trimmed.replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n').slice(0, 1000)
        if (normalized.length > 0) {
          p_enrollment.payment_notes = normalized
        }
      }
    }

    const p_discounts = (formattedDiscounts || []).map((d: any) => ({
      discount_id: d.id,
      discount_code: d.codigo || '',
      discount_name: d.nome || '',
      discount_category: d.trilho || 'unknown',
      percentage_applied: d.percentual || 0,
      value_applied: pricing ? (pricing.baseValue * (d.percentual || 0)) / 100 : 0,
    }))

    const client_tx_id = generateClientTxId()

    return { p_enrollment, p_discounts, client_tx_id }
  },

  async finalizeRematricula(input: BuildPayloadInput): Promise<string> {
    const { p_enrollment, p_discounts, client_tx_id } = this.buildPayload(input)
    try {
      // DEV-only debug: confirmar payload com CAP aplicado
      if ((import.meta as any)?.env?.DEV) {
        console.debug('[RematriculaSubmission] Payload debug', {
          suggestedPercentageOverride: input?.suggestedPercentageOverride,
          total_discount_percentage: p_enrollment?.total_discount_percentage,
          discounts_preview: p_discounts?.map?.((d) => ({ code: d.discount_code, pct: d.percentage_applied })),
          client_tx_id
        })
      }
    } catch {}
    const { data, error } = await supabase.rpc('enroll_finalize', {
      p_enrollment,
      p_discounts,
      p_client_tx_id: client_tx_id,
    })
    if (error) throw error
    const payload = Array.isArray(data) ? data[0] : (data as any)
    const enrollmentId = payload?.enrollment_id
    if (!enrollmentId) throw new Error('Falha ao obter protocolo da matrícula')
    return enrollmentId as string
  }
}
