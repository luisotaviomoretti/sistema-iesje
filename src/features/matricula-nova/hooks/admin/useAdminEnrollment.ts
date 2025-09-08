import { useQuery } from '@tanstack/react-query'
import { EnrollmentApiService } from '../../services/api/enrollment'
import type { EnrollmentRecord } from '@/types/database'

export function useAdminEnrollment(id?: string) {
  return useQuery<EnrollmentRecord | null>({
    queryKey: ['admin-enrollment', id],
    queryFn: () => EnrollmentApiService.getAdminEnrollmentById(id as string),
    enabled: !!id,
    staleTime: 15_000,
  })
}

