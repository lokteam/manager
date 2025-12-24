import { api } from './http'
import type { TelegramAccount, TelegramAccountCreate, TelegramAccountUpdate, TelegramAccountConfirm } from './types'

export async function getAccounts(): Promise<TelegramAccount[]> {
  return api.get<TelegramAccount[]>('/accounts')
}

export async function getAccount(id: number): Promise<TelegramAccount> {
  return api.get<TelegramAccount>(`/accounts/${id}`)
}

export async function createAccount(data: TelegramAccountCreate): Promise<{ status: string; message: string }> {
  return api.post<{ status: string; message: string }>('/accounts', data)
}

export async function confirmAccount(data: TelegramAccountConfirm): Promise<TelegramAccount> {
  return api.post<TelegramAccount>('/accounts/confirm', data)
}

export async function updateAccount(id: number, data: TelegramAccountUpdate): Promise<TelegramAccount> {
  return api.patch<TelegramAccount>(`/accounts/${id}`, data)
}

export async function deleteAccount(id: number): Promise<void> {
  return api.delete(`/accounts/${id}`)
}

