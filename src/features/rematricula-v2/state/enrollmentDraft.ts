/*
  Rematrícula Draft Store (F1)
  - Armazena overrides locais para as seções: student, guardians, address
  - Persistência: memória + LocalStorage (TTL padrão: 24h)
  - Sem dependência de UI; não altera a fonte original (read model)
*/

import type { RematriculaReadModel, ReadModelStudent, ReadModelGuardians, ReadModelAddress } from '../types/details'

// Tipos de draft (somente seções editáveis)
export type RematriculaDraft = {
  student?: Partial<ReadModelStudent>
  guardians?: {
    guardian1?: Partial<ReadModelGuardians['guardian1']>
    guardian2?: Partial<NonNullable<ReadModelGuardians['guardian2']>> | null
  }
  address?: Partial<ReadModelAddress>
}

const TTL_MS = 24 * 60 * 60 * 1000 // 24h
const DRAFT_LS_PREFIX = 'rematricula.draft'
const DRAFT_VERSION = 'v1'

function now() { return Date.now() }

function hasWindow(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined'
}

function lsKeyForDraft(draftKey: string) {
  return `${DRAFT_LS_PREFIX}.${draftKey}.${DRAFT_VERSION}`
}

// Memória: cache por chave com expiração
const memCache = new Map<string, { value: RematriculaDraft; expiresAt: number }>()

function readFromLS(draftKey: string): RematriculaDraft | null {
  try {
    if (!hasWindow()) return null
    const raw = localStorage.getItem(lsKeyForDraft(draftKey))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    const { value, expiresAt } = parsed || {}
    if (typeof expiresAt !== 'number' || !value) return null
    if (now() > expiresAt) return null
    return value as RematriculaDraft
  } catch {
    return null
  }
}

function writeToLS(draftKey: string, value: RematriculaDraft, ttlMs = TTL_MS) {
  try {
    if (!hasWindow()) return
    const payload = JSON.stringify({ value, expiresAt: now() + ttlMs })
    localStorage.setItem(lsKeyForDraft(draftKey), payload)
  } catch {
    // noop
  }
}

function removeFromLS(draftKey: string) {
  try {
    if (!hasWindow()) return
    localStorage.removeItem(lsKeyForDraft(draftKey))
  } catch {
    // noop
  }
}

function deepMerge<T extends Record<string, any>>(base: T | undefined, patch: Partial<T> | undefined): T | undefined {
  if (!patch) return base
  const a: any = base ? { ...base } : {}
  for (const k of Object.keys(patch)) {
    const pv = (patch as any)[k]
    if (pv && typeof pv === 'object' && !Array.isArray(pv)) {
      a[k] = deepMerge(a[k], pv)
    } else if (pv === null) {
      a[k] = null
    } else if (pv !== undefined) {
      a[k] = pv
    }
  }
  return a as T
}

function mergeDrafts(base: RematriculaDraft | undefined, patch: RematriculaDraft): RematriculaDraft {
  return {
    student: deepMerge(base?.student, patch.student),
    guardians: {
      guardian1: deepMerge(base?.guardians?.guardian1, patch.guardians?.guardian1),
      guardian2: patch.guardians && 'guardian2' in patch.guardians
        ? (patch.guardians?.guardian2 ?? null)
        : (base?.guardians?.guardian2 ?? undefined),
    },
    address: deepMerge(base?.address, patch.address),
  }
}

export function getDraft(draftKey: string): RematriculaDraft {
  // 1) memória
  const mem = memCache.get(draftKey)
  if (mem && now() <= mem.expiresAt) return mem.value
  // 2) localStorage
  const ls = readFromLS(draftKey)
  if (ls) {
    const expiresAt = now() + TTL_MS
    memCache.set(draftKey, { value: ls, expiresAt })
    return ls
  }
  // 3) vazio
  const empty: RematriculaDraft = {}
  memCache.set(draftKey, { value: empty, expiresAt: now() + TTL_MS })
  return empty
}

export function saveDraft(draftKey: string, patch: RematriculaDraft): RematriculaDraft {
  const current = getDraft(draftKey)
  const merged = mergeDrafts(current, patch)
  const expiresAt = now() + TTL_MS
  memCache.set(draftKey, { value: merged, expiresAt })
  writeToLS(draftKey, merged)
  return merged
}

export function clearDraft(draftKey: string) {
  memCache.delete(draftKey)
  removeFromLS(draftKey)
}

// Helpers por seção
export function saveStudent(draftKey: string, student: Partial<ReadModelStudent>): RematriculaDraft {
  return saveDraft(draftKey, { student })
}

export function saveGuardians(draftKey: string, guardians: RematriculaDraft['guardians']): RematriculaDraft {
  return saveDraft(draftKey, { guardians })
}

export function saveAddress(draftKey: string, address: Partial<ReadModelAddress>): RematriculaDraft {
  return saveDraft(draftKey, { address })
}

export function clearStudent(draftKey: string): RematriculaDraft {
  const current = getDraft(draftKey)
  const merged = { ...current, student: undefined }
  const expiresAt = now() + TTL_MS
  memCache.set(draftKey, { value: merged, expiresAt })
  writeToLS(draftKey, merged)
  return merged
}

export function clearGuardians(draftKey: string): RematriculaDraft {
  const current = getDraft(draftKey)
  const merged = { ...current, guardians: undefined }
  const expiresAt = now() + TTL_MS
  memCache.set(draftKey, { value: merged, expiresAt })
  writeToLS(draftKey, merged)
  return merged
}

export function clearAddress(draftKey: string): RematriculaDraft {
  const current = getDraft(draftKey)
  const merged = { ...current, address: undefined }
  const expiresAt = now() + TTL_MS
  memCache.set(draftKey, { value: merged, expiresAt })
  writeToLS(draftKey, merged)
  return merged
}

// Merge do read model com o draft (puro)
export function mergeReadModelWithDraft(base: RematriculaReadModel, draft: RematriculaDraft): RematriculaReadModel {
  const merged: RematriculaReadModel = {
    ...base,
    student: {
      ...base.student,
      ...(draft.student || {}),
    },
    academic: { ...base.academic }, // não editável
    guardians: {
      guardian1: {
        ...base.guardians.guardian1,
        ...(draft.guardians?.guardian1 || {}),
      },
      ...(typeof base.guardians.guardian2 !== 'undefined' || typeof draft.guardians?.guardian2 !== 'undefined'
        ? { guardian2: draft.guardians?.guardian2 === null ? undefined : {
            ...(base.guardians.guardian2 || {} as any),
            ...(draft.guardians?.guardian2 || {}),
          } }
        : {}),
    },
    address: {
      ...base.address,
      ...(draft.address || {}),
    },
    financial: { ...base.financial },
    meta: base.meta ? { ...base.meta } : undefined,
  }
  return merged
}
