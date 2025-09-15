/**
 * Serviço de validação de estudante para rematrícula
 * Versão local que funciona sem Edge Function
 */

import { supabase } from '@/lib/supabase'
import { formatCPF } from '../utils/formValidators'

export interface ValidationResult {
  status: 'idle' | 'loading' | 'success' | 'error'
  studentType?: 'new' | 'previous_year' | 'already_enrolled'
  hasData: boolean
  message?: string
  studentData?: {
    id?: string
    name: string
    cpf: string
    birthDate?: string
    escola: string
    previousSeries: string
    previousTrack?: string
    previousShift?: string
    academicYear?: string
  }
  enrollmentInfo?: {
    id: string
    name: string
    status: string
    year: number
  }
  errors: string[]
}

export class StudentValidationService {
  /**
   * Valida o tipo de estudante baseado no CPF
   * Segue a lógica do PLANO_FLUXO_REMATRICULA.md
   */
  static async validateStudentType(cpf: string): Promise<ValidationResult> {
    try {
      // Limpar CPF (remover formatação)
      const cleanCPF = cpf.replace(/\D/g, '')
      const formattedCPF = formatCPF(cleanCPF)
      
      console.log(`[ValidationService] Validando CPF: ${cleanCPF}`)
      
      // PRIMEIRA VERIFICAÇÃO: Está em enrollments (ano atual)?
      // NOTA: Para testes, consideramos 2026 como ano atual (pois os dados de teste são de 2025)
      const currentYear = 2026 // Em produção: new Date().getFullYear()
      
      console.log(`[ValidationService] Buscando em enrollments para o ano ${currentYear}`)
      
      // Buscar QUALQUER matrícula do CPF, independente da data
      // Depois verificamos se é do ano atual
      const { data: allEnrollments, error: enrollmentError } = await supabase
        .from('enrollments')
        .select('id, student_name, status, created_at, updated_at, student_cpf')
        // Abrange inconsistências de armazenamento: com e sem pontuação
        .or(
          [
            `student_cpf.eq.${cleanCPF}`,
            `student_cpf.eq.${formattedCPF}`,
            `student_cpf_digits.eq.${cleanCPF}`,
            `student_cpf_digits.eq.${formattedCPF}`
          ].join(',')
        )
        .order('created_at', { ascending: false })
      
      if (enrollmentError) {
        console.error('[ValidationService] Erro ao buscar em enrollments:', enrollmentError)
      }

      // Ajuste: qualquer presença em enrollments caracteriza "já matriculado" (sem filtro de ano)
      if (allEnrollments && allEnrollments.length > 0) {
        const mostRecent = allEnrollments[0]
        const enrollmentYear = new Date(mostRecent.created_at).getFullYear()
        console.log(`[ValidationService] CPF ${cleanCPF} já matriculado (registro mais recente de ${enrollmentYear})`)
        return {
          status: 'success',
          studentType: 'already_enrolled',
          hasData: true,
          message: `Aluno já possui matrícula ativa`,
          enrollmentInfo: {
            id: mostRecent.id,
            name: mostRecent.student_name,
            status: mostRecent.status,
            year: enrollmentYear
          },
          errors: [`CPF já possui matrícula ativa no sistema`]
        }
      }
      
      console.log(`[ValidationService] Matrículas encontradas para CPF ${cleanCPF}:`, allEnrollments?.length || 0)
      
      // Verificar se há matrícula para o ano atual
      let enrollmentData = null
      if (allEnrollments && allEnrollments.length > 0) {
        // Verificar cada matrícula para ver se alguma é do ano atual
        for (const enrollment of allEnrollments) {
          const enrollmentYear = new Date(enrollment.created_at).getFullYear()
          console.log(`[ValidationService] Matrícula ${enrollment.id} criada em ${enrollmentYear}`)
          
          if (enrollmentYear === currentYear) {
            enrollmentData = enrollment
            break
          }
        }
        
        // Se não encontrou matrícula de 2026, mas encontrou matrículas,
        // vamos considerar a mais recente e verificar se está ativa
        if (!enrollmentData && allEnrollments[0]) {
          const mostRecent = allEnrollments[0]
          const enrollmentYear = new Date(mostRecent.created_at).getFullYear()
          
          // Se a matrícula mais recente é de 2025 ou posterior e está ativa,
          // podemos considerar como já matriculado (pode ter sido feita no final de 2025 para 2026)
          if (enrollmentYear >= 2025 && mostRecent.status === 'active') {
            console.log(`[ValidationService] Matrícula ativa encontrada (criada em ${enrollmentYear})`)
            enrollmentData = mostRecent
          }
        }
      }
      
      // Se encontrou em enrollments do ano atual ou matrícula ativa recente, já está matriculado
      if (enrollmentData) {
        const enrollmentYear = new Date(enrollmentData.created_at).getFullYear()
        console.log(`[ValidationService] CPF ${cleanCPF} já matriculado (matrícula de ${enrollmentYear})`)
        return {
          status: 'success',
          studentType: 'already_enrolled',
          hasData: true,
          message: `Aluno já possui matrícula ativa`,
          enrollmentInfo: {
            id: enrollmentData.id,
            name: enrollmentData.student_name,
            status: enrollmentData.status,
            year: enrollmentYear
          },
          errors: [`CPF já possui matrícula ativa no sistema`]
        }
      }
      
      // SEGUNDA VERIFICAÇÃO: Está em previous_year_students (ano anterior)?
      const previousYear = currentYear - 1
      
      console.log(`[ValidationService] Buscando em previous_year_students:`)
      console.log(`  - CPF: ${cleanCPF}`)
      console.log(`  - Ano acadêmico: ${previousYear}`)
      
      const { data: previousYearData, error: previousYearError } = await supabase
        .from('previous_year_students')
        .select(`
          id,
          student_name,
          student_cpf,
          student_birth_date,
          student_escola,
          academic_year,
          series_name,
          track_name,
          shift,
          guardian1_name,
          guardian1_cpf,
          guardian1_phone,
          guardian1_email,
          address_cep,
          address_street,
          address_city,
          final_monthly_value,
          total_discount_percentage,
          status
        `)
        // Abrange CPF com e sem formatação
        .or([
          `student_cpf.eq.${cleanCPF}`,
          `student_cpf.eq.${formattedCPF}`
        ].join(','))
        .order('academic_year', { ascending: false })
        .limit(1)
        .maybeSingle()
      
      console.log('[ValidationService] Resultado da busca em previous_year_students:', previousYearData)
      
      if (previousYearError) {
        console.error('[ValidationService] Erro ao buscar em previous_year_students:', previousYearError)
      }
      
      // Se encontrou no ano anterior, é rematrícula
      if (previousYearData) {
        console.log(`[ValidationService] CPF ${cleanCPF} encontrado no ano anterior (${previousYear}), elegível para rematrícula`)
        return {
          status: 'success',
          studentType: 'previous_year',
          hasData: true,
          message: `Aluno do ano anterior - Elegível para rematrícula`,
          studentData: {
            id: previousYearData.id,
            name: previousYearData.student_name,
            cpf: previousYearData.student_cpf,
            birthDate: previousYearData.student_birth_date,
            escola: previousYearData.student_escola,
            previousSeries: previousYearData.series_name,
            previousTrack: previousYearData.track_name,
            previousShift: previousYearData.shift,
            academicYear: previousYearData.academic_year
          },
          errors: []
        }
      }
      
      // TERCEIRA SITUAÇÃO: Não encontrado em nenhum lugar - novo aluno
      console.log(`[ValidationService] CPF ${cleanCPF} não encontrado - novo aluno`)
      return {
        status: 'success',
        studentType: 'new',
        hasData: false,
        message: 'CPF não encontrado - Novo aluno',
        errors: []
      }
      
    } catch (error) {
      console.error('[ValidationService] Erro na validação:', error)
      return {
        status: 'error',
        hasData: false,
        message: 'Erro ao validar CPF',
        errors: [error.message || 'Erro desconhecido ao validar CPF']
      }
    }
  }
  
  /**
   * Busca dados completos do aluno do ano anterior
   */
  static async getPreviousYearStudentData(cpf: string) {
    try {
      const cleanCPF = cpf.replace(/\D/g, '')
      const previousYear = new Date().getFullYear() - 1
      
      const { data, error } = await supabase
        .from('previous_year_students')
        .select('*')
        .eq('student_cpf', cleanCPF)
        .eq('academic_year', String(previousYear))
        .single()
      
      if (error) {
        console.error('[ValidationService] Erro ao buscar dados completos:', error)
        throw error
      }
      
      return data
    } catch (error) {
      console.error('[ValidationService] Erro ao buscar dados do aluno:', error)
      throw error
    }
  }
}
