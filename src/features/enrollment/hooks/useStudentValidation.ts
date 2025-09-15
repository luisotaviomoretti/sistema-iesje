import { useCallback, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
// Observação: nesta etapa (identificação/roteamento inicial), não aplicamos
// a validação de dígito verificador do CPF. Apenas exigimos 11 dígitos
// numéricos para permitir a verificação de elegibilidade no backend.

export type ValidationState = 'idle' | 'validating' | 'ready' | 'error'
export type ValidationResult = 'not_found' | 'previous_year' | 'current_year'

interface HookState {
  state: ValidationState
  result: ValidationResult | null
  error: string | null
}

export function useStudentValidation() {
  const [hookState, setHookState] = useState<HookState>({ state: 'idle', result: null, error: null })
  const abortRef = useRef<AbortController | null>(null)

  const reset = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
    }
    setHookState({ state: 'idle', result: null, error: null })
  }, [])

  const validateCPF = useCallback(async (cpfInput: string) => {
    const digits = (cpfInput || '').replace(/\D/g, '')
    const dev = import.meta.env.DEV
    const supabaseUrl = (import.meta as any)?.env?.VITE_SUPABASE_URL
    const t0 = performance.now()
    if (dev) {
      console.groupCollapsed('[validateCPF] start')
      console.log('input:', cpfInput, 'digits:', digits)
      console.log('env.VITE_SUPABASE_URL:', supabaseUrl)
    }
    if (digits.length !== 11) {
      setHookState({ state: 'error', result: null, error: 'CPF inválido' })
      if (dev) {
        console.warn('[validateCPF] invalid cpf length')
        console.groupEnd()
      }
      return { ok: false as const, error: 'invalid' as const }
    }

    // Cancel any ongoing request
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
    }
    const controller = new AbortController()
    abortRef.current = controller

    setHookState((s) => ({ ...s, state: 'validating', error: null }))

    const call = async () => {
      // Primary path: supabase client
      const primary = await supabase.functions.invoke('validate_cpf', {
        body: { cpf: digits },
        headers: { 'content-type': 'application/json' },
      })
      if (dev) console.log('[validateCPF] edge response (invoke):', primary)

      // If URL is malformed (no ://) or we got a transport error, try direct fetch fallback
      const rawUrl = (import.meta as any)?.env?.VITE_SUPABASE_URL as string | undefined
      const needsFix = typeof rawUrl === 'string' && !rawUrl.includes('://')
      const transportError = !!primary.error && /Failed to send a request|fetch/i.test(primary.error.message || '')

      if (needsFix || transportError) {
        let base = rawUrl || ''
        if (/^https:[^/]/.test(base)) base = base.replace(/^https:/, 'https://')
        if (/^http:[^/]/.test(base)) base = base.replace(/^http:/, 'http://')
        const endpoint = `${base}/functions/v1/validate_cpf`
        const anon = (import.meta as any)?.env?.VITE_SUPABASE_ANON_KEY
        if (dev) console.warn('[validateCPF] fallback fetch →', endpoint)
        try {
          const resp = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'apikey': anon || '',
              'authorization': anon ? `Bearer ${anon}` : '',
            },
            body: JSON.stringify({ cpf: digits })
          })
          const data = await resp.json().catch(() => null)
          if (!resp.ok) {
            return { data: null as any, error: { message: `HTTP ${resp.status}: ${data?.error || 'error'}` } as any }
          }
          return { data, error: null as any }
        } catch (e: any) {
          return { data: null as any, error: { message: e?.message || 'fetch error' } as any }
        }
      }

      return primary
    }

    try {
      const { data, error } = await call()
      if (error) {
        // Do not retry on 400/429
        setHookState({ state: 'error', result: null, error: error.message || 'Falha na validação' })
        if (dev) {
          console.error('[validateCPF] edge error (no retry):', error)
          console.groupEnd()
        }
        return { ok: false as const, error: 'edge' as const }
      }
      const status = (data?.status ?? 'not_found') as ValidationResult
      setHookState({ state: 'ready', result: status, error: null })
      if (dev) {
        const dt = Math.round(performance.now() - t0)
        console.log('[validateCPF] status:', status, 'timeMs:', dt)
        console.groupEnd()
      }
      return { ok: true as const, status }
    } catch (e: any) {
      if (controller.signal.aborted) {
        if (dev) {
          console.warn('[validateCPF] aborted')
          console.groupEnd()
        }
        return { ok: false as const, error: 'aborted' as const }
      }
      
      // Fallback: Query database directly if edge function fails
      if (dev) console.log('[validateCPF] Edge function failed, trying direct database query')
      try {
        const cpfFormatted = digits.length === 11 
          ? `${digits.slice(0,3)}.${digits.slice(3,6)}.${digits.slice(6,9)}-${digits.slice(9)}`
          : digits

        const currentYear = new Date().getFullYear()
        const prevYear = currentYear - 1
        const startOfCurrent = new Date(currentYear, 0, 1).toISOString()
        const startOfNext = new Date(currentYear + 1, 0, 1).toISOString()
        const startOfPrev = new Date(prevYear, 0, 1).toISOString()

        // Check current year enrollments
        const { data: currentEnrollments } = await supabase
          .from('enrollments')
          .select('id')
          .or(`student_cpf.eq.${digits},student_cpf.eq.${cpfFormatted}`)
          .gte('created_at', startOfCurrent)
          .lt('created_at', startOfNext)
          .limit(1)

        if (currentEnrollments && currentEnrollments.length > 0) {
          const status = 'current_year' as ValidationResult
          setHookState({ state: 'ready', result: status, error: null })
          if (dev) {
            const dt = Math.round(performance.now() - t0)
            console.log('[validateCPF] fallback status:', status, 'timeMs:', dt)
            console.groupEnd()
          }
          return { ok: true as const, status }
        }

        // Check previous year enrollments
        const { data: prevEnrollments } = await supabase
          .from('enrollments')
          .select('id')
          .or(`student_cpf.eq.${digits},student_cpf.eq.${cpfFormatted}`)
          .gte('created_at', startOfPrev)
          .lt('created_at', startOfCurrent)
          .limit(1)

        if (prevEnrollments && prevEnrollments.length > 0) {
          const status = 'previous_year' as ValidationResult
          setHookState({ state: 'ready', result: status, error: null })
          if (dev) {
            const dt = Math.round(performance.now() - t0)
            console.log('[validateCPF] fallback status:', status, 'timeMs:', dt)
            console.groupEnd()
          }
          return { ok: true as const, status }
        }

        // Check dedicated previous_year_students table
        const { data: prevStudents } = await supabase
          .from('previous_year_students')
          .select('id')
          .or(`student_cpf.eq.${digits},student_cpf.eq.${cpfFormatted}`)
          .eq('academic_year', String(prevYear))
          .limit(1)

        if (prevStudents && prevStudents.length > 0) {
          const status = 'previous_year' as ValidationResult
          setHookState({ state: 'ready', result: status, error: null })
          if (dev) {
            const dt = Math.round(performance.now() - t0)
            console.log('[validateCPF] fallback status:', status, 'timeMs:', dt)
            console.groupEnd()
          }
          return { ok: true as const, status }
        }

        // Not found
        const status = 'not_found' as ValidationResult
        setHookState({ state: 'ready', result: status, error: null })
        if (dev) {
          const dt = Math.round(performance.now() - t0)
          console.log('[validateCPF] fallback status:', status, 'timeMs:', dt)
          console.groupEnd()
        }
        return { ok: true as const, status }
      } catch (fallbackError: any) {
        if (dev) console.error('[validateCPF] Fallback also failed:', fallbackError)
      }
      
      // Attempt one retry for transient issues
      try {
        const { data, error } = await call()
        if (error) {
          setHookState({ state: 'error', result: null, error: error.message || 'Falha na validação' })
          if (dev) {
            console.error('[validateCPF] retry error:', error)
            console.groupEnd()
          }
          return { ok: false as const, error: 'edge' as const }
        }
        const status = (data?.status ?? 'not_found') as ValidationResult
        setHookState({ state: 'ready', result: status, error: null })
        if (dev) {
          const dt = Math.round(performance.now() - t0)
          console.log('[validateCPF] retry status:', status, 'timeMs:', dt)
          console.groupEnd()
        }
        return { ok: true as const, status }
      } catch (err: any) {
        setHookState({ state: 'error', result: null, error: 'Erro de rede' })
        if (dev) {
          console.error('[validateCPF] network error:', err)
          console.groupEnd()
        }
        return { ok: false as const, error: 'network' as const }
      }
    } finally {
      abortRef.current = null
    }
  }, [])

  const isBusy = hookState.state === 'validating'
  const canValidate = useMemo(() => hookState.state !== 'validating', [hookState.state])

  return {
    state: hookState.state,
    result: hookState.result,
    error: hookState.error,
    isBusy,
    canValidate,
    validateCPF,
    reset,
  }
}
