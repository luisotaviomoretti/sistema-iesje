/*
  Hook utilitário (F1) — useMergedEnrollmentData
  - Mescla o read model base com overrides do draft local (state/enrollmentDraft)
  - Fornece actions para atualizar/limpar seções do draft
  - Não toca em UI nem em serviços; read-only para o servidor até a finalização
*/

import { useCallback, useMemo, useState } from 'react'
import type { RematriculaReadModel, ReadModelStudent, ReadModelGuardians, ReadModelAddress } from '../types/details'
import {
  getDraft,
  saveDraft,
  clearDraft,
  saveStudent,
  saveGuardians,
  saveAddress,
  clearStudent,
  clearGuardians,
  clearAddress,
  mergeReadModelWithDraft,
  type RematriculaDraft,
} from '../state/enrollmentDraft'

export interface UseMergedEnrollmentDataParams {
  readModel: RematriculaReadModel | null | undefined
  draftKey: string | null | undefined
}

export interface UseMergedEnrollmentDataReturn {
  merged: RematriculaReadModel | null
  draft: RematriculaDraft
  // setters por seção
  setStudent: (partial: Partial<ReadModelStudent>) => void
  setGuardians: (partial: RematriculaDraft['guardians']) => void
  setAddress: (partial: Partial<ReadModelAddress>) => void
  // clear por seção
  clearStudent: () => void
  clearGuardians: () => void
  clearAddress: () => void
  // reset total
  clearAll: () => void
}

export function useMergedEnrollmentData(params: UseMergedEnrollmentDataParams): UseMergedEnrollmentDataReturn {
  const { readModel, draftKey } = params
  const safeKey = String(draftKey || '')

  // Um contador local para forçar re-render quando salvar/limpar no store
  const [ver, setVer] = useState(0)
  const bump = useCallback(() => setVer((v) => (v + 1) | 0), [])
  // Quando a chave mudar, o draft será reavaliado via dependências (safeKey)

  const draft = useMemo<RematriculaDraft>(() => (
    safeKey ? getDraft(safeKey) : {}
  ), [safeKey, ver])

  const merged = useMemo<RematriculaReadModel | null>(() => {
    if (!readModel) return null
    return mergeReadModelWithDraft(readModel, draft)
  }, [readModel, draft])

  const setStudentAction = useCallback((partial: Partial<ReadModelStudent>) => {
    if (!safeKey) return
    saveStudent(safeKey, partial)
    bump()
  }, [safeKey, bump])

  const setGuardiansAction = useCallback((partial: RematriculaDraft['guardians']) => {
    if (!safeKey) return
    saveGuardians(safeKey, partial)
    bump()
  }, [safeKey, bump])

  const setAddressAction = useCallback((partial: Partial<ReadModelAddress>) => {
    if (!safeKey) return
    saveAddress(safeKey, partial)
    bump()
  }, [safeKey, bump])

  const clearStudentAction = useCallback(() => {
    if (!safeKey) return
    clearStudent(safeKey)
    bump()
  }, [safeKey, bump])

  const clearGuardiansAction = useCallback(() => {
    if (!safeKey) return
    clearGuardians(safeKey)
    bump()
  }, [safeKey, bump])

  const clearAddressAction = useCallback(() => {
    if (!safeKey) return
    clearAddress(safeKey)
    bump()
  }, [safeKey, bump])

  const clearAllAction = useCallback(() => {
    if (!safeKey) return
    clearDraft(safeKey)
    bump()
  }, [safeKey, bump])

  return {
    merged,
    draft,
    setStudent: setStudentAction,
    setGuardians: setGuardiansAction,
    setAddress: setAddressAction,
    clearStudent: clearStudentAction,
    clearGuardians: clearGuardiansAction,
    clearAddress: clearAddressAction,
    clearAll: clearAllAction,
  }
}
