import { supabase } from '@/lib/supabase'
import { getSeriesAnnualValuesConfig } from '@/lib/config/config.service'
import type { EnrollmentFormData } from '../../types/forms'
import type { DatabaseEnrollment, ApiResponse } from '../../types/api'
import type { PricingCalculation } from '../../types/business'
import type {
  EnrollmentRecord,
  EnrollmentDiscountRecord,
  EnrollmentDocumentRecord,
} from '@/types/database'
import type { CurrentUserInfo } from '@/features/enrollment/hooks/useCurrentUser'

export class EnrollmentApiService {
  /**
   * Cria nova matrícula
   */
  static async createEnrollment(formData: EnrollmentFormData, currentUser?: CurrentUserInfo): Promise<ApiResponse<DatabaseEnrollment>> {
    try {
      // Inserção compatível com o novo schema normalizado (migração 014)
      // Mantém a assinatura e tipo de retorno para não quebrar chamadas existentes.
      const now = new Date().toISOString()
      const totalDiscountPercentage = (formData.selectedDiscounts || []).reduce(
        (sum, d) => sum + (d?.percentual || 0),
        0
      )

      const mapped = this.mapFormToDatabaseMinimal(formData, totalDiscountPercentage, currentUser)

      const { data: created, error } = await supabase
        .from('enrollments')
        .insert({ ...mapped, created_at: now, updated_at: now })
        .select()
        .single()

      if (error) {
        console.error('Error creating enrollment (normalized):', error)
        throw error
      }

      // Também salvar na tabela matriculas para compatibilidade
      try {
        await supabase
          .from('matriculas')
          .insert({
            aluno_nome: formData.student?.name || '',
            aluno_cpf: (formData.student?.cpf && formData.student.cpf.trim().length > 0) ? formData.student.cpf : null,
            escola: 'sete_setembro', // Default
            trilho_escolhido: EnrollmentApiService.mapTrackIdToName(formData.academic?.trackId),
            cap_aplicado: null, // Será calculado posteriormente
            trilho_metadata: {
              enrollment_id: created.id,
              academic_data: formData.academic,
              selected_discounts: formData.selectedDiscounts
            }
          })
      } catch (matriculaError) {
        console.warn('Warning creating matricula record:', matriculaError)
        // Não falhar se a inserção na tabela matriculas der erro
      }

      return {
        // Para compatibilidade com DatabaseEnrollment, retornamos forma agregada mínima
        data: {
          id: created.id,
          student_data: formData.student as any,
          guardians_data: formData.guardians as any,
          address_data: formData.address as any,
          academic_data: formData.academic as any,
          selected_discounts: (formData.selectedDiscounts || []).map(d => d.id),
          status: 'pending',
          created_at: created.created_at || now,
          updated_at: created.updated_at || now,
        },
        error: null
      }
      
    } catch (error) {
      console.error('Error in createEnrollment:', error)
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Erro ao criar matrícula'
      }
    }
  }

  /**
   * NOVO: Cria matrícula no schema normalizado e retorna o ID
   * Usar no fluxo final (SummaryStep) para persistir ANTES do PDF.
   * Agora com rastreamento de usuário
   */
  static async createEnrollmentRecord(
    formData: EnrollmentFormData,
    pricing: PricingCalculation,
    seriesInfo: any,
    trackInfo: any,
    currentUser?: CurrentUserInfo
  ): Promise<string> {
    try {
      const now = new Date().toISOString()
      const enrollmentData = this.mapFormToDatabaseFull(formData, pricing, seriesInfo, trackInfo, currentUser)

      const { data: enrollment, error } = await supabase
        .from('enrollments')
        .insert({ ...enrollmentData, created_at: now, updated_at: now })
        .select()
        .single()

      if (error) throw error

      // Salvar descontos aplicados
      if ((formData.selectedDiscounts || []).length > 0) {
        await this.saveDiscounts(enrollment.id, formData.selectedDiscounts, pricing.discounts)
      }

      // Salvar documentos requeridos (básicos por enquanto)
      await this.saveRequiredDocuments(enrollment.id, formData.selectedDiscounts)

      return enrollment.id
    } catch (err) {
      console.error('Erro ao criar matrícula (record):', err)
      throw new Error('Falha ao salvar matrícula no banco de dados')
    }
  }

  /**
   * Finaliza matrícula via RPC transacional (enroll_finalize)
   * - Insere enrollment + discounts de forma atômica
   * - Usa client_tx_id para idempotência
   * - Mantém compatibilidade: retorna apenas enrollment_id
   */
  static async finalizeEnrollmentViaRpc(
    formData: EnrollmentFormData,
    pricing: PricingCalculation,
    seriesInfo: any,
    trackInfo: any,
    currentUser?: CurrentUserInfo,
    options?: { paymentNotesEnabled?: boolean; paymentNotes?: string }
  ): Promise<string> {
    // Gera um client_tx_id idempotente
    const clientTxId = this.generateClientTxId()

    // Monta payload conforme contrato da RPC
    const enrollmentPayload = this.mapFormToDatabaseFull(formData, pricing, seriesInfo, trackInfo, currentUser) as any

    // F5 — Payloads: anexar campos anuais informativos quando habilitado (servidor ignora chaves extras)
    try {
      const cfg = await getSeriesAnnualValuesConfig()
      if (cfg?.enabled) {
        const monthlyBase = Number(seriesInfo?.valor_mensal_sem_material) || Number(pricing?.baseValue) || 0
        const monthlyMaterial = Number(seriesInfo?.valor_material) || 0
        const monthlyTotal = Number(seriesInfo?.valor_mensal_com_material) || (monthlyBase + monthlyMaterial)

        const annualBase = Number(seriesInfo?.valor_anual_sem_material) || (monthlyBase * 12)
        const annualMaterial = Number(seriesInfo?.valor_anual_material) || (monthlyMaterial * 12)
        const annualTotal = Number(seriesInfo?.valor_anual_com_material) || (annualBase + annualMaterial)

        enrollmentPayload.annual_base_value = Math.round(annualBase * 100) / 100
        enrollmentPayload.annual_material_value = Math.round(annualMaterial * 100) / 100
        enrollmentPayload.annual_total_value = Math.round(annualTotal * 100) / 100
      }
    } catch {}

    // Opcional: incluir payment_notes no payload quando feature flag estiver ativa e houver conteúdo.
    // Sanitização leve no cliente (servidor é a fonte da verdade):
    // - Normaliza CRLF/CR para LF
    // - Trim
    // - Colapsa 3+ quebras em duplas
    // - Limita a 1000 caracteres
    if (options?.paymentNotesEnabled && options.paymentNotes) {
      try {
        let raw = String(options.paymentNotes || '')
        if (raw && raw.length > 0) {
          let s = raw.replace(/\r\n?/g, '\n')
          s = s.trim()
          s = s.replace(/\n{3,}/g, '\n\n')
          if (s.length > 1000) s = s.slice(0, 1000)
          if (s.length > 0) {
            enrollmentPayload.payment_notes = s
          }
        }
      } catch {}
    }

    // Mapear descontos selecionados com detalhes do cálculo
    const discountsPayload = (formData.selectedDiscounts || []).map((selected) => {
      const pricingDiscount = (pricing?.discounts || []).find((d: any) => d.id === selected.id)
      return {
        discount_id: selected.id,
        discount_code: pricingDiscount?.code || '',
        discount_name: pricingDiscount?.name || '',
        discount_category: (pricingDiscount as any)?.category || 'unknown',
        percentage_applied: selected.percentual,
        value_applied: pricingDiscount?.value || 0,
      }
    })

    const { data, error } = await supabase.rpc('enroll_finalize', {
      p_enrollment: enrollmentPayload as any,
      p_discounts: discountsPayload as any,
      p_client_tx_id: clientTxId,
    })

    if (error) {
      console.error('RPC enroll_finalize error:', error)
      throw error
    }

    const enrollmentId = (data as any)?.enrollment_id || (Array.isArray(data) ? (data[0] as any)?.enrollment_id : null)
    if (!enrollmentId) {
      throw new Error('Falha ao obter enrollment_id da RPC enroll_finalize')
    }
    return enrollmentId
  }

  /**
   * Atualiza matrícula existente
   */
  static async updateEnrollment(
    id: string, 
    updates: Partial<EnrollmentFormData>
  ): Promise<ApiResponse<DatabaseEnrollment>> {
    try {
      const updateData = {
        ...(updates.student && { student_data: updates.student }),
        ...(updates.guardians && { guardians_data: updates.guardians }),
        ...(updates.address && { address_data: updates.address }),
        ...(updates.academic && { academic_data: updates.academic }),
        ...(updates.selectedDiscounts && { selected_discounts: updates.selectedDiscounts }),
        updated_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('enrollments')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error updating enrollment:', error)
        throw error
      }

      return {
        data: data,
        error: null
      }
      
    } catch (error) {
      console.error('Error in updateEnrollment:', error)
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Erro ao atualizar matrícula'
      }
    }
  }

  /**
   * Busca matrícula por ID
   */
  static async getEnrollmentById(id: string): Promise<ApiResponse<DatabaseEnrollment>> {
    try {
      const { data, error } = await supabase
        .from('enrollments')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        console.error('Error fetching enrollment:', error)
        throw error
      }

      return {
        data: data,
        error: null
      }
      
    } catch (error) {
      console.error('Error in getEnrollmentById:', error)
      return {
        data: null,
        error: 'Erro ao buscar matrícula'
      }
    }
  }

  /**
   * Lista matrículas com filtros
   */
  static async listEnrollments(filters?: {
    status?: DatabaseEnrollment['status']
    studentName?: string
    limit?: number
    offset?: number
  }): Promise<DatabaseEnrollment[]> {
    try {
      let query = supabase
        .from('enrollments')
        .select('*')

      // Aplicar filtros
      if (filters?.status) {
        query = query.eq('status', filters.status)
      }

      if (filters?.studentName) {
        query = query.ilike('student_data->>name', `%${filters.studentName}%`)
      }

      // Ordenação e paginação
      query = query.order('created_at', { ascending: false })

      if (filters?.limit) {
        query = query.limit(filters.limit)
      }

      if (filters?.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error listing enrollments:', error)
        throw error
      }

      return data || []
      
    } catch (error) {
      console.error('Error in listEnrollments:', error)
      return []
    }
  }

  /**
   * Atualiza status da matrícula
   */
  static async updateEnrollmentStatus(
    id: string, 
    status: DatabaseEnrollment['status']
  ): Promise<ApiResponse<DatabaseEnrollment>> {
    try {
      const { data, error } = await supabase
        .from('enrollments')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error updating enrollment status:', error)
        throw error
      }

      return {
        data: data,
        error: null
      }
      
    } catch (error) {
      console.error('Error in updateEnrollmentStatus:', error)
      return {
        data: null,
        error: 'Erro ao atualizar status da matrícula'
      }
    }
  }

  /**
   * NOVO: Atualiza informações do PDF e status para 'submitted'
   */
  static async updatePdfInfo(enrollmentId: string, pdfUrl: string): Promise<void> {
    const { error } = await supabase
      .from('enrollments')
      .update({
        pdf_url: pdfUrl,
        pdf_generated_at: new Date().toISOString(),
        status: 'submitted'
      })
      .eq('id', enrollmentId)

    if (error) throw error
  }

  /**
   * Deleta matrícula (soft delete)
   */
  static async deleteEnrollment(id: string): Promise<ApiResponse<boolean>> {
    try {
      const { error } = await supabase
        .from('enrollments')
        .update({ 
          status: 'rejected',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) {
        console.error('Error deleting enrollment:', error)
        throw error
      }

      return {
        data: true,
        error: null
      }
      
    } catch (error) {
      console.error('Error in deleteEnrollment:', error)
      return {
        data: false,
        error: 'Erro ao deletar matrícula'
      }
    }
  }

  /**
   * NOVO: Soft delete explícito no schema normalizado
   */
  static async softDeleteEnrollment(enrollmentId: string): Promise<void> {
    const { error } = await supabase
      .from('enrollments')
      .update({
        status: 'deleted',
        deleted_at: new Date().toISOString()
      })
      .eq('id', enrollmentId)
    if (error) throw error
  }

  /**
   * Busca matrículas recentes para dashboard
   */
  static async getRecentEnrollments(limit: number = 10): Promise<DatabaseEnrollment[]> {
    try {
      const { data, error } = await supabase
        .from('enrollments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('Error fetching recent enrollments:', error)
        return []
      }
      return data || []
    } catch (error) {
      console.error('Error in getRecentEnrollments:', error)
      return []
    }
  }

  /**
   * NOVO: Retorna matrículas recentes com relacionamentos normalizados
   */
  static async getRecentEnrollmentsWithDetails(limit: number = 50): Promise<EnrollmentRecord[]> {
    const { data, error } = await supabase
      .from('enrollments')
      .select(`
        *,
        discounts:enrollment_discounts(*),
        documents:enrollment_documents(*)
      `)
      .neq('status', 'deleted')
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return (data as unknown as EnrollmentRecord[]) || []
  }

  /**
   * Lista matrículas recentes CRIADAS PELO USUÁRIO ATUAL (com relacionamentos)
   * - Filtra por autoria segura no servidor (created_by_user_id e type)
   * - Exclui registros deletados
   * - Ordena por created_at desc
   */
  static async getMyRecentEnrollmentsWithDetails(
    limit: number = 50,
    currentUser: CurrentUserInfo
  ): Promise<EnrollmentRecord[]> {
    // Se não há usuário identificado, retornar lista vazia sem consultar
    if (!currentUser || !currentUser.id) return []

    const { data, error } = await supabase
      .from('enrollments')
      .select(`
        *,
        discounts:enrollment_discounts(*),
        documents:enrollment_documents(*)
      `)
      .eq('created_by_user_id', currentUser.id)
      .eq('created_by_user_type', currentUser.type)
      .neq('status', 'deleted')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return (data as unknown as EnrollmentRecord[]) || []
  }

  // =====================
  // Admin — Listagem com filtros/paginação
  // =====================

  static async listAdminEnrollments(params?: {
      page?: number
      pageSize?: number
      includeDeleted?: boolean
      status?: Array<'draft' | 'submitted' | 'approved' | 'rejected' | 'deleted'>
      escola?: 'pelicano' | 'sete_setembro'
      seriesId?: string
      dateFrom?: string // ISO date/datetime
      dateTo?: string   // ISO date/datetime
      search?: string   // nome ou CPF
      orderBy?: 'created_at' | 'student_name' | 'final_monthly_value'
      orderDir?: 'asc' | 'desc'
      origin?: 'novo_aluno' | 'rematricula' | 'null'
    }): Promise<{ data: EnrollmentRecord[]; count: number }> {
      const {
        page = 1,
        pageSize = 20,
        includeDeleted = false,
        status,
        escola,
        seriesId,
        dateFrom,
        dateTo,
        search,
        orderBy = 'created_at',
        orderDir = 'desc',
        origin,
      } = params || {}

      let query = supabase
        .from('enrollments')
        .select('*', { count: 'exact' })

    if (!includeDeleted) {
      query = query.neq('status', 'deleted')
    }
    if (status && status.length > 0) {
      query = query.in('status', status as any)
    }
    if (escola) {
      query = query.eq('student_escola', escola)
    }
    if (seriesId) {
      query = query.eq('series_id', seriesId)
    }
    if (dateFrom) {
      query = query.gte('created_at', dateFrom)
    }
    if (dateTo) {
      query = query.lte('created_at', dateTo)
    }
      if (search && search.trim()) {
        const term = search.trim()
        // buscar por nome (ilike) OU CPF (contains)
        query = query.or(`student_name.ilike.%${term}%,student_cpf.ilike.%${term}%`)
      }
      if (origin === 'novo_aluno' || origin === 'rematricula') {
        query = query.eq('tag_matricula', origin)
      } else if (origin === 'null') {
        query = (query as any).is('tag_matricula', null)
      }

    // Ordenação e paginação
    query = query.order(orderBy, { ascending: orderDir === 'asc' })

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    query = query.range(from, to)

    const { data, error, count } = await query
    if (error) throw error
    return { data: (data as unknown as EnrollmentRecord[]) || [], count: count || 0 }
  }

  // =====================
  // Admin — Detalhe com relações
  // =====================
  static async getAdminEnrollmentById(id: string): Promise<EnrollmentRecord | null> {
    const { data, error } = await supabase
      .from('enrollments')
      .select(`
        *,
        discounts:enrollment_discounts(*),
        documents:enrollment_documents(*)
      `)
      .eq('id', id)
      .single()
    if (error) throw error
    return (data as unknown as EnrollmentRecord) || null
  }

  // =====================
  // Admin — Update parcial
  // =====================
  static async updateAdminEnrollment(
    id: string,
    patch: Partial<Pick<EnrollmentRecord,
      | 'student_name' | 'student_cpf' | 'student_rg' | 'student_birth_date' | 'student_gender' | 'student_escola'
      | 'series_id' | 'series_name' | 'track_id' | 'track_name' | 'shift'
      | 'guardian1_name' | 'guardian1_cpf' | 'guardian1_phone' | 'guardian1_email' | 'guardian1_relationship'
      | 'guardian2_name' | 'guardian2_cpf' | 'guardian2_phone' | 'guardian2_email' | 'guardian2_relationship'
      | 'address_cep' | 'address_street' | 'address_number' | 'address_complement' | 'address_district' | 'address_city' | 'address_state'
      | 'base_value' | 'total_discount_percentage' | 'total_discount_value' | 'final_monthly_value' | 'material_cost'
      | 'status' | 'approval_level' | 'approval_status'
    >>
  ): Promise<EnrollmentRecord> {
    // Normaliza data (se fornecida)
    const toDateOnly = (value?: string) => {
      if (!value) return undefined
      try {
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
        const d = new Date(value)
        if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
        return undefined
      } catch { return undefined }
    }

    const updateData = { ...patch } as any
    if (typeof patch.student_birth_date !== 'undefined') {
      updateData.student_birth_date = toDateOnly(patch.student_birth_date)
    }

    const { data, error } = await supabase
      .from('enrollments')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        discounts:enrollment_discounts(*),
        documents:enrollment_documents(*)
      `)
      .single()
    if (error) throw error
    return data as unknown as EnrollmentRecord
  }

  // =====================
  // Admin — Restaurar soft delete
  // =====================
  static async restoreEnrollment(id: string, targetStatus: 'draft' | 'submitted' = 'draft'): Promise<void> {
    const { error } = await supabase
      .from('enrollments')
      .update({ status: targetStatus, deleted_at: null })
      .eq('id', id)
    if (error) throw error
  }

  // =====================
  // Admin — Estatísticas
  // =====================
  static async getAdminStats(): Promise<Record<'draft'|'submitted'|'approved'|'rejected'|'deleted'|'total', number>> {
    try {
      const { data, error } = await supabase
        .from('enrollments')
        .select('status')
      if (error) throw error

      const stats = (data || []).reduce((acc, row: any) => {
        const s = (row.status || 'draft') as 'draft'|'submitted'|'approved'|'rejected'|'deleted'
        acc[s] = (acc[s] || 0) + 1
        return acc
      }, {} as Record<'draft'|'submitted'|'approved'|'rejected'|'deleted', number>)

      return {
        draft: stats.draft || 0,
        submitted: stats.submitted || 0,
        approved: stats.approved || 0,
        rejected: stats.rejected || 0,
        deleted: stats.deleted || 0,
        total: (data || []).length,
      }
    } catch (e) {
      console.error('Error in getAdminStats:', e)
      return { draft: 0, submitted: 0, approved: 0, rejected: 0, deleted: 0, total: 0 }
    }
  }

  /**
   * Conta matrículas por status
   */
  static async getEnrollmentStats(): Promise<Record<string, number>> {
    try {
      const { data, error } = await supabase
        .from('enrollments')
        .select('status')

      if (error) {
        console.error('Error fetching enrollment stats:', error)
        return { pending: 0, approved: 0, rejected: 0 }
      }

      const stats = data.reduce((acc, enrollment) => {
        const status = enrollment.status || 'pending'
        acc[status] = (acc[status] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      return {
        pending: stats.pending || 0,
        approved: stats.approved || 0,
        rejected: stats.rejected || 0,
        total: data.length
      }
      
    } catch (error) {
      console.error('Error in getEnrollmentStats:', error)
      return { pending: 0, approved: 0, rejected: 0, total: 0 }
    }
  }

  /**
   * Valida dados completos da matrícula
   */
  static validateEnrollmentData(formData: EnrollmentFormData): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    // Validar dados do estudante
    if (!formData.student) {
      errors.push('Dados do aluno são obrigatórios')
    } else {
      if (!formData.student.name?.trim()) {
        errors.push('Nome do aluno é obrigatório')
      }
      if (!formData.student.birthDate) {
        errors.push('Data de nascimento é obrigatória')
      }
    }

    // Validar responsáveis
    if (!formData.guardians?.guardian1) {
      errors.push('Dados do responsável principal são obrigatórios')
    } else {
      const guardian1 = formData.guardians.guardian1
      if (!guardian1.name?.trim()) {
        errors.push('Nome do responsável é obrigatório')
      }
      // CPF do responsável deixa de ser obrigatório
      if (!guardian1.phone?.trim()) {
        errors.push('Telefone do responsável é obrigatório')
      }
      if (!guardian1.email?.trim()) {
        errors.push('Email do responsável é obrigatório')
      }
    }

    // Validar endereço
    if (!formData.address) {
      errors.push('Dados de endereço são obrigatórios')
    } else {
      if (!formData.address.cep?.trim()) {
        errors.push('CEP é obrigatório')
      }
      if (!formData.address.street?.trim()) {
        errors.push('Logradouro é obrigatório')
      }
      if (!formData.address.city?.trim()) {
        errors.push('Cidade é obrigatória')
      }
    }

    // Validar dados acadêmicos
    if (!formData.academic) {
      errors.push('Dados acadêmicos são obrigatórios')
    } else {
      if (!formData.academic.seriesId) {
        errors.push('Série é obrigatória')
      }
      if (!formData.academic.trackId) {
        errors.push('Trilho de desconto é obrigatório')
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Helper para mapear ID do trilho para nome
   */
  private static mapTrackIdToName(trackId?: string): 'especial' | 'combinado' | 'comercial' | null {
    if (!trackId) return null
    
    // Mapear baseado nos IDs dos trilhos
    const trackMap: Record<string, 'especial' | 'combinado' | 'comercial'> = {
      '1': 'especial',
      '2': 'combinado', 
      '3': 'comercial'
    }

    return trackMap[trackId] || 'combinado'
  }

  // =====================
  // Helpers (privados)
  // =====================

  private static getApprovalLevel(discountPercentage: number): 'automatic' | 'coordinator' | 'director' {
    if (discountPercentage <= 20) return 'automatic'
    if (discountPercentage <= 50) return 'coordinator'
    return 'director'
  }

  // Mapeamento mínimo (sem pricing) para manter compatibilidade do método antigo
  private static mapFormToDatabaseMinimal(
    formData: EnrollmentFormData,
    totalDiscountPercentage: number,
    currentUser?: CurrentUserInfo
  ) {
    const toDateOnly = (value?: string) => {
      if (!value) return null
      // tenta normalizar para YYYY-MM-DD
      try {
        // Se já está no formato correto
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
        const d = new Date(value)
        if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
        return null
      } catch {
        return null
      }
    }
    const toNullable = (s?: string) => {
      const v = (s || '').trim()
      return v.length > 0 ? v : null
    }
    return {
      // Dados do aluno
      student_name: formData.student.name,
      student_cpf: toNullable(formData.student.cpf),
      student_rg: formData.student.rg || null,
      student_birth_date: toDateOnly(formData.student.birthDate),
      student_gender: formData.student.gender as any,
      student_escola: formData.student.escola as any,

      // Acadêmicos
      series_id: formData.academic.seriesId,
      series_name: 'N/A',
      track_id: formData.academic.trackId,
      track_name: 'N/A',
      shift: formData.academic.shift as any,

      // Responsáveis
      guardian1_name: formData.guardians.guardian1.name,
      guardian1_cpf: toNullable(formData.guardians.guardian1.cpf),
      guardian1_phone: formData.guardians.guardian1.phone,
      guardian1_email: formData.guardians.guardian1.email,
      guardian1_relationship: formData.guardians.guardian1.relationship,

      guardian2_name: formData.guardians.guardian2?.name || null,
      guardian2_cpf: formData.guardians.guardian2?.cpf || null,
      guardian2_phone: formData.guardians.guardian2?.phone || null,
      guardian2_email: formData.guardians.guardian2?.email || null,
      guardian2_relationship: formData.guardians.guardian2?.relationship || null,

      // Endereço
      address_cep: formData.address.cep,
      address_street: formData.address.street,
      address_number: formData.address.number,
      address_complement: formData.address.complement || null,
      address_district: formData.address.district,
      address_city: formData.address.city,
      address_state: formData.address.state,

      // Financeiro (mínimo para satisfazer NOT NULL)
      base_value: 0,
      total_discount_percentage: totalDiscountPercentage || 0,
      total_discount_value: 0,
      final_monthly_value: 0,
      material_cost: 0,

      // Status inicial
      status: 'draft',
      approval_level: this.getApprovalLevel(totalDiscountPercentage),
      approval_status: 'pending',
      
      // Rastreamento de usuário (quando disponível)
      created_by_user_id: currentUser?.id || null,
      created_by_user_email: currentUser?.email || null,
      created_by_user_name: currentUser?.name || null,
      created_by_user_type: currentUser?.type || 'anonymous',
      // tag_matricula derivada no servidor (trigger BEFORE INSERT)
    }
  }

  // Mapeamento completo (com pricing e metadados de série/trilho)
  // Agora inclui dados de rastreamento de usuário
  private static mapFormToDatabaseFull(
    formData: EnrollmentFormData,
    pricing: PricingCalculation,
    seriesInfo: any,
    trackInfo: any,
    currentUser?: CurrentUserInfo
  ) {
    const toDateOnly = (value?: string) => {
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
    return {
      // Dados do aluno
      student_name: formData.student.name,
      student_cpf: formData.student.cpf,
      student_rg: formData.student.rg || null,
      student_birth_date: toDateOnly(formData.student.birthDate),
      student_gender: formData.student.gender as any,
      student_escola: formData.student.escola as any,

      // Acadêmicos
      series_id: formData.academic.seriesId,
      series_name: seriesInfo?.nome || 'N/A',
      track_id: formData.academic.trackId,
      track_name: trackInfo?.nome || 'N/A',
      shift: formData.academic.shift as any,

      // Responsáveis
      guardian1_name: formData.guardians.guardian1.name,
      guardian1_cpf: formData.guardians.guardian1.cpf,
      guardian1_phone: formData.guardians.guardian1.phone,
      guardian1_email: formData.guardians.guardian1.email,
      guardian1_relationship: formData.guardians.guardian1.relationship,

      guardian2_name: formData.guardians.guardian2?.name || null,
      guardian2_cpf: formData.guardians.guardian2?.cpf || null,
      guardian2_phone: formData.guardians.guardian2?.phone || null,
      guardian2_email: formData.guardians.guardian2?.email || null,
      guardian2_relationship: formData.guardians.guardian2?.relationship || null,

      // Endereço
      address_cep: formData.address.cep,
      address_street: formData.address.street,
      address_number: formData.address.number,
      address_complement: formData.address.complement || null,
      address_district: formData.address.district,
      address_city: formData.address.city,
      address_state: formData.address.state,

      // Financeiro
      base_value: pricing.baseValue,
      total_discount_percentage: pricing.totalDiscountPercentage,
      total_discount_value: pricing.totalDiscountValue,
      final_monthly_value: pricing.finalValue,
      material_cost: seriesInfo?.valor_material || 0,

      // Status
      status: 'draft',
      approval_level: this.getApprovalLevel(pricing.totalDiscountPercentage),
      approval_status: 'pending',
      
      // Rastreamento de usuário (NOVO)
      created_by_user_id: currentUser?.id || null,
      created_by_user_email: currentUser?.email || null,
      created_by_user_name: currentUser?.name || null,
      created_by_user_type: currentUser?.type || 'anonymous',
      
      // tag_matricula derivada no servidor (trigger BEFORE INSERT)
    }
  }

  // Gera UUID de forma segura com fallback
  private static generateClientTxId(): string {
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

  // Persiste descontos aplicados
  private static async saveDiscounts(
    enrollmentId: string,
    selectedDiscounts: Array<{ id: string; percentual: number }>,
    pricingDiscounts: Array<{ id: string; code: string; name: string; category?: string; value: number }>
  ) {
    const discountRecords = selectedDiscounts.map(selected => {
      const pricingDiscount = pricingDiscounts.find(p => p.id === selected.id)
      return {
        enrollment_id: enrollmentId,
        discount_id: selected.id,
        discount_code: pricingDiscount?.code || '',
        discount_name: pricingDiscount?.name || '',
        discount_category: pricingDiscount?.category || 'unknown',
        percentage_applied: selected.percentual,
        value_applied: pricingDiscount?.value || 0,
      }
    })
    const { error } = await supabase
      .from('enrollment_discounts')
      .insert(discountRecords)
    if (error) throw error
  }

  // Cria registros de documentos requeridos básicos
  private static async saveRequiredDocuments(
    enrollmentId: string,
    _selectedDiscounts: Array<{ id: string; percentual: number }>
  ) {
    // CPF não é mais obrigatório por padrão na nova matrícula
    const basicDocuments = [
      { type: 'cpf_student', name: 'CPF do Aluno', required: false },
      { type: 'cpf_guardian', name: 'CPF do Responsável', required: false },
      { type: 'comprovante_residencia', name: 'Comprovante de Residência', required: true },
    ]

    const documentRecords = basicDocuments.map(doc => ({
      enrollment_id: enrollmentId,
      document_type: doc.type,
      document_name: doc.name,
      is_required: doc.required,
      is_uploaded: false,
    }))
    const { error } = await supabase
      .from('enrollment_documents')
      .insert(documentRecords)
    if (error) throw error
  }
}
