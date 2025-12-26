import { api } from './http'

export interface Prompt {
  id: number
  version: number
  user_id: number
  name: string
  description: string | null
  content: string
  is_deleted: boolean
  created_at: string
}

export interface PromptCreate {
  name: string
  description: string | null
  content: string
}

export interface PromptUpdate {
  name?: string
  description?: string | null
  content?: string
}

export const promptsApi = {
  getPrompts: () => api.get<Prompt[]>('/prompts'),
  getTrashPrompts: () => api.get<Prompt[]>('/prompts/trash'),
  getPrompt: (id: number) => api.get<Prompt>(`/prompts/${id}`),
  getPromptHistory: (id: number) => api.get<Prompt[]>(`/prompts/${id}/history`),
  createPrompt: (data: PromptCreate) => api.post<Prompt>('/prompts', data),
  updatePrompt: (id: number, data: PromptUpdate) => api.patch<Prompt>(`/prompts/${id}`, data),
  deletePrompt: (id: number) => api.delete(`/prompts/${id}`),
  restorePrompt: (id: number) => api.post(`/prompts/${id}/restore`),
}
