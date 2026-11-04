import { http, HttpResponse } from 'msw'
import {
  loginRequestSchema,
  registerRequestSchema,
  type AuthResponse,
  type Session,
  type User,
} from '@/api/contracts/auth'
import { db, type SessionRecord } from '../db'
import { hashPassword, randomSalt, type UserRecord } from '../fixtures/users'
import { authFailure, errorResponse, simulateLatency } from '../scenarios'

export const SESSION_TTL_MS = 30 * 60_000

export function toUser(record: UserRecord): User {
  return {
    id: record.id,
    username: record.username,
    name: record.name,
    email: record.email,
    avatarUrl: record.avatarUrl,
  }
}

function bearer(request: Request) {
  const header = request.headers.get('Authorization') ?? ''
  return header.startsWith('Bearer ') ? header.slice(7) : null
}

/**
 * Resolves the authenticated user or the 401 response to return. Every private handler
 * starts with this, so an expired token behaves the same everywhere.
 */
export function authenticate(
  request: Request,
): { user: UserRecord; session: SessionRecord } | { error: Response } {
  const token = bearer(request)
  if (!token) return { error: errorResponse(401, 'UNAUTHENTICATED', 'Faça login para continuar.') }
  const session = db.state.sessions.find((s) => s.token === token)
  if (!session) return { error: errorResponse(401, 'UNAUTHENTICATED', 'Sessão inválida.') }
  if (Date.parse(session.expiresAt) <= Date.now()) {
    return { error: errorResponse(401, 'SESSION_EXPIRED', 'Sua sessão expirou. Entre novamente.') }
  }
  const user = db.state.users.find((u) => u.id === session.userId)
  if (!user) return { error: errorResponse(401, 'UNAUTHENTICATED', 'Sessão inválida.') }
  return { user, session }
}

function startSession(user: UserRecord): AuthResponse {
  const token = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()
  db.update((draft) => {
    draft.sessions.push({ token, userId: user.id, expiresAt })
  })
  return { token, user: toUser(user), expiresAt }
}

async function readJson(request: Request) {
  try {
    return await request.json()
  } catch {
    return undefined
  }
}

function validationError(issues: { path: PropertyKey[]; message: string }[]) {
  const fields: Record<string, string> = {}
  for (const issue of issues) {
    const key = String(issue.path[0] ?? 'form')
    fields[key] ??= issue.message
  }
  return errorResponse(422, 'VALIDATION', 'Revise os campos destacados.', fields)
}

export const authHandlers = [
  http.post('/api/auth/login', async ({ request }) => {
    await simulateLatency()
    const failure = authFailure()
    if (failure) return failure

    const parsed = loginRequestSchema.safeParse(await readJson(request))
    if (!parsed.success) return validationError(parsed.error.issues)

    const user = db.state.users.find((u) => u.email === parsed.data.email)
    // Same message for unknown e-mail and wrong password: no account enumeration
    const hash = user ? await hashPassword(user.salt, parsed.data.password) : null
    if (!user || hash !== user.passwordHash) {
      return errorResponse(401, 'INVALID_CREDENTIALS', 'E-mail ou senha incorretos.')
    }
    return HttpResponse.json<AuthResponse>(startSession(user))
  }),

  http.post('/api/auth/register', async ({ request }) => {
    await simulateLatency()
    const failure = authFailure()
    if (failure) return failure

    const parsed = registerRequestSchema.safeParse(await readJson(request))
    if (!parsed.success) return validationError(parsed.error.issues)
    const { username, email, password } = parsed.data

    const fields: Record<string, string> = {}
    if (db.state.users.some((u) => u.email === email)) {
      fields.email = 'Já existe uma conta com este e-mail.'
    }
    if (db.state.users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
      fields.username = 'Este nome de usuário já está em uso.'
    }
    if (Object.keys(fields).length) {
      return errorResponse(409, 'CONFLICT', 'Já existe uma conta com esses dados.', fields)
    }

    const salt = randomSalt()
    const user: UserRecord = {
      id: `user-${crypto.randomUUID()}`,
      username,
      name: username,
      email,
      avatarUrl: null,
      salt,
      passwordHash: await hashPassword(salt, password),
      createdAt: new Date().toISOString(),
    }
    db.update((draft) => {
      draft.users.push(user)
      draft.favorites[user.id] = []
    })
    return HttpResponse.json<AuthResponse>(startSession(user), { status: 201 })
  }),

  http.get('/api/auth/session', async ({ request }) => {
    await simulateLatency()
    const auth = authenticate(request)
    if ('error' in auth) return auth.error
    return HttpResponse.json<Session>({
      user: toUser(auth.user),
      expiresAt: auth.session.expiresAt,
    })
  }),

  http.post('/api/auth/logout', async ({ request }) => {
    await simulateLatency()
    const token = bearer(request)
    db.update((draft) => {
      const session = draft.sessions.find((s) => s.token === token)
      draft.sessions = draft.sessions.filter((s) => s.token !== token)
      // Signing out also disconnects the simulated wallet
      if (session) delete draft.connections[session.userId]
    })
    return new HttpResponse(null, { status: 204 })
  }),
]
