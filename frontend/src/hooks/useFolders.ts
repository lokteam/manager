import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { foldersApi, type FolderCreate, type FolderUpdate } from '@/api'
import { useToast } from '@/components/ui'
import { HttpError } from '@/api/http'

export function useFolders() {
  return useQuery({
    queryKey: ['folders'],
    queryFn: foldersApi.getFolders,
  })
}

export function useFolder(id: number) {
  return useQuery({
    queryKey: ['folders', id],
    queryFn: () => foldersApi.getFolder(id),
    enabled: !!id,
  })
}

export function useCreateFolder() {
  const queryClient = useQueryClient()
  const { success, error } = useToast()

  return useMutation({
    mutationFn: (data: FolderCreate) => foldersApi.createFolder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] })
      success('Folder created successfully')
    },
    onError: (err) => {
      error(err instanceof HttpError ? err.message : 'Failed to create folder')
    },
  })
}

export function useUpdateFolder() {
  const queryClient = useQueryClient()
  const { success, error } = useToast()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: FolderUpdate }) =>
      foldersApi.updateFolder(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] })
      success('Folder updated successfully')
    },
    onError: (err) => {
      error(err instanceof HttpError ? err.message : 'Failed to update folder')
    },
  })
}

export function useDeleteFolder() {
  const queryClient = useQueryClient()
  const { success, error } = useToast()

  return useMutation({
    mutationFn: (id: number) => foldersApi.deleteFolder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] })
      success('Folder deleted successfully')
    },
    onError: (err) => {
      error(err instanceof HttpError ? err.message : 'Failed to delete folder')
    },
  })
}

