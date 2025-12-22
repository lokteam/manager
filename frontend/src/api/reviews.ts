import { api } from './http'
import type { VacancyReview, VacancyReviewCreate, VacancyReviewUpdate } from './types'

export async function getReviews(): Promise<VacancyReview[]> {
  return api.get<VacancyReview[]>('/reviews')
}

export async function getReview(id: number): Promise<VacancyReview> {
  return api.get<VacancyReview>(`/reviews/${id}`)
}

export async function createReview(data: VacancyReviewCreate): Promise<VacancyReview> {
  return api.post<VacancyReview>('/reviews', data)
}

export async function updateReview(id: number, data: VacancyReviewUpdate): Promise<VacancyReview> {
  return api.patch<VacancyReview>(`/reviews/${id}`, data)
}

export async function deleteReview(id: number): Promise<void> {
  return api.delete(`/reviews/${id}`)
}

