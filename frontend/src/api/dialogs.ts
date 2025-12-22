import { api } from './http'
import type { Dialog, DialogUpdate } from './types'

export async function getDialogs(): Promise<Dialog[]> {
  return api.get<Dialog[]>('/dialogs')
}

export async function getDialog(accountId: number, id: number): Promise<Dialog> {
  return api.get<Dialog>(`/dialogs/${accountId}/${id}`)
}

export async function updateDialog(accountId: number, id: number, data: DialogUpdate): Promise<Dialog> {
  return api.patch<Dialog>(`/dialogs/${accountId}/${id}`, data)
}

export async function deleteDialog(accountId: number, id: number): Promise<void> {
  return api.delete(`/dialogs/${accountId}/${id}`)
}

