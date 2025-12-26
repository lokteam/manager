import { api } from './http'
import type { AgentReviewRequest } from './types'

export async function runAgentReview(data: AgentReviewRequest): Promise<void> {
  return api.post('/agents/review', data)
}

