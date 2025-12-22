import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  telegramApi,
  type TelegramFetchRequest,
  type TelegramFetchMessagesRequest,
  type TelegramFolderAddRemoveRequest,
  type TelegramFolderCreateRequest,
} from '@/api'
import { useToast } from '@/components/ui'
import { HttpError } from '@/api/http'

export function useTelegramFolders() {
  return useQuery({
    queryKey: ['telegramFolders'],
    queryFn: telegramApi.getTelegramFolders,
  })
}

export function useFetchAll() {
  const { success, error } = useToast()

  return useMutation({
    mutationFn: (data: TelegramFetchRequest = {}) => telegramApi.fetchAll(data),
    onSuccess: () => {
      success('Messages synced successfully')
    },
    onError: (err) => {
      error(err instanceof HttpError ? err.message : 'Failed to sync messages')
    },
  })
}

export function useFetchChats() {
  const queryClient = useQueryClient()
  const { success, error } = useToast()

  return useMutation({
    mutationFn: telegramApi.fetchChats,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dialogs'] })
      success('Chats synced successfully')
    },
    onError: (err) => {
      error(err instanceof HttpError ? err.message : 'Failed to sync chats')
    },
  })
}

export function useFetchMessages() {
  const { success, error } = useToast()

  return useMutation({
    mutationFn: (data: TelegramFetchMessagesRequest) => telegramApi.fetchMessages(data),
    onSuccess: () => {
      success('Messages fetched successfully')
    },
    onError: (err) => {
      error(err instanceof HttpError ? err.message : 'Failed to fetch messages')
    },
  })
}

export function useAddChatToFolder() {
  const { success, error } = useToast()

  return useMutation({
    mutationFn: (data: TelegramFolderAddRemoveRequest) => telegramApi.addChatToFolder(data),
    onSuccess: () => {
      success('Chat added to folder')
    },
    onError: (err) => {
      error(err instanceof HttpError ? err.message : 'Failed to add chat to folder')
    },
  })
}

export function useRemoveChatFromFolder() {
  const { success, error } = useToast()

  return useMutation({
    mutationFn: (data: TelegramFolderAddRemoveRequest) => telegramApi.removeChatFromFolder(data),
    onSuccess: () => {
      success('Chat removed from folder')
    },
    onError: (err) => {
      error(err instanceof HttpError ? err.message : 'Failed to remove chat from folder')
    },
  })
}

export function useCreateTelegramFolder() {
  const queryClient = useQueryClient()
  const { success, error } = useToast()

  return useMutation({
    mutationFn: (data: TelegramFolderCreateRequest) => telegramApi.createTelegramFolder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['telegramFolders'] })
      success('Telegram folder created')
    },
    onError: (err) => {
      error(err instanceof HttpError ? err.message : 'Failed to create Telegram folder')
    },
  })
}

export function useDeleteTelegramFolder() {
  const queryClient = useQueryClient()
  const { success, error } = useToast()

  return useMutation({
    mutationFn: (folderId: number) => telegramApi.deleteTelegramFolder(folderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['telegramFolders'] })
      success('Telegram folder deleted')
    },
    onError: (err) => {
      error(err instanceof HttpError ? err.message : 'Failed to delete Telegram folder')
    },
  })
}

