import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, type Database } from '@/lib/supabase'

export type Inadimplente = Database['public']['Tables']['inadimplentes']['Row']
export type StagingInadimplente = Database['public']['Tables']['staging_inadimplentes_raw']['Row']

export interface InadimplentesFilters {
  isActive?: boolean | 'all'
  school?: string | null
  search?: string
}

function buildListQuery(filters: InadimplentesFilters) {
  let query = supabase.from('inadimplentes').select('*')
  if (filters.isActive !== 'all') {
    query = query.eq('is_active', filters.isActive !== false)
  }
  if (filters.school && filters.school.trim().length > 0) {
    query = query.eq('student_escola', filters.school)
  }
  if (filters.search && filters.search.trim().length > 0) {
    const s = filters.search.trim().toLowerCase()
    // Buscar por nome exato normalizado no backend seria melhor.
    // Aqui usamos LIKE no nome bruto para filtro exibicional.
    query = query.ilike('student_name', `%${s}%`)
  }
  return query.order('updated_at', { ascending: false })
}

export const useInadimplentes = (filters: InadimplentesFilters = { isActive: true }) => {
  return useQuery({
    queryKey: ['inadimplentes', filters],
    queryFn: async (): Promise<Inadimplente[]> => {
      const { data, error } = await buildListQuery(filters)
      if (error) throw error
      return data ?? []
    },
    staleTime: 60_000,
  })
}

export const useInadimplentesStats = () => {
  return useQuery({
    queryKey: ['inadimplentes-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_inadimplentes_stats')
      if (error) throw error
      return (data as { school: string; total_active: number }[]) ?? []
    },
    staleTime: 60_000,
  })
}

export const useUpsertInadimplente = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      codigo_inadim?: string | null
      student_name: string
      guardian1_name?: string | null
      student_escola?: string | null
      meses_inadim?: number | null
      source?: string | null
    }) => {
      const { data, error } = await supabase.rpc('upsert_inadimplente', { payload })
      if (error) throw error
      return data as { id: string; op: 'insert' | 'update' }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inadimplentes'] })
      qc.invalidateQueries({ queryKey: ['inadimplentes-stats'] })
    },
  })
}

export const useSoftDeleteInadimplente = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { id: string; reason: string }) => {
      const { data, error } = await supabase.rpc('soft_delete_inadimplente', { p_id: input.id, p_reason: input.reason })
      if (error) throw error
      return data as boolean
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inadimplentes'] })
      qc.invalidateQueries({ queryKey: ['inadimplentes-stats'] })
    },
  })
}

export const useRestoreInadimplente = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.rpc('restore_inadimplente', { p_id: id })
      if (error) throw error
      return data as boolean
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inadimplentes'] })
      qc.invalidateQueries({ queryKey: ['inadimplentes-stats'] })
    },
  })
}

export const useCsvIngestion = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (params: { rows: Record<string, any>[] }) => {
      const batchId = crypto.randomUUID()
      // Inserir rows no staging
      const stagingRows = params.rows.map((csv_row) => ({
        csv_row,
        batch_id: batchId,
        processed: false,
      }))
      const { error: insErr } = await supabase.from('staging_inadimplentes_raw').insert(stagingRows)
      if (insErr) throw insErr

      // Disparar ingest RPC
      const { data, error } = await supabase.rpc('ingest_inadimplentes_from_staging', { p_batch_id: batchId })
      if (error) throw error
      return data as { inserted_count: number; updated_count: number; error_count: number }[]
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inadimplentes'] })
      qc.invalidateQueries({ queryKey: ['inadimplentes-stats'] })
    },
  })
}
