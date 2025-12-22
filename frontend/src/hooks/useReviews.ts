import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { reviewsApi, type VacancyReviewUpdate } from '@/api'
import { useToast } from '@/components/ui'
import { HttpError } from '@/api/http'

export function useReviews() {
  return useQuery({
    queryKey: ['reviews'],
    queryFn: reviewsApi.getReviews,
  })
}

export function useReview(id: number) {
  return useQuery({
    queryKey: ['reviews', id],
    queryFn: () => reviewsApi.getReview(id),
    enabled: !!id,
  })
}

export function useUpdateReview() {
  const queryClient = useQueryClient()
  const { success, error } = useToast()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: VacancyReviewUpdate }) =>
      reviewsApi.updateReview(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] })
      success('Review updated successfully')
    },
    onError: (err) => {
      error(err instanceof HttpError ? err.message : 'Failed to update review')
    },
  })
}

export function useDeleteReview() {
  const queryClient = useQueryClient()
  const { success, error } = useToast()

  return useMutation({
    mutationFn: (id: number) => reviewsApi.deleteReview(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] })
      queryClient.invalidateQueries({ queryKey: ['progress'] })
      success('Review deleted successfully')
    },
    onError: (err) => {
      error(err instanceof HttpError ? err.message : 'Failed to delete review')
    },
  })
}

