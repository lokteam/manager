import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { promptsApi, type PromptUpdate } from '@/api/prompts'
import { useToast } from '@/components/ui'
import { HttpError } from '@/api/http'

export function usePrompts() {
  return useQuery({
    queryKey: ['prompts'],
    queryFn: promptsApi.getPrompts,
  })
}

export function usePrompt(id: number | null) {
  return useQuery({
    queryKey: ['prompts', id],
    queryFn: () => (id ? promptsApi.getPrompt(id) : Promise.resolve(null)),
    enabled: !!id,
  })
}

export function useCreatePrompt() {
  const queryClient = useQueryClient()
  const { success, error } = useToast()

  return useMutation({
    mutationFn: promptsApi.createPrompt,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompts'] })
      success('Prompt created successfully')
    },
    onError: (err) => {
      error(err instanceof HttpError ? err.message : 'Failed to create prompt')
    },
  })
}

export function useUpdatePrompt() {
  const queryClient = useQueryClient()
  const { success, error } = useToast()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: PromptUpdate }) =>
      promptsApi.updatePrompt(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompts'] })
      success('Prompt updated successfully')
    },
    onError: (err) => {
      error(err instanceof HttpError ? err.message : 'Failed to update prompt')
    },
  })
}

export function useDeletePrompt() {
  const queryClient = useQueryClient()
  const { success, error } = useToast()

  return useMutation({
    mutationFn: promptsApi.deletePrompt,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompts'] })
      success('Prompt deleted successfully')
    },
    onError: (err) => {
      error(err instanceof HttpError ? err.message : 'Failed to delete prompt')
    },
  })
}

export function useTrashPrompts() {
  return useQuery({
    queryKey: ['prompts', 'trash'],
    queryFn: promptsApi.getTrashPrompts,
  })
}

export function usePromptHistory(id: number | null) {
  return useQuery({
    queryKey: ['prompts', id, 'history'],
    queryFn: () => (id ? promptsApi.getPromptHistory(id) : Promise.resolve([])),
    enabled: !!id,
  })
}

export function useRestorePrompt() {
  const queryClient = useQueryClient()
  const { success, error } = useToast()

  return useMutation({
    mutationFn: promptsApi.restorePrompt,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompts'] })
      success('Prompt restored successfully')
    },
    onError: (err) => {
      error(err instanceof HttpError ? err.message : 'Failed to restore prompt')
    },
  })
}
