import axios, { isAxiosError } from 'axios'
import { apiErrorSchema } from './contracts/common'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  timeout: 10_000,
  // Arrays go as repeated keys (?collections=a&collections=b), which is what the API reads
  paramsSerializer: { indexes: null },
})

export type ApiErrorKind = 'network' | 'timeout' | 'canceled' | 'http'

/** Normalized error so the UI never has to inspect Axios internals. */
export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly status?: number
  readonly code?: string
  readonly fields?: Record<string, string>

  constructor(
    message: string,
    opts: { kind: ApiErrorKind; status?: number; code?: string; fields?: Record<string, string> },
  ) {
    super(message)
    this.name = 'ApiError'
    this.kind = opts.kind
    this.status = opts.status
    this.code = opts.code
    this.fields = opts.fields
  }

  /** Worth retrying automatically: connection problems and 5xx, never 4xx. */
  get isTransient() {
    return this.kind === 'network' || this.kind === 'timeout' || (this.status ?? 0) >= 500
  }
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error
  if (!isAxiosError(error)) {
    return new ApiError(error instanceof Error ? error.message : 'Erro inesperado', {
      kind: 'http',
    })
  }
  if (error.code === 'ERR_CANCELED')
    return new ApiError('Requisição cancelada', { kind: 'canceled' })
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    return new ApiError('O servidor demorou para responder.', { kind: 'timeout' })
  }
  if (!error.response) {
    return new ApiError('Sem conexão com o servidor.', { kind: 'network' })
  }
  const body = apiErrorSchema.safeParse(error.response.data)
  return new ApiError(
    body.success ? body.data.error.message : 'Erro ao comunicar com o servidor.',
    {
      kind: 'http',
      status: error.response.status,
      code: body.success ? body.data.error.code : undefined,
      fields: body.success ? body.data.error.fields : undefined,
    },
  )
}

api.interceptors.response.use(undefined, (error) => Promise.reject(toApiError(error)))
