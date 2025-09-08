import { supabase } from '@/lib/supabase'
import type { DatabaseStudent, StudentSearchFilters, ApiListResponse, ApiResponse } from '../../types/api'

export class StudentsApiService {
  /**
   * Busca estudantes com filtros
   */
  static async searchStudents(filters: StudentSearchFilters): Promise<DatabaseStudent[]> {
    try {
      let query = supabase
        .from('students') // Ajustar nome da tabela conforme necessário
        .select(`
          id,
          name,
          cpf,
          birth_date,
          email,
          phone,
          is_active,
          created_at,
          updated_at
        `)
        .eq('is_active', true)

      // Aplicar filtros
      if (filters.name) {
        query = query.ilike('name', `%${filters.name}%`)
      }

      if (filters.cpf) {
        query = query.eq('cpf', filters.cpf)
      }

      if (filters.email) {
        query = query.ilike('email', `%${filters.email}%`)
      }

      if (filters.phone) {
        query = query.ilike('phone', `%${filters.phone}%`)
      }

      const { data, error } = await query
        .order('name')
        .limit(50) // Limitar resultados para performance

      if (error) {
        console.error('Error searching students:', error)
        // Se a tabela não existir, retornar array vazio
        return []
      }

      return data || []
      
    } catch (error) {
      console.error('Error in searchStudents:', error)
      return []
    }
  }

  /**
   * Busca estudante por CPF específico
   */
  static async getStudentByCpf(cpf: string): Promise<DatabaseStudent | null> {
    try {
      const { data, error } = await supabase
        .from('students')
        .select(`
          id,
          name,
          cpf,
          birth_date,
          email,
          phone,
          is_active,
          created_at,
          updated_at
        `)
        .eq('cpf', cpf)
        .eq('is_active', true)
        .single()

      if (error) {
        console.error('Error fetching student by CPF:', error)
        return null
      }

      return data
      
    } catch (error) {
      console.error('Error in getStudentByCpf:', error)
      return null
    }
  }

  /**
   * Busca estudante por ID
   */
  static async getStudentById(id: string): Promise<DatabaseStudent | null> {
    try {
      const { data, error } = await supabase
        .from('students')
        .select(`
          id,
          name,
          cpf,
          birth_date,
          email,
          phone,
          is_active,
          created_at,
          updated_at
        `)
        .eq('id', id)
        .eq('is_active', true)
        .single()

      if (error) {
        console.error('Error fetching student by ID:', error)
        return null
      }

      return data
      
    } catch (error) {
      console.error('Error in getStudentById:', error)
      return null
    }
  }

  /**
   * Verifica se CPF já existe no sistema
   */
  static async checkCpfExists(cpf: string): Promise<ApiResponse<{ exists: boolean; student?: DatabaseStudent }>> {
    try {
      const student = await StudentsApiService.getStudentByCpf(cpf)
      
      return {
        data: {
          exists: !!student,
          student: student || undefined
        },
        error: null
      }
      
    } catch (error) {
      console.error('Error checking CPF existence:', error)
      return {
        data: null,
        error: 'Erro ao verificar CPF'
      }
    }
  }

