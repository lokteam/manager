import { api } from './http'
import type { Folder, FolderCreate, FolderUpdate } from './types'

export async function getFolders(): Promise<Folder[]> {
  return api.get<Folder[]>('/folders')
}

export async function getFolder(id: number): Promise<Folder> {
  return api.get<Folder>(`/folders/${id}`)
}

export async function createFolder(data: FolderCreate): Promise<Folder> {
  return api.post<Folder>('/folders', data)
}

export async function updateFolder(id: number, data: FolderUpdate): Promise<Folder> {
  return api.patch<Folder>(`/folders/${id}`, data)
}

export async function deleteFolder(id: number): Promise<void> {
  return api.delete(`/folders/${id}`)
}

