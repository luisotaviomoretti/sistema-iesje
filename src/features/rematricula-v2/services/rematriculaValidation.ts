import type { RematriculaReadModel } from '../types/details'
import { RematriculaPricingService } from './rematriculaPricingService'

export interface ValidateInput {
  readModel: RematriculaReadModel | null
  series: any | null
  shift: 'morning' | 'afternoon' | 'night' | null
  discounts: Array<{ trilho?: string; tipoDescontoId?: string; percentual?: number; id?: string; codigo?: string; nome?: string }>
}

export interface ValidationResult {
  ok: boolean
  errors: string[]
}

const onlyDigits = (v?: string | null) => (v || '').replace(/\D/g, '')

export function validateFinalizeInput({ readModel, series, shift, discounts }: ValidateInput): ValidationResult {
  const errors: string[] = []
  if (!readModel) return { ok: false, errors: ['Dados do aluno não carregados.'] }

  const s = readModel.student || ({} as any)
  const g1 = readModel.guardians?.guardian1 || ({} as any)
  const addr = readModel.address || ({} as any)

  // Student
  if (!s?.name) errors.push('Nome do aluno é obrigatório')
  if (!s?.birth_date) errors.push('Data de nascimento é obrigatória')
  if (!s?.escola) errors.push('Escola é obrigatória')

  // Guardian 1 (obrigatório conforme schema)
  if (!g1?.name) errors.push('Nome do responsável é obrigatório')
  if (!g1?.phone) errors.push('Telefone do responsável é obrigatório')
  if (!g1?.email) errors.push('Email do responsável é obrigatório')

  // Address (campos NOT NULL no schema)
  if (!addr?.cep) errors.push('CEP é obrigatório')
  if (!addr?.street) errors.push('Logradouro é obrigatório')
  if (!addr?.number) errors.push('Número do endereço é obrigatório')
  if (!addr?.city) errors.push('Cidade é obrigatória')
  if (!addr?.state) errors.push('UF é obrigatória')

  // Selection
  if (!series?.id) errors.push('Selecione a série do próximo ano')
  if (!shift) errors.push('Selecione o turno do próximo ano')

  // Finance/pricing validation — somente se há série
  if (series) {
    const formattedDiscounts = (discounts || []).map((d: any) => ({
      id: d.tipoDescontoId || d.id,
      codigo: d.tipoDescontoId || d.codigo || 'SUGERIDO',
      nome: d.nome || 'Desconto',
      percentual: d.percentual || 0,
      trilho: d.trilho,
    }))

    try {
      const pricing = RematriculaPricingService.calculate(series, formattedDiscounts as any)
      if (!pricing?.isValid) {
        errors.push('Estrutura de valores da série inválida para cálculo')
      }
      if ((pricing?.totalDiscountPercentage ?? 0) < 0) {
        errors.push('Percentual de desconto inválido')
      }
      if ((pricing?.finalMonthlyValue ?? 0) < 0) {
        errors.push('Mensalidade final calculada inválida')
      }
    } catch (e) {
      errors.push('Falha ao calcular valores financeiros')
    }
  }

  return { ok: errors.length === 0, errors }
}

