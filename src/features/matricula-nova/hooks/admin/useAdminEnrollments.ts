import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { EnrollmentApiService } from '../../services/api/enrollment'
import type { EnrollmentRecord } from '@/types/database'

export interface AdminEnrollmentFilters {
  includeDeleted?: boolean
  status?: Array<'draft' | 'submitted' | 'approved' | 'rejected' | 'deleted'>
  escola?: 'pelicano' | 'sete_setembro'
  seriesId?: string
  dateFrom?: string
  dateTo?: string
  search?: string
  orderBy?: 'created_at' | 'student_name' | 'final_monthly_value'
  orderDir?: 'asc' | 'desc'
  origin?: 'novo_aluno' | 'rematricula' | 'null'
}

export function useAdminEnrollments(
  params: { page?: number; pageSize?: number } & AdminEnrollmentFilters = {}
) {
  const normalized = useMemo(() => ({
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 20,
    includeDeleted: params.includeDeleted ?? false,
    status: params.status,
    escola: params.escola,
    seriesId: params.seriesId,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    search: params.search?.trim() || undefined,
    orderBy: params.orderBy ?? 'created_at',
    orderDir: params.orderDir ?? 'desc',
    origin: params.origin,
  }), [params])

  return useQuery<{ data: EnrollmentRecord[]; count: number }>({
    queryKey: ['admin-enrollments', normalized],
    queryFn: () => EnrollmentApiService.listAdminEnrollments(normalized),
    keepPreviousData: true,
    staleTime: 15_000,
  })
}
