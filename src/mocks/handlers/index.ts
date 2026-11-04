import { http, HttpResponse } from 'msw'
import type { HealthResponse } from '@/api/health'

export const handlers = [
  http.get('/api/health', () => HttpResponse.json<HealthResponse>({ status: 'ok', mocked: true })),
]
