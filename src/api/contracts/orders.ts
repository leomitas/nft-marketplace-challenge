import { z } from 'zod'
import { usernameSchema, emailSchema } from './auth'
import { editionIdSchema, networkIdSchema, nftImageSchema } from './catalog'
import { ethAmountSchema } from './common'
import { walletProviderSchema } from './wallets'

/** Collector data from the payment form. Shared by the form and the mock API. */
export const collectorSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, 'Informe como você quer ser exibido.')
    .max(40, 'Use no máximo 40 caracteres.'),
  username: usernameSchema,
  email: emailSchema,
  referralCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^([A-Z0-9-]{4,16})?$/, 'Use de 4 a 16 letras, números ou hífen.'),
  note: z.string().trim().max(280, 'Use no máximo 280 caracteres.'),
})
export type Collector = z.infer<typeof collectorSchema>

export const createOrderSchema = z.object({
  /** The quote the user reviewed; the server rejects the order if it no longer matches. */
  quoteId: z.string(),
  collector: collectorSchema,
  walletId: z.string(),
  provider: walletProviderSchema,
  network: networkIdSchema,
})
export type CreateOrder = z.infer<typeof createOrderSchema>

export const orderStatusSchema = z.enum(['pending', 'confirmed', 'refused'])
export type OrderStatus = z.infer<typeof orderStatusSchema>

/** Line as it was bought. Never re-read from the catalog: the receipt is a snapshot. */
export const orderLineSchema = z.object({
  lineId: z.string(),
  nftId: z.string(),
  editionId: editionIdSchema,
  editionLabel: z.string(),
  name: z.string(),
  tokenId: z.string(),
  image: nftImageSchema,
  quantity: z.number().int().positive(),
  unitPriceEth: ethAmountSchema,
  lineTotalEth: ethAmountSchema,
})
export type OrderLine = z.infer<typeof orderLineSchema>

export const orderSchema = z.object({
  id: z.string(),
  status: orderStatusSchema,
  /** Increases on every change; real-time events with a lower version are stale. */
  version: z.number().int().nonnegative(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  lines: z.array(orderLineSchema),
  subtotalEth: ethAmountSchema,
  discountEth: ethAmountSchema,
  networkFeeEth: ethAmountSchema,
  totalEth: ethAmountSchema,
  couponCode: z.string().nullable(),
  collector: collectorSchema,
  payment: z.object({
    walletId: z.string(),
    walletLabel: z.string(),
    address: z.string(),
    provider: walletProviderSchema,
    network: networkIdSchema,
  }),
  /**
   * Simulated on-chain reference, present once confirmed. `explorerUrl` is an in-app path to the
   * simulated explorer (the hash does not exist on any real network).
   */
  transaction: z.object({ hash: z.string(), explorerUrl: z.string() }).nullable(),
  failureReason: z.string().nullable(),
})
export type Order = z.infer<typeof orderSchema>

export const ordersSchema = z.object({ items: z.array(orderSchema) })
