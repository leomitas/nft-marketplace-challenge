import { z } from 'zod'
import { editionIdSchema, nftImageSchema, networkIdSchema } from './catalog'
import { ethAmountSchema } from './common'

/** Problems the server found in a line since it was added. The UI must surface each one. */
export const cartIssueSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('PRICE_CHANGED'),
    previousPriceEth: ethAmountSchema,
    currentPriceEth: ethAmountSchema,
  }),
  z.object({ type: z.literal('INSUFFICIENT_STOCK'), available: z.number().int().nonnegative() }),
  z.object({ type: z.literal('SOLD_OUT') }),
])
export type CartIssue = z.infer<typeof cartIssueSchema>

export const cartLineSchema = z.object({
  /** `${nftId}:${editionId}` — one line per NFT and edition tier. */
  id: z.string(),
  nftId: z.string(),
  editionId: editionIdSchema,
  editionLabel: z.string(),
  name: z.string(),
  tokenId: z.string(),
  network: networkIdSchema,
  image: nftImageSchema,
  quantity: z.number().int().positive(),
  /** Price per unit right now; the line total uses it. */
  unitPriceEth: ethAmountSchema,
  lineTotalEth: ethAmountSchema,
  available: z.number().int().nonnegative(),
  maxPerOrder: z.number().int().positive(),
  nftVersion: z.number().int().nonnegative(),
  issues: z.array(cartIssueSchema),
})
export type CartLine = z.infer<typeof cartLineSchema>

export const cartSchema = z.object({
  id: z.string(),
  lines: z.array(cartLineSchema),
  /** Sum of quantities (header badge). */
  itemCount: z.number().int().nonnegative(),
  couponCode: z.string().nullable(),
  updatedAt: z.iso.datetime(),
})
export type Cart = z.infer<typeof cartSchema>

/**
 * Server-side quote: the reference for checkout. `id` changes whenever anything that affects the
 * price changes (lines, prices, coupon), so a stale quote can be detected and rejected.
 */
export const quoteSchema = z.object({
  id: z.string(),
  subtotalEth: ethAmountSchema,
  discountEth: ethAmountSchema,
  networkFeeEth: ethAmountSchema,
  totalEth: ethAmountSchema,
  coupon: z.object({ code: z.string(), description: z.string() }).nullable(),
  /** False while any line has an unresolved issue: checkout must not proceed. */
  purchasable: z.boolean(),
  expiresAt: z.iso.datetime(),
})
export type Quote = z.infer<typeof quoteSchema>

export const addToCartSchema = z.object({
  nftId: z.string(),
  editionId: editionIdSchema,
  quantity: z.number().int().positive(),
})
export type AddToCart = z.infer<typeof addToCartSchema>

export const couponCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .min(3, 'Informe um código válido.')
  .max(20, 'Código muito longo.')
