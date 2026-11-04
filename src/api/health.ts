import { api } from './client'

export type HealthResponse = { status: 'ok'; mocked: boolean }

export async function getHealth(signal?: AbortSignal) {
  const { data } = await api.get<HealthResponse>('/health', { signal })
  return data
}
