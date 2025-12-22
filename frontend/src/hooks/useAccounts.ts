import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { accountsApi, type TelegramAccountCreate, type TelegramAccountUpdate } from '@/api'
import { useToast } from '@/components/ui'
import { HttpError } from '@/api/http'

export function useAccounts() {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: accountsApi.getAccounts,
  })
}

export function useAccount(id: number) {
  return useQuery({
    queryKey: ['accounts', id],
    queryFn: () => accountsApi.getAccount(id),
    enabled: !!id,
  })
}

export function useCreateAccount() {
  const queryClient = useQueryClient()
  const { success, error } = useToast()

  return useMutation({
    mutationFn: (data: TelegramAccountCreate) => accountsApi.createAccount(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      success('Account created successfully')
    },
    onError: (err) => {
      error(err instanceof HttpError ? err.message : 'Failed to create account')
    },
  })
}

export function useUpdateAccount() {
  const queryClient = useQueryClient()
  const { success, error } = useToast()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: TelegramAccountUpdate }) =>
      accountsApi.updateAccount(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      success('Account updated successfully')
    },
    onError: (err) => {
      error(err instanceof HttpError ? err.message : 'Failed to update account')
    },
  })
}

export function useDeleteAccount() {
  const queryClient = useQueryClient()
  const { success, error } = useToast()

  return useMutation({
    mutationFn: (id: number) => accountsApi.deleteAccount(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      success('Account deleted successfully')
    },
    onError: (err) => {
      error(err instanceof HttpError ? err.message : 'Failed to delete account')
    },
  })
}

