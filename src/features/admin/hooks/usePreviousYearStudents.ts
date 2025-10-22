import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface PreviousYearStudentAdminRow {
  id: string
  student_name: string
  student_escola: 'pelicano' | 'sete_setembro' | string
  series_name: string
  track_name: string
  total_discount_percentage: number | null
  discount_code: string | null
  has_enrollment: boolean
  enrollment_status: 'submitted' | 'approved' | string | null
  enrollment_id: string | null
  enrollment_discount_percentage: number | null
  enrollment_created_at: string | null
  total_count?: number
}

export function usePreviousYearStudentsAdminList(params: {
  page?: number
  pageSize?: number
  escola?: 'pelicano' | 'sete_setembro'
  hasEnrollment?: boolean | null
  nameQuery?: string
} = {}) {
  const normalized = useMemo(() => ({
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 20,
    escola: params.escola,
    hasEnrollment: typeof params.hasEnrollment === 'boolean' ? params.hasEnrollment : null,
    nameQuery: params.nameQuery?.trim() || null,
  }), [params])

  return useQuery<{ rows: PreviousYearStudentAdminRow[]; count: number }>({
    queryKey: ['admin-previous-year-students', normalized],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_list_previous_year_students', {
        p_escola: normalized.escola ?? null,
        p_has_enrollment: normalized.hasEnrollment === null ? null : (normalized.hasEnrollment ? 'true' : 'false'),
        p_name_query: normalized.nameQuery ?? null,
        p_limit: normalized.pageSize,
        p_offset: (normalized.page - 1) * normalized.pageSize,
      })
      if (error) throw error
      const rows = (data as unknown as PreviousYearStudentAdminRow[]) || []
      const count = rows.length > 0 ? Number((rows[0] as any).total_count || 0) : 0
      return { rows, count }
    },
    keepPreviousData: true,
    staleTime: 15_000,
  })
}
