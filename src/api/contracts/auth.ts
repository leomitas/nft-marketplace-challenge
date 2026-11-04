import { z } from 'zod'
import { nftSummarySchema } from './catalog'

// Shared by the forms and the mock API, so client and "server" validate the same rules.
export const usernameSchema = z
  .string()
  .trim()
  .min(3, 'Use ao menos 3 caracteres.')
  .max(24, 'Use no máximo 24 caracteres.')
  .regex(/^[a-zA-Z0-9._]+$/, 'Use apenas letras, números, ponto ou sublinhado.')

export const emailSchema = z.string().trim().toLowerCase().email('Informe um e-mail válido.')

export const passwordSchema = z
  .string()
  .min(8, 'A senha precisa ter ao menos 8 caracteres.')
  .regex(/[A-Za-z]/, 'Inclua ao menos uma letra.')
  .regex(/\d/, 'Inclua ao menos um número.')

export const loginRequestSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Informe sua senha.'),
})
export type LoginRequest = z.infer<typeof loginRequestSchema>

export const registerRequestSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
})
export type RegisterRequest = z.infer<typeof registerRequestSchema>

export const userSchema = z.object({
  id: z.string(),
  username: z.string(),
  name: z.string(),
  email: z.string(),
  avatarUrl: z.string().nullable(),
})
export type User = z.infer<typeof userSchema>

export const sessionSchema = z.object({
  user: userSchema,
  expiresAt: z.iso.datetime(),
})
export type Session = z.infer<typeof sessionSchema>

/** Login/register response. The token is opaque; the client only stores and forwards it. */
export const authResponseSchema = sessionSchema.extend({ token: z.string() })
export type AuthResponse = z.infer<typeof authResponseSchema>

export const favoritesSchema = z.object({ items: z.array(nftSummarySchema) })
export type Favorites = z.infer<typeof favoritesSchema>

export const favoriteToggleSchema = z.object({ nftId: z.string(), favorited: z.boolean() })
export type FavoriteToggle = z.infer<typeof favoriteToggleSchema>

/** API error codes the client reacts to. */
export const AUTH_ERROR_CODES = ['UNAUTHENTICATED', 'SESSION_EXPIRED'] as const
