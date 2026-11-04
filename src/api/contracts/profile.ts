import { z } from 'zod'
import { emailSchema, passwordSchema, usernameSchema } from './auth'
import { networkIdSchema } from './catalog'
import { ensNameSchema, walletAddressSchema, walletProviderSchema } from './wallets'

// Shared by the forms and the mock API, so client and "server" validate the same rules.
export const profileUpdateSchema = z.object({
  name: z.string().trim().min(2, 'Informe seu nome.').max(40, 'Use no máximo 40 caracteres.'),
  username: usernameSchema,
  email: emailSchema,
})
export type ProfileUpdate = z.infer<typeof profileUpdateSchema>

/** Avatars travel as data URLs (no upload service in the mock). */
export const AVATAR_MAX_BYTES = 200 * 1024
export const AVATAR_TYPES = ['image/png', 'image/jpeg', 'image/webp']
export const avatarSchema = z.object({
  dataUrl: z
    .string()
    .regex(
      /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/,
      'Use uma imagem PNG, JPG ou WebP.',
    )
    // base64 is ~4/3 of the binary size
    .max(Math.ceil((AVATAR_MAX_BYTES * 4) / 3) + 32, 'A imagem deve ter no máximo 200 KB.'),
})

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'Informe sua senha atual.'),
  newPassword: passwordSchema,
})
export type PasswordChange = z.infer<typeof passwordChangeSchema>

export const walletInputSchema = z.object({
  label: z.string().trim().min(2, 'Dê um nome à carteira.').max(20, 'Use no máximo 20 caracteres.'),
  address: walletAddressSchema,
  ens: z.union([ensNameSchema, z.literal('')]),
  network: networkIdSchema,
  provider: walletProviderSchema,
})
export type WalletInput = z.infer<typeof walletInputSchema>
