import { http, HttpResponse } from 'msw'
import type { User } from '@/api/contracts/auth'
import {
  avatarSchema,
  passwordChangeSchema,
  profileUpdateSchema,
  walletInputSchema,
} from '@/api/contracts/profile'
import { walletRoleSchema, type Wallet } from '@/api/contracts/wallets'
import { db } from '../db'
import { hashPassword, randomSalt } from '../fixtures/users'
import { errorResponse, simulateLatency } from '../scenarios'
import { authenticate, toUser } from './auth'

async function readJson(request: Request) {
  try {
    return await request.json()
  } catch {
    return undefined
  }
}

function fieldErrors(issues: { path: PropertyKey[]; message: string }[], field?: string) {
  const fields: Record<string, string> = {}
  for (const issue of issues) fields[field ?? String(issue.path.at(-1) ?? 'form')] ??= issue.message
  return errorResponse(422, 'VALIDATION', 'Revise os campos destacados.', fields)
}

function updateUser(userId: string, patch: Partial<(typeof db.state.users)[number]>) {
  db.update((draft) => {
    const user = draft.users.find((u) => u.id === userId)
    if (user) Object.assign(user, patch)
  })
  const user = db.state.users.find((u) => u.id === userId)
  return toUser(user!)
}

export const profileHandlers = [
  http.get('/api/me/profile', async ({ request }) => {
    await simulateLatency()
    const auth = authenticate(request)
    if ('error' in auth) return auth.error
    return HttpResponse.json<User>(toUser(auth.user))
  }),

  http.patch('/api/me/profile', async ({ request }) => {
    await simulateLatency()
    const auth = authenticate(request)
    if ('error' in auth) return auth.error
    const parsed = profileUpdateSchema.safeParse(await readJson(request))
    if (!parsed.success) return fieldErrors(parsed.error.issues)
    const { name, username, email } = parsed.data

    const others = db.state.users.filter((u) => u.id !== auth.user.id)
    const fields: Record<string, string> = {}
    if (others.some((u) => u.email === email)) fields.email = 'Já existe uma conta com este e-mail.'
    if (others.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
      fields.username = 'Este nome de usuário já está em uso.'
    }
    if (Object.keys(fields).length) {
      return errorResponse(409, 'CONFLICT', 'Já existe uma conta com esses dados.', fields)
    }
    return HttpResponse.json<User>(updateUser(auth.user.id, { name, username, email }))
  }),

  http.put('/api/me/avatar', async ({ request }) => {
    await simulateLatency()
    const auth = authenticate(request)
    if ('error' in auth) return auth.error
    const parsed = avatarSchema.safeParse(await readJson(request))
    if (!parsed.success) return fieldErrors(parsed.error.issues, 'avatar')
    return HttpResponse.json<User>(updateUser(auth.user.id, { avatarUrl: parsed.data.dataUrl }))
  }),

  http.delete('/api/me/avatar', async ({ request }) => {
    await simulateLatency()
    const auth = authenticate(request)
    if ('error' in auth) return auth.error
    return HttpResponse.json<User>(updateUser(auth.user.id, { avatarUrl: null }))
  }),

  http.post('/api/me/password', async ({ request }) => {
    await simulateLatency()
    const auth = authenticate(request)
    if ('error' in auth) return auth.error
    const parsed = passwordChangeSchema.safeParse(await readJson(request))
    if (!parsed.success) return fieldErrors(parsed.error.issues)
    const current = await hashPassword(auth.user.salt, parsed.data.currentPassword)
    if (current !== auth.user.passwordHash) {
      return errorResponse(422, 'INVALID_PASSWORD', 'Senha atual incorreta.', {
        currentPassword: 'Senha atual incorreta.',
      })
    }
    // Only a new salted hash is stored, never the password itself
    const salt = randomSalt()
    updateUser(auth.user.id, {
      salt,
      passwordHash: await hashPassword(salt, parsed.data.newPassword),
    })
    return new HttpResponse(null, { status: 204 })
  }),

  // Creates or updates the primary/secondary wallet (one of each per user)
  http.put('/api/me/wallets/:role', async ({ request, params }) => {
    await simulateLatency()
    const auth = authenticate(request)
    if ('error' in auth) return auth.error
    const role = walletRoleSchema.safeParse(params.role)
    if (!role.success) return errorResponse(404, 'NOT_FOUND', 'Tipo de carteira inexistente.')
    const parsed = walletInputSchema.safeParse(await readJson(request))
    if (!parsed.success) return fieldErrors(parsed.error.issues)

    const mine = db.state.wallets.filter((w) => w.userId === auth.user.id)
    const address = parsed.data.address.toLowerCase()
    if (mine.some((w) => w.role !== role.data && w.address.toLowerCase() === address)) {
      return errorResponse(409, 'CONFLICT', 'Este endereço já está na sua outra carteira.', {
        address: 'Este endereço já está na sua outra carteira.',
      })
    }
    const wallet: Wallet = {
      id: mine.find((w) => w.role === role.data)?.id ?? `wallet-${crypto.randomUUID()}`,
      role: role.data,
      ...parsed.data,
      ens: parsed.data.ens || null,
      updatedAt: new Date().toISOString(),
    }
    db.update((draft) => {
      draft.wallets = draft.wallets.filter((w) => w.id !== wallet.id)
      draft.wallets.push({ ...wallet, userId: auth.user.id })
      // A checkout connection made with the old wallet data is no longer valid
      if (draft.connections[auth.user.id]?.walletId === wallet.id) {
        delete draft.connections[auth.user.id]
      }
    })
    return HttpResponse.json<Wallet>(wallet)
  }),
]
