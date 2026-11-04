import { z } from 'zod'
import { networkIdSchema } from './catalog'

export const WALLET_PROVIDERS = {
  metamask: 'MetaMask',
  walletconnect: 'WalletConnect',
  coinbase: 'Coinbase Wallet',
} as const
export const walletProviderSchema = z.enum(
  Object.keys(WALLET_PROVIDERS) as [keyof typeof WALLET_PROVIDERS],
)
export type WalletProvider = z.infer<typeof walletProviderSchema>

export const WALLET_ROLES = { primary: 'Principal', secondary: 'Secundária' } as const
export const walletRoleSchema = z.enum(['primary', 'secondary'])
export type WalletRole = z.infer<typeof walletRoleSchema>

export const walletAddressSchema = z
  .string()
  .trim()
  .regex(/^0x[a-fA-F0-9]{40}$/, 'Informe um endereço 0x com 40 caracteres hexadecimais.')

export const ensNameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9-]+(\.[a-z0-9-]+)*\.eth$/, 'Informe um nome ENS terminado em .eth.')

/** A wallet registered by the collector: at most one primary and one secondary. */
export const walletSchema = z.object({
  id: z.string(),
  role: walletRoleSchema,
  label: z.string(),
  address: z.string(),
  ens: z.string().nullable(),
  network: networkIdSchema,
  provider: walletProviderSchema,
  updatedAt: z.iso.datetime(),
})
export type Wallet = z.infer<typeof walletSchema>

export const walletsSchema = z.object({ items: z.array(walletSchema) })

/** Simulated wallet connection for checkout (no browser extension involved). */
export const walletConnectionSchema = z.object({
  walletId: z.string(),
  provider: walletProviderSchema,
  network: networkIdSchema,
  address: z.string(),
  connectedAt: z.iso.datetime(),
})
export type WalletConnection = z.infer<typeof walletConnectionSchema>

export const connectWalletSchema = z.object({
  walletId: z.string(),
  provider: walletProviderSchema,
  network: networkIdSchema,
})
export type ConnectWallet = z.infer<typeof connectWalletSchema>

export const connectionResponseSchema = z.object({
  connection: walletConnectionSchema.nullable(),
})
