import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { progressApi, type VacancyProgressUpdate } from '@/api'
import { useToast } from '@/components/ui'
import { HttpError } from '@/api/http'

export function useProgressList() {
  return useQuery({
    queryKey: ['progress'],
    queryFn: progressApi.getProgressList,
  })
}

export function useProgress(id: number) {
  return useQuery({
    queryKey: ['progress', id],
    queryFn: () => progressApi.getProgress(id),
    enabled: !!id,
  })
}

export function useUpdateProgress() {
  const queryClient = useQueryClient()
  const { success, error } = useToast()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: VacancyProgressUpdate }) =>
      progressApi.updateProgress(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['progress'] })
      success('Progress updated')
    },
    onError: (err) => {
      error(err instanceof HttpError ? err.message : 'Failed to update progress')
    },
  })
}

export function useDeleteProgress() {
  const queryClient = useQueryClient()
  const { success, error } = useToast()

  return useMutation({
    mutationFn: (id: number) => progressApi.deleteProgress(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['progress'] })
      success('Progress deleted')
    },
    onError: (err) => {
      error(err instanceof HttpError ? err.message : 'Failed to delete progress')
    },
  })
}

