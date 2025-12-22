import { api } from './http'
import type {
  TelegramFetchRequest,
  TelegramFetchChatsRequest,
  TelegramFetchMessagesRequest,
  TelegramFolderAddRemoveRequest,
  TelegramFolderCreateRequest,
  TelegramFolder,
} from './types'

export async function fetchAll(data: TelegramFetchRequest = {}): Promise<void> {
  return api.post('/telegram/fetch', data)
}

export async function fetchChats(data: TelegramFetchChatsRequest = {}): Promise<void> {
  return api.post('/telegram/fetch-chats', data)
}

export async function fetchMessages(data: TelegramFetchMessagesRequest): Promise<void> {
  return api.post('/telegram/fetch-messages', data)
}

export async function getTelegramFolders(): Promise<TelegramFolder[]> {
  return api.get<TelegramFolder[]>('/telegram/folders')
}

export async function addChatToFolder(data: TelegramFolderAddRemoveRequest): Promise<void> {
  return api.post('/telegram/folder/add', data)
}

export async function removeChatFromFolder(data: TelegramFolderAddRemoveRequest): Promise<void> {
  return api.post('/telegram/folder/remove', data)
}

export async function createTelegramFolder(data: TelegramFolderCreateRequest): Promise<TelegramFolder> {
  return api.post<TelegramFolder>('/telegram/folder/create', data)
}

export async function deleteTelegramFolder(folderId: number): Promise<void> {
  return api.delete(`/telegram/folder/${folderId}`)
}

