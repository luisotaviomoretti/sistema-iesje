import type { EnrollmentFormData } from '@/features/matricula-nova/types/forms'
import type { PreviousYearPrefill } from '../types'
import { FIRST_STEP } from '@/features/matricula-nova/constants/steps'

export function mapPreviousYearToEnrollmentForm(prev: PreviousYearPrefill): EnrollmentFormData {
  const student = prev.student
  const guardians = prev.guardians
  const address = prev.address
  const academic = prev.academic
  const discounts = prev.finance?.previous_applied_discounts || []

  return {
    student: {
      name: student.name || '',
      cpf: (student.cpf || '').replace(/\D/g, ''),
      rg: student.rg || '',
      birthDate: String(student.birth_date || ''),
      gender: student.gender,
      escola: student.escola,
    },
    guardians: {
      guardian1: {
        name: guardians.guardian1?.name || '',
        cpf: (guardians.guardian1?.cpf || '').replace(/\D/g, ''),
        phone: guardians.guardian1?.phone || '',
        email: guardians.guardian1?.email || '',
        relationship: guardians.guardian1?.relationship || 'responsavel',
      },
      guardian2: guardians.guardian2
        ? {
            name: guardians.guardian2.name || '',
            cpf: (guardians.guardian2.cpf || '').replace(/\D/g, ''),
            phone: guardians.guardian2.phone || '',
            email: guardians.guardian2.email || '',
            relationship: guardians.guardian2.relationship || 'responsavel',
          }
        : null,
    },
    address: {
      cep: address.cep || '',
      street: address.street || '',
      number: address.number || '',
      complement: address.complement || '',
      district: address.district || '',
      city: address.city || '',
      state: address.state || '',
    },
    academic: {
      seriesId: academic.series_id || '',
      trackId: academic.track_id || '',
      shift: academic.shift,
    },
    selectedDiscounts: discounts.map(d => ({ id: d.discount_id, percentual: d.percentage_applied || 0 })),
    currentStep: FIRST_STEP,
    isSubmitting: false,
    errors: {},
  }
}