  /**
   * Cria novo estudante
   */
  static async createStudent(studentData: Omit<DatabaseStudent, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<DatabaseStudent>> {
    try {
      // Primeiro verificar se CPF já existe
      const existsCheck = await StudentsApiService.checkCpfExists(studentData.cpf)
      
      if (existsCheck.data?.exists) {
        return {
          data: null,
          error: 'CPF já cadastrado no sistema'
        }
      }

      const { data, error } = await supabase
        .from('students')
        .insert({
          name: studentData.name,
          cpf: studentData.cpf,
          birth_date: studentData.birth_date,
          email: studentData.email,
          phone: studentData.phone,
          is_active: true
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating student:', error)
        throw error
      }

      return {
        data: data,
        error: null
      }
      
    } catch (error) {
      console.error('Error in createStudent:', error)
      return {
        data: null,
        error: 'Erro ao criar estudante'
      }
    }
  }

  /**
   * Atualiza dados do estudante
   */
  static async updateStudent(id: string, updates: Partial<DatabaseStudent>): Promise<ApiResponse<DatabaseStudent>> {
    try {
      const { data, error } = await supabase
        .from('students')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error updating student:', error)
        throw error
      }

      return {
        data: data,
        error: null
      }
      
    } catch (error) {
      console.error('Error in updateStudent:', error)
      return {
        data: null,
        error: 'Erro ao atualizar estudante'
      }
    }
  }

  /**
   * Busca histórico de matrículas do estudante
   */
  static async getStudentEnrollmentHistory(studentId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('matriculas')
        .select(`
          id,
          aluno_nome,
          aluno_cpf,
          escola,
          trilho_escolhido,
          cap_aplicado,
          trilho_metadata,
          created_at,
          updated_at
        `)
        .eq('student_id', studentId) // Assumindo que existe referência ao student
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) {
        console.error('Error fetching student enrollment history:', error)
        return []
      }

      return data || []
      
    } catch (error) {
      console.error('Error in getStudentEnrollmentHistory:', error)
      return []
    }
  }

  /**
   * Busca sugestões de estudantes para auto-complete
   */
  static async getStudentSuggestions(query: string, limit: number = 10): Promise<DatabaseStudent[]> {
    try {
      if (query.length < 3) {
        return [] // Mínimo de 3 caracteres para busca
      }

      const { data, error } = await supabase
        .from('students')
        .select(`
          id,
          name,
          cpf,
          birth_date,
          email,
          phone,
          is_active
        `)
        .or(`name.ilike.%${query}%,cpf.ilike.%${query}%`)
        .eq('is_active', true)
        .order('name')
        .limit(limit)

      if (error) {
        console.error('Error fetching student suggestions:', error)
        return []
      }

      return data || []
      
    } catch (error) {
      console.error('Error in getStudentSuggestions:', error)
      return []
    }
  }

  /**
   * Valida dados do estudante
   */
  static validateStudentData(student: Partial<DatabaseStudent>): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    // Validar nome
    if (!student.name || student.name.trim().length < 3) {
      errors.push('Nome deve ter pelo menos 3 caracteres')
    }

    // Validar CPF
    if (!student.cpf) {
      errors.push('CPF é obrigatório')
    } else if (!StudentsApiService.isValidCpf(student.cpf)) {
      errors.push('CPF inválido')
    }

    // Validar data de nascimento
    if (!student.birth_date) {
      errors.push('Data de nascimento é obrigatória')
    } else {
      const age = StudentsApiService.calculateAge(student.birth_date)
      if (age < 3 || age > 80) {
        errors.push('Idade deve estar entre 3 e 80 anos')
      }
    }

    // Validar email (opcional mas se fornecido deve ser válido)
    if (student.email && !StudentsApiService.isValidEmail(student.email)) {
      errors.push('Email inválido')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Helpers de validação
   */
  private static isValidCpf(cpf: string): boolean {
    // Implementação básica de validação de CPF
    const cleanCpf = cpf.replace(/\D/g, '')
    
    if (cleanCpf.length !== 11) return false
    if (/^(\d)\1+$/.test(cleanCpf)) return false // Todos os dígitos iguais

    // Validação dos dígitos verificadores
    let sum = 0
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cleanCpf[i]) * (10 - i)
    }
    let remainder = (sum * 10) % 11
    if (remainder === 10 || remainder === 11) remainder = 0
    if (remainder !== parseInt(cleanCpf[9])) return false

    sum = 0
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cleanCpf[i]) * (11 - i)
    }
    remainder = (sum * 10) % 11
    if (remainder === 10 || remainder === 11) remainder = 0
    if (remainder !== parseInt(cleanCpf[10])) return false

    return true
  }

  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  private static calculateAge(birthDate: string): number {
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    
    return age
  }
}