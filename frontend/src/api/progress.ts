import { api } from './http'
import type { VacancyProgress, VacancyProgressCreate, VacancyProgressUpdate } from './types'

export async function getProgressList(): Promise<VacancyProgress[]> {
  return api.get<VacancyProgress[]>('/progress')
}

export async function getProgress(id: number): Promise<VacancyProgress> {
  return api.get<VacancyProgress>(`/progress/${id}`)
}

export async function createProgress(data: VacancyProgressCreate): Promise<VacancyProgress> {
  return api.post<VacancyProgress>('/progress', data)
}

export async function updateProgress(id: number, data: VacancyProgressUpdate): Promise<VacancyProgress> {
  return api.patch<VacancyProgress>(`/progress/${id}`, data)
}

export async function deleteProgress(id: number): Promise<void> {
  return api.delete(`/progress/${id}`)
}

