/**
 * Fictitious accounts. Passwords are stored only as salted SHA-256 hashes; the plain values
 * live in the README for evaluators (both use `Kurio@2026`).
 */
export type UserRecord = {
  id: string
  username: string
  name: string
  email: string
  avatarUrl: string | null
  salt: string
  passwordHash: string
  createdAt: string
}

export function createUserFixtures(): UserRecord[] {
  return [
    {
      id: 'user-ana',
      username: 'ana.souza',
      name: 'Ana Souza',
      email: 'ana@kurio.dev',
      avatarUrl: null,
      salt: 'a1f3c9e27b5d4086',
      passwordHash: '920d3965a0814b04d013f2f154a36c6b6dc300c1d7d70e6ceff2fd7282ccd14a',
      createdAt: '2026-08-14T10:00:00.000Z',
    },
    {
      id: 'user-bruno',
      username: 'bruno.lima',
      name: 'Bruno Lima',
      email: 'bruno@kurio.dev',
      avatarUrl: null,
      salt: '7e2d91b0c4a8f513',
      passwordHash: '31c96fe6ced4457a28a5fcede9b2d26d380b26d8e4aab9f5c7f05d8e23337782',
      createdAt: '2026-09-02T15:30:00.000Z',
    },
  ]
}

/** Ana starts with two favorites so the list is not empty on first login. */
export function createFavoriteFixtures(): Record<string, string[]> {
  return { 'user-ana': ['sage-nomad-009', 'ivory-baron-088'], 'user-bruno': [] }
}

export async function hashPassword(salt: string, password: string) {
  const bytes = new TextEncoder().encode(`${salt}:${password}`)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function randomSalt() {
  const bytes = crypto.getRandomValues(new Uint8Array(8))
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
}
