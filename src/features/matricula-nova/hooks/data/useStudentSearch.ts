import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useMemo } from 'react'
import { StudentsApiService } from '../../services/api/students'
import type { DatabaseStudent, StudentSearchFilters } from '../../types/api'

/**
 * Hook para buscar estudantes com filtros
 */
export function useStudentSearch(filters: StudentSearchFilters) {
  return useQuery({
    queryKey: ['students', 'search', filters],
    queryFn: () => StudentsApiService.searchStudents(filters),
    enabled: Object.values(filters).some(value => !!value), // Só buscar se algum filtro foi preenchido
    staleTime: 2 * 60 * 1000, // 2 minutos - dados de estudantes podem mudar
    gcTime: 5 * 60 * 1000, // 5 minutos
    retry: 2,
    meta: {
      errorMessage: 'Erro ao buscar estudantes'
    }
  })
}

/**
 * Hook para buscar estudante por CPF específico
 */
export function useStudentByCpf(cpf: string) {
  return useQuery({
    queryKey: ['student', 'cpf', cpf],
    queryFn: () => StudentsApiService.getStudentByCpf(cpf),
    enabled: !!cpf && cpf.length >= 11, // CPF deve ter pelo menos 11 dígitos
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
    meta: {
      errorMessage: 'Erro ao buscar estudante por CPF'
    }
  })
}

/**
 * Hook para buscar estudante por ID
 */
export function useStudent(id: string) {
  return useQuery({
    queryKey: ['student', id],
    queryFn: () => StudentsApiService.getStudentById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
    meta: {
      errorMessage: 'Erro ao buscar estudante'
    }
  })
}

/**
 * Hook para verificar se CPF já existe
 */
export function useCpfExists(cpf: string) {
  return useQuery({
    queryKey: ['student', 'cpf-exists', cpf],
    queryFn: () => StudentsApiService.checkCpfExists(cpf),
    enabled: !!cpf && cpf.length >= 11,
    staleTime: 1 * 60 * 1000, // 1 minuto - verificação de existência deve ser recente
    gcTime: 3 * 60 * 1000,
    retry: 2,
    meta: {
      errorMessage: 'Erro ao verificar CPF'
    }
  })
}

/**
 * Hook para sugestões de estudantes (autocomplete)
 */
export function useStudentSuggestions(query: string, limit: number = 10) {
  return useQuery({
    queryKey: ['students', 'suggestions', query, limit],
    queryFn: () => StudentsApiService.getStudentSuggestions(query, limit),
    enabled: query.length >= 3, // Mínimo de 3 caracteres
    staleTime: 30 * 1000, // 30 segundos - sugestões devem ser frescas
    gcTime: 2 * 60 * 1000,
    retry: 1, // Falha rápida para sugestões
    meta: {
      errorMessage: 'Erro ao buscar sugestões'
    }
  })
}

/**
 * Hook para histórico de matrículas do estudante
 */
export function useStudentEnrollmentHistory(studentId: string) {
  return useQuery({
    queryKey: ['student', studentId, 'enrollment-history'],
    queryFn: () => StudentsApiService.getStudentEnrollmentHistory(studentId),
    enabled: !!studentId,
    staleTime: 10 * 60 * 1000, // 10 minutos
    gcTime: 20 * 60 * 1000,
    retry: 2,
    meta: {
      errorMessage: 'Erro ao buscar histórico de matrículas'
    }
  })
}

/**
 * Mutation para criar novo estudante
 */
export function useCreateStudent() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (studentData: Omit<DatabaseStudent, 'id' | 'created_at' | 'updated_at'>) =>
      StudentsApiService.createStudent(studentData),
    onSuccess: (data) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['students'] })
      if (data.data) {
        // Adicionar o novo estudante ao cache
        queryClient.setQueryData(['student', data.data.id], data.data)
        queryClient.setQueryData(['student', 'cpf', data.data.cpf], data.data)
      }
    },
    meta: {
      successMessage: 'Estudante criado com sucesso!',
      errorMessage: 'Erro ao criar estudante'
    }
  })
}

/**
 * Mutation para atualizar estudante
 */
