import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { dialogsApi, type DialogUpdate } from '@/api'
import { useToast } from '@/components/ui'
import { HttpError } from '@/api/http'

export function useDialogs() {
  return useQuery({
    queryKey: ['dialogs'],
    queryFn: dialogsApi.getDialogs,
  })
}

export function useDialog(accountId: number, id: number) {
  return useQuery({
    queryKey: ['dialogs', accountId, id],
    queryFn: () => dialogsApi.getDialog(accountId, id),
    enabled: !!accountId && !!id,
  })
}

export function useUpdateDialog() {
  const queryClient = useQueryClient()
  const { success, error } = useToast()

  return useMutation({
    mutationFn: ({
      accountId,
      id,
      data,
    }: {
      accountId: number
      id: number
      data: DialogUpdate
    }) => dialogsApi.updateDialog(accountId, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dialogs'] })
      success('Dialog updated successfully')
    },
    onError: (err) => {
      error(err instanceof HttpError ? err.message : 'Failed to update dialog')
    },
  })
}

export function useDeleteDialog() {
  const queryClient = useQueryClient()
  const { success, error } = useToast()

  return useMutation({
    mutationFn: ({ accountId, id }: { accountId: number; id: number }) =>
      dialogsApi.deleteDialog(accountId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dialogs'] })
      success('Dialog deleted successfully')
    },
    onError: (err) => {
      error(err instanceof HttpError ? err.message : 'Failed to delete dialog')
    },
  })
}

