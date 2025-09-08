import { useCallback, useEffect, useMemo, useState } from 'react'
import { useEnrollmentForm } from '@/features/matricula-nova/hooks/useEnrollmentForm'
import { PreviousYearService } from '../services/previousYear'
import { mapPreviousYearToEnrollmentForm } from '../utils/mapping'
import type { PreviousYearPrefill } from '../types'

export function useRematriculaForm(cpf: string, birthDateHint: string) {
  const enrollment = useEnrollmentForm()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [prefill, setPrefill] = useState<PreviousYearPrefill | null>(null)
  const [lastKey, setLastKey] = useState<string>('')
  const inflight = useState<{ v: boolean }>({ v: false })[0]

  const load = useCallback(async () => {
    if (!cpf || !birthDateHint) return
    const key = `${cpf}|${birthDateHint}`
    if (inflight.v || lastKey === key) return
    inflight.v = true
    setLoading(true)
    setError(null)
    try {
      const data = await PreviousYearService.getPrefill(cpf, birthDateHint)
      setPrefill(data)
      setLastKey(key)
      const mapped = mapPreviousYearToEnrollmentForm(data)
      // Apenas reset se houver diferença relevante (evita loops)
      const currentCpf = enrollment.form.getValues('student.cpf')
      if ((currentCpf || '').replace(/\D/g, '') !== (mapped.student.cpf || '').replace(/\D/g, '')) {
        enrollment.form.reset(mapped, { keepDefaultValues: false, keepDirty: false, keepTouched: false })
      }
    } catch (e: any) {
      setError(e?.message || 'Falha ao carregar dados para rematrícula')
    } finally {
      setLoading(false)
      inflight.v = false
    }
  }, [cpf, birthDateHint, lastKey])

  const ready = useMemo(() => !!prefill && !loading && !error, [prefill, loading, error])

  return {
    enrollment,
    prefill,
    loading,
    error,
    ready,
    reload: load,
  }
}
