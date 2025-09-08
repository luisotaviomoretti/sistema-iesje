import { useQuery } from '@tanstack/react-query'
import { EnrollmentApiService } from '../services/api/enrollment'
import type { EnrollmentRecord } from '@/types/database'

export function useRecentEnrollments(limit: number = 50) {
  return useQuery<EnrollmentRecord[]>({
    queryKey: ['recent-enrollments', limit],
    queryFn: () => EnrollmentApiService.getRecentEnrollmentsWithDetails(limit),
    refetchInterval: 30000, // 30s
    staleTime: 15000,
  })
}

