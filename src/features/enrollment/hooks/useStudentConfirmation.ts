/**
 * Hook para buscar dados de confirmação de aluno do ano anterior
 * FASE 1.1: Implementação isolada sem afetar funcionalidade atual
 * 
 * Reutiliza RematriculaDetailsService.getByCPF() existente
 * Retorna apenas os 3 campos necessários para o modal de confirmação:
 * - Nome do aluno
 * - Série anterior  
 * - Responsável primário
 * - Escola anterior
 */

import { useState, useCallback } from 'react'
import { RematriculaDetailsService } from '@/features/rematricula-v2/services/rematriculaDetailsService'
import { supabase } from '@/lib/supabase'

export interface StudentConfirmationData {
  name: string
  series: string
  guardian: string
  school?: string
}

export type ConfirmationState = 'idle' | 'loading' | 'success' | 'error'

export interface ConfirmationHookReturn {
  state: ConfirmationState
  data: StudentConfirmationData | null
  error: string | null
  fetchStudentData: (cpf: string) => Promise<StudentConfirmationData | null>
  reset: () => void
}

/**
 * Hook para buscar dados de confirmação do aluno
 * Completamente isolado - não afeta nenhuma funcionalidade atual
 */
export const useStudentConfirmation = (): ConfirmationHookReturn => {
  const [state, setState] = useState<ConfirmationState>('idle')
  const [data, setData] = useState<StudentConfirmationData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchStudentData = useCallback(async (cpf: string): Promise<StudentConfirmationData | null> => {
    // Log para debug (apenas em desenvolvimento)
    const dev = (import.meta as any)?.env?.DEV
    if (dev) {
      console.log('[useStudentConfirmation] Iniciando busca para CPF:', cpf)
    }

    setState('loading')
    setError(null)
    setData(null)
    
    try {
      // Reutilizar serviço já existente e testado
      const result = await RematriculaDetailsService.getByCPF(cpf)
      
      if (dev) {
        console.log('[useStudentConfirmation] Resultado do RematriculaDetailsService:', result)
      }
      
      if (result) {
        // Extrair apenas os 4 campos necessários para confirmação
        let school: string | undefined = (result.student.escola as unknown as string) || undefined
        // Fallback seguro via RPC read-only caso escola venha ausente
        if (!school) {
          try {
            const digits = String(cpf || '').replace(/\D/g, '').slice(0, 11)
            if (digits.length === 11) {
              const { data: rpc, error: rpcErr } = await supabase.rpc('get_previous_school_by_cpf', { p_cpf_digits: digits })
              if (!rpcErr && rpc && (rpc as any).found && (rpc as any).school_name) {
                school = (rpc as any).school_name as string
                if (dev) console.log('[useStudentConfirmation] Fallback RPC school_name:', school)
              }
            }
          } catch (e) {
            if (dev) console.warn('[useStudentConfirmation] RPC fallback failed:', e)
          }
        }

        const confirmationData: StudentConfirmationData = {
          name: result.student.name || 'Nome não informado',
          series: result.academic.series_name || 'Série não informada',
          guardian: result.guardians.guardian1?.name || 'Responsável não informado',
          school,
        }
        
        setData(confirmationData)
        setState('success')
        
        if (dev) {
          console.log('[useStudentConfirmation] Dados carregados com sucesso:', confirmationData)
        }
        
        return confirmationData
      } else {
        // Dados não encontrados
        if (dev) {
          console.warn('[useStudentConfirmation] Nenhum dado retornado do RematriculaDetailsService')
        }
        throw new Error('Dados do aluno não encontrados')
      }
    } catch (err: any) {
      const errorMessage = err?.message || 'Erro desconhecido ao buscar dados'
      setError(errorMessage)
      setState('error')
      
      if (dev) {
        console.error('[useStudentConfirmation] Erro na busca:', err)
      }
      
      return null
    }
  }, [])

  const reset = useCallback(() => {
    const dev = (import.meta as any)?.env?.DEV
    if (dev) {
      console.log('[useStudentConfirmation] Reset do hook')
    }
    
    setState('idle')
    setData(null)
    setError(null)
  }, [])

  return {
    state,
    data,
    error,
    fetchStudentData,
    reset
  }
}