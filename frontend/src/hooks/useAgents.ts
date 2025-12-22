import { useMutation, useQueryClient } from '@tanstack/react-query'
import { agentsApi, type AgentReviewRequest } from '@/api'
import { useToast } from '@/components/ui'
import { HttpError } from '@/api/http'

export function useRunAgentReview() {
  const queryClient = useQueryClient()
  const { success, error } = useToast()

  return useMutation({
    mutationFn: (data: AgentReviewRequest = {}) => agentsApi.runAgentReview(data),
    onSuccess: () => {
      // Invalidate reviews and progress as the agent creates new records
      queryClient.invalidateQueries({ queryKey: ['reviews'] })
      queryClient.invalidateQueries({ queryKey: ['progress'] })
      success('Agent review completed successfully')
    },
    onError: (err) => {
      error(err instanceof HttpError ? err.message : 'Agent review failed')
    },
  })
}

