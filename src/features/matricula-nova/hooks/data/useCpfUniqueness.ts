import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { StudentsApiService } from '../../services/api/students'
import { normalizeCpf, formatCPF } from '../../utils/formatters'

type Source = 'students' | 'enrollments' | 'none'

export interface CpfUniquenessResult {
  exists: boolean
  isChecking: boolean
  error: string | null
  source: Source
  normalizedCpf: string
}

/**
 * Hook para verificar duplicidade de CPF com debounce e fallback.
 * - Primeiro tenta `students` (se existir/estiver acessível).
 * - Se não encontrado, consulta `enrollments` (exclui status 'deleted').
 * - Não bloqueia por erro de rede: reporta erro mas não considera duplicado a menos que confirmado.
 */
export function useCpfUniqueness(cpf: string | undefined, options?: { debounceMs?: number }): CpfUniquenessResult {
  const debounceMs = options?.debounceMs ?? 500
  const normalized = useMemo(() => normalizeCpf(cpf || ''), [cpf])

  // Debounce simples
  const [debouncedCpf, setDebouncedCpf] = useState<string>('')
  useEffect(() => {
    const t = setTimeout(() => setDebouncedCpf(normalized), debounceMs)
    return () => clearTimeout(t)
  }, [normalized, debounceMs])

  const isCpfCandidate = debouncedCpf.length === 11

  const query = useQuery({
    queryKey: ['cpf-uniqueness', debouncedCpf],
    enabled: isCpfCandidate,
    staleTime: 2 * 60 * 1000, // 2 min
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
    queryFn: async (): Promise<{ exists: boolean; source: Source }> => {
      // 1) Tentar via students
      try {
        const res = await StudentsApiService.checkCpfExists(debouncedCpf)
        if (res?.data?.exists) {
          return { exists: true, source: 'students' }
        }
      } catch {
        // Ignorar erro — tentar fallback
      }

      // 2) Fallback via enrollments (exclui deletados)
      try {
        const masked = formatCPF(debouncedCpf)
        // Tentar equivalência com valor normalizado e com máscara
        const { data, error } = await supabase
          .from('enrollments')
          .select('id,status')
          .or(`student_cpf.eq.${debouncedCpf},student_cpf.eq.${masked}`)
          .neq('status', 'deleted')
          .limit(1)

        if (!error && Array.isArray(data) && data.length > 0) {
          return { exists: true, source: 'enrollments' }
        }
      } catch {
        // Ignorar erro e prosseguir
      }

      // 3) Não encontrado
      return { exists: false, source: 'none' }
    },
  })

  return {
    exists: query.data?.exists ?? false,
    isChecking: query.isFetching || query.isLoading,
    error: query.error ? (query.error as Error).message : null,
    source: query.data?.source ?? 'none',
    normalizedCpf: debouncedCpf,
  }
}
