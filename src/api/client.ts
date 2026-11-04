import axios, { isAxiosError } from 'axios'
import { apiErrorSchema } from './contracts/common'
import { tokenStore } from './token-store'

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

  /** The request carried a session that the server no longer accepts. */
  get isSessionLost() {
    return (
      this.status === 401 && (this.code === 'SESSION_EXPIRED' || this.code === 'UNAUTHENTICATED')
    )
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

api.interceptors.request.use((config) => {
  const token = tokenStore.get()
  if (token) config.headers.set('Authorization', `Bearer ${token}`)
  return config
})

type SessionLostHandler = (reason: 'expired' | 'invalid') => void
let onSessionLost: SessionLostHandler | null = null

/** The auth feature registers what to do when an authenticated call gets a 401. */
export function setSessionLostHandler(handler: SessionLostHandler | null) {
  onSessionLost = handler
}

api.interceptors.response.use(undefined, (error) => {
  const apiError = toApiError(error)
  // Only calls made with a token can "lose" a session; a failed login is just a 401
  const headers = isAxiosError(error) ? error.config?.headers : undefined
  const sentToken = Boolean(headers?.Authorization) && !headers?.['X-Session-Probe']
  if (apiError.isSessionLost && sentToken) {
    onSessionLost?.(apiError.code === 'SESSION_EXPIRED' ? 'expired' : 'invalid')
  }
  return Promise.reject(apiError)
})
