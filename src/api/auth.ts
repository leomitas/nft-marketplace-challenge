import { api } from './client'
import {
  authResponseSchema,
  favoritesSchema,
  favoriteToggleSchema,
  sessionSchema,
  type LoginRequest,
  type RegisterRequest,
} from './contracts/auth'

export async function login(body: LoginRequest) {
  const { data } = await api.post('/auth/login', body)
  return authResponseSchema.parse(data)
}

export async function register(body: RegisterRequest) {
  const { data } = await api.post('/auth/register', body)
  return authResponseSchema.parse(data)
}

export async function getSession(signal?: AbortSignal) {
  // Probe header: an expired token found at boot is dropped quietly, without redirecting
  const { data } = await api.get('/auth/session', { signal, headers: { 'X-Session-Probe': '1' } })
  return sessionSchema.parse(data)
}

export async function logout() {
  await api.post('/auth/logout')
}

export async function getFavorites(signal?: AbortSignal) {
  const { data } = await api.get('/me/favorites', { signal })
  return favoritesSchema.parse(data)
}

export async function setFavorite(nftId: string, favorited: boolean) {
  const url = `/me/favorites/${encodeURIComponent(nftId)}`
  const { data } = favorited ? await api.put(url) : await api.delete(url)
  return favoriteToggleSchema.parse(data)
}
