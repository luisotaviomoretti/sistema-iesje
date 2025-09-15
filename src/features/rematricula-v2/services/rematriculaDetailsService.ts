/**
 * Serviço de dados para Página de Detalhes da Rematrícula
 * - 100% independente do fluxo de aluno novo
 * - Lê diretamente do Supabase
 * - Prioriza previous_year_students; fallback para enrollments
 */

import { supabase } from '@/lib/supabase'
import { formatCPF } from '../utils/formValidators'
import type {
  RematriculaReadModel,
  PreviousYearStudentRowMinimal,
  EnrollmentRowMinimal,
} from '../types/details'
import { mapPreviousYearToReadModel, mapEnrollmentToReadModel } from './rematriculaDetailsMapper'

function cleanCPFOnlyDigits(cpf: string): string {
  return (cpf || '').replace(/\D/g, '')
}

export class RematriculaDetailsService {
  /**
   * Busca o Read Model consolidado por CPF
   * - Preferência: previous_year_students mais recente (academic_year desc)
   * - Fallback: enrollments mais recente (created_at desc)
   * - Tolerante a CPF com/sem pontuação
   */
  static async getByCPF(cpf: string): Promise<RematriculaReadModel | null> {
    const clean = cleanCPFOnlyDigits(cpf)
    if (!clean || clean.length !== 11) {
      if (import.meta && (import.meta as any).env?.DEV) {
        console.warn('[RematriculaDetailsService] CPF inválido:', cpf, 'clean:', clean)
      }
      return null
    }
    const formatted = formatCPF(clean)
    
    if (import.meta && (import.meta as any).env?.DEV) {
      console.log('[RematriculaDetailsService] Buscando CPF:', { original: cpf, clean, formatted })
    }

    // 1) Tenta previous_year_students (leitura liberada por RLS)
    try {
      const { data: pys, error: pysError } = await supabase
        .from('previous_year_students')
        .select(`
          id,
          student_name,
          student_cpf,
          student_cpf_digits,
          student_birth_date,
          student_gender,
          student_escola,
          academic_year,
          series_id,
          series_name,
          track_id,
          track_name,
          shift,
          guardian1_name,
          guardian1_cpf,
          guardian1_phone,
          guardian1_email,
          guardian1_relationship,
          guardian2_name,
          guardian2_cpf,
          guardian2_phone,
          guardian2_email,
          guardian2_relationship,
          address_cep,
          address_street,
          address_number,
          address_complement,
          address_district,
          address_city,
          address_state,
          base_value,
          total_discount_percentage,
          final_monthly_value,
          applied_discounts,
          total_discount_value,
          material_cost,
          pdf_url,
          pdf_generated_at,
          discount_code,
          discount_description,
          status,
          approval_level,
          approval_status,
          created_at,
          updated_at
        `)
        .or([
          `student_cpf.eq.${clean}`,
          `student_cpf.eq.${formatted}`,
          `student_cpf_digits.eq.${clean}`,
        ].join(','))
        .order('academic_year', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!pysError && pys) {
        if (import.meta && (import.meta as any).env?.DEV) {
          console.log('[RematriculaDetailsService] Encontrado em previous_year_students:', pys)
        }
        const model = mapPreviousYearToReadModel(pys as PreviousYearStudentRowMinimal)
        return model
      }
      // Se erro, apenas loga em DEV e segue para fallback
      if (pysError && import.meta && (import.meta as any).env?.DEV) {
        console.warn('[RematriculaDetailsService] PYS error:', pysError)
      }
    } catch (err) {
      if (import.meta && (import.meta as any).env?.DEV) {
        console.error('[RematriculaDetailsService] PYS exception:', err)
      }
    }

    // 2) Fallback: enrollments (pode exigir usuário autenticado conforme RLS)
    try {
      const { data: enr, error: enrError } = await supabase
        .from('enrollments')
        .select(`
          id,
          student_name,
          student_cpf,
          student_cpf_digits,
          student_birth_date,
          student_gender,
          student_escola,
          series_id,
          series_name,
          track_id,
          track_name,
          shift,
          guardian1_name,
          guardian1_cpf,
          guardian1_phone,
          guardian1_email,
          guardian1_relationship,
          guardian2_name,
          guardian2_cpf,
          guardian2_phone,
          guardian2_email,
          guardian2_relationship,
          address_cep,
          address_street,
          address_number,
          address_complement,
          address_district,
          address_city,
          address_state,
          base_value,
          total_discount_percentage,
          final_monthly_value,
          applied_discounts,
          material_cost,
          pdf_url,
          pdf_generated_at,
          status,
          approval_level,
          approval_status,
          created_at,
          updated_at
        `)
        .or([
          `student_cpf.eq.${clean}`,
          `student_cpf.eq.${formatted}`,
          `student_cpf_digits.eq.${clean}`,
        ].join(','))
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!enrError && enr) {
        const model = mapEnrollmentToReadModel(enr as EnrollmentRowMinimal)
        return model
      }

      if (enrError) {
        // Possível RLS/403 ou falta de permissão: retornar null, consumidor decide a UX
        if (import.meta && (import.meta as any).env?.DEV) {
          console.warn('[RematriculaDetailsService] ENR error:', enrError)
        }
        return null
      }
    } catch (err) {
      if (import.meta && (import.meta as any).env?.DEV) {
        console.error('[RematriculaDetailsService] ENR exception:', err)
      }
    }

