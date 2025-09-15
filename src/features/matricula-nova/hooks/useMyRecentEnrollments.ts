import { useQuery } from '@tanstack/react-query'
import { EnrollmentApiService } from '../services/api/enrollment'
import type { EnrollmentRecord } from '@/types/database'
import { useCurrentUser } from '@/features/enrollment/hooks/useCurrentUser'

export function useMyRecentEnrollments(limit: number = 50) {
  const currentUser = useCurrentUser()

  return useQuery<EnrollmentRecord[]>({
    queryKey: ['my-recent-enrollments', currentUser.id, limit],
    queryFn: () => EnrollmentApiService.getMyRecentEnrollmentsWithDetails(limit, currentUser),
    enabled: !!currentUser.id,
    refetchInterval: 30000, // 30s
    staleTime: 15000,
  })
}