export function useUpdateStudent() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<DatabaseStudent> }) =>
      StudentsApiService.updateStudent(id, updates),
    onSuccess: (data, variables) => {
      // Atualizar cache
      queryClient.invalidateQueries({ queryKey: ['students'] })
      if (data.data) {
        queryClient.setQueryData(['student', variables.id], data.data)
        queryClient.setQueryData(['student', 'cpf', data.data.cpf], data.data)
      }
    },
    meta: {
      successMessage: 'Estudante atualizado com sucesso!',
      errorMessage: 'Erro ao atualizar estudante'
    }
  })
}

/**
 * Hook personalizado para busca inteligente de estudantes
 */
export function useSmartStudentSearch() {
  const [query, setQuery] = useState('')
  const [searchType, setSearchType] = useState<'name' | 'cpf' | 'auto'>('auto')
  
  // Detectar tipo de busca automaticamente
  const detectedSearchType = useMemo(() => {
    if (searchType !== 'auto') return searchType
    
    const cleanQuery = query.replace(/\D/g, '')
    if (cleanQuery.length >= 11) {
      return 'cpf'
    }
    return 'name'
  }, [query, searchType])

  // Buscar por CPF se detectado
  const cpfSearch = useStudentByCpf(
    detectedSearchType === 'cpf' ? query.replace(/\D/g, '') : ''
  )

  // Buscar sugestões por nome se detectado
  const nameSearch = useStudentSuggestions(
    detectedSearchType === 'name' ? query : ''
  )

  // Resultados combinados
  const results = useMemo(() => {
    if (detectedSearchType === 'cpf') {
      return cpfSearch.data ? [cpfSearch.data] : []
    }
    return nameSearch.data || []
  }, [detectedSearchType, cpfSearch.data, nameSearch.data])

  const isLoading = detectedSearchType === 'cpf' ? cpfSearch.isLoading : nameSearch.isLoading
  const error = detectedSearchType === 'cpf' ? cpfSearch.error : nameSearch.error

  return {
    query,
    setQuery,
    searchType: detectedSearchType,
    setSearchType,
    results,
    isLoading,
    error,
    hasResults: results.length > 0
  }
}

/**
 * Hook utilitário para validação de dados do estudante
 */
export function useStudentValidation(studentData: Partial<DatabaseStudent>) {
  const validation = useMemo(() => {
    return StudentsApiService.validateStudentData(studentData)
  }, [studentData])

  const hasErrors = !validation.valid
  const errorMessages = validation.errors

  return {
    isValid: validation.valid,
    hasErrors,
    errors: validation.errors,
    errorMessages,
    
    // Validações específicas
    hasNameError: errorMessages.some(msg => msg.includes('Nome')),
    hasCpfError: errorMessages.some(msg => msg.includes('CPF')),
    hasDateError: errorMessages.some(msg => msg.includes('nascimento') || msg.includes('Idade')),
    hasEmailError: errorMessages.some(msg => msg.includes('Email'))
  }
}

/**
 * Hook para formatação de dados do estudante
 */
export function useStudentFormatting(student: DatabaseStudent | null) {
  const formatted = useMemo(() => {
    if (!student) {
      return {
        name: '',
        formattedCpf: '',
        formattedPhone: '',
        age: 0,
        formattedBirthDate: ''
      }
    }

    // Calcular idade
    const calculateAge = (birthDate: string) => {
      const today = new Date()
      const birth = new Date(birthDate)
      let age = today.getFullYear() - birth.getFullYear()
      const monthDiff = today.getMonth() - birth.getMonth()
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--
      }
      return age
    }

    // Formatar CPF
    const formatCpf = (cpf: string) => {
      const cleanCpf = cpf.replace(/\D/g, '')
      return cleanCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
    }

    // Formatar telefone
    const formatPhone = (phone?: string) => {
      if (!phone) return ''
      const cleanPhone = phone.replace(/\D/g, '')
      if (cleanPhone.length === 11) {
        return cleanPhone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
      } else if (cleanPhone.length === 10) {
        return cleanPhone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
      }
      return phone
    }

    // Formatar data
    const formatDate = (date: string) => {
      return new Date(date).toLocaleDateString('pt-BR')
    }

    return {
      name: student.name,
      formattedCpf: formatCpf(student.cpf),
      formattedPhone: formatPhone(student.phone),
      age: calculateAge(student.birth_date),
      formattedBirthDate: formatDate(student.birth_date)
    }
  }, [student])

  return formatted
}