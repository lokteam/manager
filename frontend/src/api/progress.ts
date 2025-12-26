import { api } from './http'
import type { VacancyProgress, VacancyReview, VacancyProgressCreate, VacancyProgressUpdate } from './types'

export interface VacancyProgressWithReview extends VacancyProgress {
  review: VacancyReview
}

export async function getProgressList(): Promise<VacancyProgressWithReview[]> {
  return api.get<VacancyProgressWithReview[]>('/progress')
}

export async function getProgress(id: number): Promise<VacancyProgressWithReview> {
  return api.get<VacancyProgressWithReview>(`/progress/${id}`)
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

