import { supabase } from '@/lib/supabase'
import { getRematriculaHomeConfig } from '@/lib/config/config.service'

export type SearchScope = 'student' | 'guardian'

export interface RematriculaCandidateRow {
  student_id: string
  student_name: string
  student_slug: string
  selection_token: string
  guardian_names: string[] | null
  school_name: string | null
  grade_name: string | null
  reenrollment_status: 'NONE' | 'IN_PROGRESS' | 'COMPLETED'
  reenrollment_id: string | null
  has_reenrollment: boolean
}

export interface SearchParams {
  query: string
  scope?: SearchScope
  year?: number
  limit?: number
  page?: number
  offset?: number
}

export interface SearchResult {
  items: RematriculaCandidateRow[]
  count: number | null
  limit: number
  offset: number
  page: number
  scope: SearchScope
  year: number
}

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min
  return Math.max(min, Math.min(max, n))
}

function coalesceNumber(v: any, fallback: number): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

export const RematriculaSearchService = {
  async getConfig() {
    return await getRematriculaHomeConfig()
  },

  async searchCandidates(params: SearchParams): Promise<SearchResult> {
    const cfg = await getRematriculaHomeConfig()

    const minChars = clamp(coalesceNumber(cfg.minChars, 3), 2, 10)
    const pageSize = clamp(coalesceNumber(params.limit ?? cfg.pageSize, cfg.pageSize), 10, 50)
    const year = coalesceNumber(params.year ?? cfg.academicYear, new Date().getFullYear())
    const scope: SearchScope = (params.scope || cfg.searchScopeDefault || 'student') === 'guardian' ? 'guardian' : 'student'

    const q = String(params.query || '').trim()
    if (q.length < minChars) {
      return {
        items: [],
        count: 0,
        limit: pageSize,
        offset: 0,
        page: 0,
        scope,
        year,
      }
    }

    const page = Math.max(0, coalesceNumber(params.page ?? 0, 0))
    const offset = Math.max(0, params.offset != null ? coalesceNumber(params.offset, 0) : page * pageSize)

    const { data, error } = await supabase.rpc('rematricula_search_candidates', {
      q,
      search_scope: scope,
      year,
      limit_: pageSize,
      offset_: offset,
      school_id_hint: null,
    } as any)

    if (error) {
      throw error
    }

    const rows = (Array.isArray(data) ? data : []) as RematriculaCandidateRow[]

    return {
      items: rows,
      count: null, // A RPC não retorna total; se necessário, criar uma função separada ou heurística
      limit: pageSize,
      offset,
      page,
      scope,
      year,
    }
  },

  buildDetailPath(candidate: Pick<RematriculaCandidateRow, 'student_slug'>): string {
    const slug = String(candidate.student_slug || '').trim()
    return `/rematricula/detalhe/${encodeURIComponent(slug)}`
  },

  canInitiateReenrollment(c: RematriculaCandidateRow): boolean {
    return !c.has_reenrollment && c.reenrollment_status === 'NONE'
  },
}

// Utilitário de busca com debounce + descarte de chamadas antigas (dark launch-ready)
export function createRematriculaSearchManager() {
  let timer: any = null
  let lastReject: ((reason?: any) => void) | null = null
  let currentSeq = 0

  async function debouncedSearch(params: SearchParams): Promise<SearchResult> {
    const cfg = await getRematriculaHomeConfig()
    const debounceMs = clamp(coalesceNumber(cfg.debounceMs, 350), 200, 800)

    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    if (lastReject) {
      try { lastReject(new Error('cancelled')) } catch {}
      lastReject = null
    }

    const seq = ++currentSeq

    return new Promise<SearchResult>((resolve, reject) => {
      lastReject = reject
      timer = setTimeout(async () => {
        try {
          const res = await RematriculaSearchService.searchCandidates(params)
          if (seq !== currentSeq) {
            // resposta antiga, descartar silenciosamente
            return
          }
          resolve(res)
        } catch (err) {
          if (seq !== currentSeq) return
          reject(err)
        }
      }, debounceMs)
    })
  }

  function cancelPending() {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    if (lastReject) {
      try { lastReject(new Error('cancelled')) } catch {}
      lastReject = null
    }
  }

  function dispose() {
    cancelPending()
  }

  return { debouncedSearch, cancelPending, dispose }
}
