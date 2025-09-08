import { useEffect, useMemo, useState } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import type { EnrollmentFormData } from '@/features/matricula-nova/types/forms'
import type { PreviousYearPrefill } from '../types'
import { useEligibleDiscounts } from '@/features/enrollment/hooks/useEligibleDiscounts'
import { DiscountsApiService } from '@/features/matricula-nova/services/api/discounts'
import type { DatabaseDiscount } from '@/features/matricula-nova/types/api'
import { useDiscountDocuments } from '@/features/matricula-nova/hooks/useDiscountDocuments'

type Strategy = 'keep_previous' | 'alter'

export function useRematriculaDiscounts(
  form: UseFormReturn<EnrollmentFormData>,
  prefill: PreviousYearPrefill | null
) {
  const [strategy, setStrategy] = useState<Strategy>('keep_previous')
  const [allDiscounts, setAllDiscounts] = useState<DatabaseDiscount[]>([])
  const [loadingAll, setLoadingAll] = useState(false)
  const [loadingError, setLoadingError] = useState<string | null>(null)

  // Watch relevant form fields
  const cep = form.watch('address.cep')
  const trackId = form.watch('academic.trackId')
  const selected = form.watch('selectedDiscounts') || []

  // Load active discounts once (or on track change if desired)
  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setLoadingAll(true)
      setLoadingError(null)
      try {
        const data = await DiscountsApiService.getActiveDiscounts()
        if (!cancelled) setAllDiscounts(data || [])
      } catch (e: any) {
        if (!cancelled) setLoadingError(e?.message || 'Erro ao carregar descontos')
      } finally {
        if (!cancelled) setLoadingAll(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [])

  // Elegibilidade por CEP (trilhoType opcional; regras de trilho podem ser aplicadas mais tarde)
  const { eligibleDiscounts, ineligibleDiscounts, isLoading: loadingEligibility, error: eligibilityError } = useEligibleDiscounts(
    (cep || '').replace(/\D/g, '') || undefined,
    allDiscounts,
    undefined,
    { refetchOnWindowFocus: false }
  )

  // Estratégia: manter descontos anteriores se elegíveis
  useEffect(() => {
    if (!prefill || strategy !== 'keep_previous') return
    if (loadingAll || loadingEligibility) return

    const prev = prefill.finance?.previous_applied_discounts || []
    if (!prev.length) return

    const eligibleByCode = new Set(eligibleDiscounts.map(d => d.codigo))
    const mapped = prev
      .filter(d => eligibleByCode.has(d.discount_code))
      .map(d => ({ id: (allDiscounts.find(x => x.codigo === d.discount_code)?.id) || d.discount_id, percentual: d.percentage_applied || 0 }))

    // Apenas aplicar se houver diferenças
    const currentKey = JSON.stringify((form.getValues('selectedDiscounts') || []).sort((a, b) => a.id.localeCompare(b.id)))
    const nextKey = JSON.stringify(mapped.sort((a, b) => a.id.localeCompare(b.id)))
    if (currentKey !== nextKey) {
      form.setValue('selectedDiscounts', mapped, { shouldValidate: true, shouldDirty: true })
    }
  }, [prefill, strategy, loadingAll, loadingEligibility, eligibleDiscounts, allDiscounts])

  // Documentos requeridos para seleção atual
  const selectedCodes = useMemo(() => {
    const byId = new Map(allDiscounts.map(d => [d.id, d]))
    return selected.map(s => byId.get(s.id)?.codigo).filter(Boolean) as string[]
  }, [selected, allDiscounts])

  const documentsQuery = useDiscountDocuments(selectedCodes)

  // Inconsistências: descontos anteriores inelegíveis
  const previousIneligible = useMemo(() => {
    if (!prefill) return [] as Array<{ code: string; reason: string | null }>
    const prev = prefill.finance?.previous_applied_discounts || []
    const ineligibleByCode = new Map(ineligibleDiscounts.map(x => [x.discount.codigo, x.reason]))
    return prev
      .filter(d => ineligibleByCode.has(d.discount_code))
      .map(d => ({ code: d.discount_code, reason: ineligibleByCode.get(d.discount_code) || null }))
  }, [prefill, ineligibleDiscounts])

  // Conveniências
  const canMaintainPrevious = (previousIneligible.length === 0)
  const loading = loadingAll || loadingEligibility
  const error = loadingError || eligibilityError

  return {
    strategy,
    setStrategy,
    allDiscounts,
    eligibleDiscounts,
    ineligibleDiscounts,
    loading,
    error,
    previousIneligible,
    canMaintainPrevious,
    documents: documentsQuery.data || [],
    documentsLoading: documentsQuery.isLoading,
  }
}

