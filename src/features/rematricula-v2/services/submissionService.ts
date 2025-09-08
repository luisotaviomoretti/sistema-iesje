/**
 * Serviço de submissão de rematrícula
 * Envia dados para o backend e gera proposta
 */

import { supabase } from '@/lib/supabase'
import { RematriculaData, SubmissionResult } from '../types'

export class SubmissionService {
  /**
   * Submete dados de rematrícula
   */
  static async submitRematricula(data: RematriculaData): Promise<SubmissionResult> {
    try {
      // Valida dados obrigatórios
      const validationErrors = this.validateRequiredFields(data)
      if (Object.keys(validationErrors).length > 0) {
        return {
          success: false,
          error: 'Dados incompletos',
          validationErrors
        }
      }

      // Prepara dados para envio
      const enrollmentData = this.prepareEnrollmentData(data)

      // Envia para o banco
      const { data: enrollment, error } = await supabase
        .from('enrollments')
        .insert(enrollmentData)
        .select()
        .single()

      if (error) {
        console.error('Erro ao salvar matrícula:', error)
        return {
          success: false,
          error: error.message
        }
      }

      // Gera proposta PDF (chamaria serviço de PDF)
      const proposalUrl = `/api/proposals/${enrollment.id}.pdf`

      return {
        success: true,
        enrollmentId: enrollment.id,
        proposalUrl
      }

    } catch (error) {
      console.error('Erro na submissão:', error)
      return {
        success: false,
        error: 'Erro ao processar matrícula'
      }
    }
  }

  /**
   * Valida campos obrigatórios
   */
  private static validateRequiredFields(data: RematriculaData): Record<string, string> {
    const errors: Record<string, string> = {}

    // Valida dados do aluno
    if (!data.student?.name) errors['student.name'] = 'Nome é obrigatório'
    if (!data.student?.cpf) errors['student.cpf'] = 'CPF é obrigatório'
    if (!data.student?.birth_date) errors['student.birth_date'] = 'Data de nascimento é obrigatória'

    // Valida responsável principal
    if (!data.guardians?.guardian1?.name) errors['guardian1.name'] = 'Nome do responsável é obrigatório'
    if (!data.guardians?.guardian1?.cpf) errors['guardian1.cpf'] = 'CPF do responsável é obrigatório'
    if (!data.guardians?.guardian1?.phone) errors['guardian1.phone'] = 'Telefone é obrigatório'

    // Valida endereço
    if (!data.address?.cep) errors['address.cep'] = 'CEP é obrigatório'
    if (!data.address?.street) errors['address.street'] = 'Rua é obrigatória'
    if (!data.address?.number) errors['address.number'] = 'Número é obrigatório'
    if (!data.address?.district) errors['address.district'] = 'Bairro é obrigatório'
    if (!data.address?.city) errors['address.city'] = 'Cidade é obrigatória'

    // Valida dados acadêmicos
    if (!data.academic?.series_id) errors['academic.series_id'] = 'Série é obrigatória'
    if (!data.academic?.track_id) errors['academic.track_id'] = 'Trilho é obrigatório'
    if (!data.academic?.shift) errors['academic.shift'] = 'Turno é obrigatório'

    return errors
  }

  /**
   * Prepara dados para formato do banco
   */
  private static prepareEnrollmentData(data: RematriculaData): any {
    return {
      // Dados do aluno
      student_name: data.student.name,
      student_cpf: data.student.cpf,
      student_rg: data.student.rg,
      student_birth_date: data.student.birth_date,
      student_gender: data.student.gender,
      escola: data.student.escola,

      // Responsáveis
      guardian1_name: data.guardians.guardian1.name,
      guardian1_cpf: data.guardians.guardian1.cpf,
      guardian1_phone: data.guardians.guardian1.phone,
      guardian1_email: data.guardians.guardian1.email,
      guardian1_relationship: data.guardians.guardian1.relationship,
      guardian1_is_financial_responsible: data.guardians.guardian1.is_financial_responsible || true,

      guardian2_name: data.guardians.guardian2?.name,
      guardian2_cpf: data.guardians.guardian2?.cpf,
      guardian2_phone: data.guardians.guardian2?.phone,
      guardian2_email: data.guardians.guardian2?.email,
      guardian2_relationship: data.guardians.guardian2?.relationship,
      guardian2_is_financial_responsible: data.guardians.guardian2?.is_financial_responsible,

      // Endereço
      address_cep: data.address.cep,
      address_street: data.address.street,
      address_number: data.address.number,
      address_complement: data.address.complement,
      address_district: data.address.district,
      address_city: data.address.city,
      address_state: data.address.state,

      // Acadêmico
      series_id: data.academic.series_id,
      track_id: data.academic.track_id,
      shift: data.academic.shift,

      // Financeiro
      base_value: data.financial.base_value,
      total_discount_percentage: data.financial.total_discount_percentage,
      final_monthly_value: data.financial.final_monthly_value,
      applied_discounts: data.financial.applied_discounts,

      // Metadata
      enrollment_type: 're-enrollment',
      academic_year: new Date().getFullYear(),
      status: 'pending',
      created_at: new Date().toISOString()
    }
  }

  /**
   * Salva rascunho parcial
   */
  static async saveDraft(data: Partial<RematriculaData>): Promise<{ success: boolean; draftId?: string }> {
    try {
      const draftData = {
        data: JSON.stringify(data),
        created_at: new Date().toISOString()
      }

      const { data: draft, error } = await supabase
        .from('enrollment_drafts')
        .insert(draftData)
        .select()
        .single()

      if (error) {
        console.error('Erro ao salvar rascunho:', error)
        return { success: false }
      }

      return { 
        success: true, 
        draftId: draft.id 
      }

    } catch (error) {
      console.error('Erro ao salvar rascunho:', error)
      return { success: false }
    }
  }
}