/**
 * Mapeadores puros para o Read Model da página de detalhes da Rematrícula.
 * Sem dependências de hooks/serviços ou do fluxo de aluno novo.
 */

import type {
  RematriculaReadModel,
  PreviousYearStudentRowMinimal,
  EnrollmentRowMinimal,
} from '../types/details'
import { cleanCPF } from '../utils/formValidators'

function toNumber(value: unknown): number | undefined {
  if (value === null || value === undefined) return undefined
  const n = typeof value === 'number' ? value : Number(String(value).replace(',', '.'))
  return Number.isFinite(n) ? n : undefined
}

function nowIso(): string {
  return new Date().toISOString()
}

export function mapPreviousYearToReadModel(row: PreviousYearStudentRowMinimal): RematriculaReadModel {
  const cpf = cleanCPF(row.student_cpf || row.student_cpf_digits || '')

  return {
    student: {
      id: row.id,
      name: row.student_name || '',
      cpf,
      birth_date: row.student_birth_date || undefined,
      gender: row.student_gender || undefined,
      escola: row.student_escola || undefined,
    },
    academic: {
      academic_year: row.academic_year,
      series_id: row.series_id,
      series_name: row.series_name,
      track_id: row.track_id,
      track_name: row.track_name,
      shift: row.shift,
    },
    guardians: {
      guardian1: {
        name: row.guardian1_name || '',
        cpf: cleanCPF(row.guardian1_cpf || ''),
        phone: row.guardian1_phone || undefined,
        email: row.guardian1_email || undefined,
        relationship: row.guardian1_relationship || undefined,
      },
      guardian2: row.guardian2_name || row.guardian2_cpf ? {
        name: row.guardian2_name || '',
        cpf: cleanCPF(row.guardian2_cpf || ''),
        phone: row.guardian2_phone || undefined,
        email: row.guardian2_email || undefined,
        relationship: row.guardian2_relationship || undefined,
      } : undefined,
    },
    address: {
      cep: row.address_cep,
      street: row.address_street,
      number: row.address_number,
      complement: row.address_complement,
      district: row.address_district,
      city: row.address_city,
      state: row.address_state,
    },
    financial: {
      base_value: toNumber(row.base_value),
      total_discount_percentage: toNumber(row.total_discount_percentage),
      final_monthly_value: toNumber(row.final_monthly_value),
      applied_discounts: Array.isArray(row.applied_discounts) ? row.applied_discounts : undefined,
      total_discount_value: toNumber(row.total_discount_value),
      material_cost: toNumber(row.material_cost),
      pdf_url: row.pdf_url,
      pdf_generated_at: row.pdf_generated_at,
      suggested_discount_code: (row as any).discount_code || undefined,
      suggested_discount_description: (row as any).discount_description || undefined,
    },
    meta: {
      source: 'previous_year',
      fetched_at: nowIso(),
      raw: undefined,
    },
  }
}

export function mapEnrollmentToReadModel(row: EnrollmentRowMinimal): RematriculaReadModel {
  const cpf = cleanCPF(row.student_cpf || row.student_cpf_digits || '')

  return {
    student: {
      id: row.id,
      name: row.student_name || '',
      cpf,
      birth_date: row.student_birth_date || undefined,
      gender: row.student_gender || undefined,
      escola: row.student_escola || undefined,
    },
    academic: {
      academic_year: undefined, // normalmente não há academic_year em enrollments
      series_id: row.series_id,
      series_name: row.series_name,
      track_id: row.track_id,
      track_name: row.track_name,
      shift: row.shift,
    },
    guardians: {
      guardian1: {
        name: row.guardian1_name || '',
        cpf: cleanCPF(row.guardian1_cpf || ''),
        phone: row.guardian1_phone || undefined,
        email: row.guardian1_email || undefined,
        relationship: row.guardian1_relationship || undefined,
      },
      guardian2: row.guardian2_name || row.guardian2_cpf ? {
        name: row.guardian2_name || '',
        cpf: cleanCPF(row.guardian2_cpf || ''),
        phone: row.guardian2_phone || undefined,
        email: row.guardian2_email || undefined,
        relationship: row.guardian2_relationship || undefined,
      } : undefined,
    },
    address: {
      cep: row.address_cep,
      street: row.address_street,
      number: row.address_number,
      complement: row.address_complement,
      district: row.address_district,
      city: row.address_city,
      state: row.address_state,
    },
    financial: {
      base_value: toNumber(row.base_value),
      total_discount_percentage: toNumber(row.total_discount_percentage),
      final_monthly_value: toNumber(row.final_monthly_value),
      applied_discounts: Array.isArray(row.applied_discounts) ? row.applied_discounts : undefined,
      material_cost: toNumber(row.material_cost),
      pdf_url: row.pdf_url,
      pdf_generated_at: row.pdf_generated_at,
    },
    meta: {
      source: 'enrollment',
      fetched_at: nowIso(),
      raw: undefined,
    },
  }
}

/**
 * Mescla dois read models (quando desejarmos aproveitar informações de ambas as fontes).
 * Prioriza valores não nulos do modelo principal; completa demais campos com o secundário.
 */
export function mergeReadModels(
  primary: RematriculaReadModel,
  secondary: RematriculaReadModel
): RematriculaReadModel {
  const pick = <T extends Record<string, any>>(a: T, b: T): T => ({
    ...b,
    ...Object.fromEntries(
      Object.keys(a).map((k) => [k, a[k] ?? b[k]])
    ),
  }) as T

  return {
    student: pick(primary.student, secondary.student),
    academic: pick(primary.academic, secondary.academic),
    guardians: {
      guardian1: pick(primary.guardians.guardian1, secondary.guardians.guardian1),
      guardian2: primary.guardians.guardian2
        ? pick(primary.guardians.guardian2, secondary.guardians.guardian2!)
        : (secondary.guardians.guardian2 ?? undefined),
    },
    address: pick(primary.address, secondary.address),
    financial: pick(primary.financial, secondary.financial),
    meta: {
      source: 'both',
      fetched_at: primary.meta?.fetched_at || secondary.meta?.fetched_at || nowIso(),
      has_permission_issue: primary.meta?.has_permission_issue || secondary.meta?.has_permission_issue,
    },
  }
}
