import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface InadimplenciaResult {
  is_inadimplente: boolean
  meses_inadim: number | null
  codigo_inadim: string | null
}

// =============================
// Cache leve por nome normalizado (memória + TTL curto)
// =============================
const CHECK_TTL_MS = 60_000 // 60s
type CachedItem = { value: InadimplenciaResult; expiresAt: number }
const memCheckCache = new Map<string, CachedItem>()

function normalizeName(s?: string | null): string {
  try {
    const t = String(s ?? '').toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove diacríticos
      .replace(/[^a-z0-9\s]+/g, ' ') // remove pontuações
      .replace(/\s+/g, ' ') // colapsa espaços
      .trim()
    return t
  } catch { return '' }
}

function makeKey(params: { studentName: string; guardianName?: string | null; school?: string | null }): string {
  const a = normalizeName(params.studentName)
  const g = normalizeName(params.guardianName)
  const s = String(params.school ?? '').trim().toLowerCase()
  return `v1:${a}|${g}|${s}`
}

function getFromCache(key: string): InadimplenciaResult | null {
  const hit = memCheckCache.get(key)
  if (hit && hit.expiresAt > Date.now()) return hit.value
  if (hit) memCheckCache.delete(key)
  return null
}

function setCache(key: string, value: InadimplenciaResult, ttlMs = CHECK_TTL_MS) {
  memCheckCache.set(key, { value, expiresAt: Date.now() + ttlMs })
}

export function invalidateInadimplenciaCheckCache(options?: { keyPrefix?: string }) {
  const p = options?.keyPrefix
  if (!p) {
    memCheckCache.clear()
    return
  }
  for (const k of Array.from(memCheckCache.keys())) {
    if (k.startsWith(p)) memCheckCache.delete(k)
  }
}

export async function checkInadimplenciaOnce(params: {
  studentName: string
  guardianName?: string | null
  school?: string | null
}): Promise<InadimplenciaResult> {
  try {
    const key = makeKey(params)
    const cached = getFromCache(key)
    if (cached) return cached
    const { data, error } = await supabase.rpc('check_inadimplencia', {
      p_student_name: params.studentName,
      p_guardian_name: params.guardianName ?? null,
      p_user_school: params.school ?? null,
    })
    if (error) {
      // Falha silenciosa para não quebrar UX: considerar como não inadimplente
      if (import.meta.env.DEV) console.warn('[checkInadimplenciaOnce] error:', error)
      const res = { is_inadimplente: false, meses_inadim: null, codigo_inadim: null }
      setCache(key, res)
      return res
    }
    const row = Array.isArray(data) && data.length > 0 ? (data[0] as any) : (data as any)
    const res: InadimplenciaResult = {
      is_inadimplente: Boolean(row?.is_inadimplente),
      meses_inadim: row?.meses_inadim ?? null,
      codigo_inadim: row?.codigo_inadim ?? null,
    }
    setCache(key, res)
    return res
  } catch (err) {
    if (import.meta.env.DEV) console.warn('[checkInadimplenciaOnce] exception:', err)
    const res = { is_inadimplente: false, meses_inadim: null, codigo_inadim: null }
    try { setCache(makeKey(params), res) } catch {}
    return res
  }
}

export function useCheckInadimplencia(params: {
  studentName?: string
  guardianName?: string | null
  school?: string | null
  enabled?: boolean
}) {
  const enabled = Boolean(params.enabled && params.studentName && params.studentName.trim().length > 0)
  const key = makeKey({ studentName: params.studentName || '', guardianName: params.guardianName, school: params.school })
  return useQuery({
    queryKey: ['inadimplencia-check', key],
    queryFn: async () => {
      return checkInadimplenciaOnce({
        studentName: params.studentName!,
        guardianName: params.guardianName ?? null,
        school: params.school ?? null,
      })
    },
    enabled,
    staleTime: CHECK_TTL_MS,
  })
}
