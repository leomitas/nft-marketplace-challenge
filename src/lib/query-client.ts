import { QueryClient } from '@tanstack/react-query'
import { ApiError } from '@/api/client'

const MAX_RETRIES = 2

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // Only transient failures (network, timeout, 5xx) are retried; 4xx are final answers
      retry: (failureCount, error) =>
        failureCount < MAX_RETRIES && error instanceof ApiError && error.isTransient,
      retryDelay: (attempt) => Math.min(500 * 2 ** attempt, 4_000),
    },
    // Mutations are never retried blindly: repeating them could duplicate side effects
    mutations: { retry: false },
  },
})