    // 3) Sem dados
    return null
  }

  /**
   * Busca o Read Model consolidado via selection_token (sem expor CPF)
   * - Decodifica o payload base64 (sem verificar HMAC no cliente)
   * - Verifica apenas expiração do token (TTL curto)
   * - Lê previous_year_students por id (RLS seguirá vigente)
   */
  static async getBySelectionToken(token: string): Promise<RematriculaReadModel | null> {
    try {
      if (!token || typeof token !== 'string' || token.indexOf('.') < 0) return null
      const [b64] = token.split('.')
      let json = ''
      try {
        // Browser-safe base64 decode
        json = atob(b64)
      } catch {
        try {
          // Node-like fallback (pouco provável em runtime de browser)
          // @ts-ignore
          json = Buffer.from(b64, 'base64').toString('utf-8')
        } catch {
          json = ''
        }
      }
      if (!json) return null
      let payload: any
      try {
        payload = JSON.parse(json)
      } catch {
        return null
      }
      const sid = payload?.sid as string | undefined
      const exp = Number(payload?.exp)
      if (!sid) return null
      if (Number.isFinite(exp)) {
        const now = Math.floor(Date.now() / 1000)
        if (exp < now) {
          // token expirado: exigir nova busca
          return null
        }
      }

      const { data: pys, error } = await supabase
        .from('previous_year_students')
        .select(`
          id,
          student_name,
          student_cpf,
          student_cpf_digits,
          student_birth_date,
          student_gender,
          student_escola,
          academic_year,
          series_id,
          series_name,
          track_id,
          track_name,
          shift,
          guardian1_name,
          guardian1_cpf,
          guardian1_phone,
          guardian1_email,
          guardian1_relationship,
          guardian2_name,
          guardian2_cpf,
          guardian2_phone,
          guardian2_email,
          guardian2_relationship,
          address_cep,
          address_street,
          address_number,
          address_complement,
          address_district,
          address_city,
          address_state,
          base_value,
          total_discount_percentage,
          final_monthly_value,
          applied_discounts,
          total_discount_value,
          material_cost,
          pdf_url,
          pdf_generated_at,
          discount_code,
          discount_description,
          status,
          approval_level,
          approval_status,
          created_at,
          updated_at
        `)
        .eq('id', sid)
        .limit(1)
        .maybeSingle()

      if (error || !pys) {
        if (import.meta && (import.meta as any).env?.DEV) {
          console.warn('[RematriculaDetailsService] getBySelectionToken error:', error)
        }
        return null
      }
      return mapPreviousYearToReadModel(pys as PreviousYearStudentRowMinimal)
    } catch (err) {
      if (import.meta && (import.meta as any).env?.DEV) {
        console.error('[RematriculaDetailsService] getBySelectionToken exception:', err)
      }
      return null
    }
  }
}
