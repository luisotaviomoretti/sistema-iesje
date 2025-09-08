import { useMutation, useQueryClient } from '@tanstack/react-query'
import { EnrollmentApiService } from '../../services/api/enrollment'
import type { EnrollmentRecord } from '@/types/database'

export function useUpdateAdminEnrollment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<EnrollmentRecord> }) =>
      EnrollmentApiService.updateAdminEnrollment(id, patch as any),
    onSuccess: (data) => {
      // Invalidate list and specific item
      queryClient.invalidateQueries({ queryKey: ['admin-enrollments'] })
      if (data?.id) {
        queryClient.invalidateQueries({ queryKey: ['admin-enrollment', data.id] })
      }
    },
  })
}

export function useSoftDeleteEnrollment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => EnrollmentApiService.softDeleteEnrollment(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['admin-enrollments'] })
      queryClient.invalidateQueries({ queryKey: ['admin-enrollment', id] })
    },
  })
}

export function useRestoreEnrollment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status = 'draft' as const }: { id: string; status?: 'draft' | 'submitted' }) =>
      EnrollmentApiService.restoreEnrollment(id, status),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-enrollments'] })
      queryClient.invalidateQueries({ queryKey: ['admin-enrollment', id] })
    },
  })
}

export function useAdminStats() {
  const queryClient = useQueryClient()
  return {
    fetch: () => EnrollmentApiService.getAdminStats(),
    refetchList: () => queryClient.invalidateQueries({ queryKey: ['admin-enrollments'] }),
  }
}

