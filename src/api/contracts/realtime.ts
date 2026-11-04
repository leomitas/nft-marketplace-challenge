import { z } from 'zod'
import { editionSchema, nftSummarySchema } from './catalog'
import { orderSchema } from './orders'

/**
 * Socket.IO events. Every event has a stable `eventId` (same change → same id, so duplicates are
 * detectable), the affected resource and its `version` (older versions are ignored).
 */
const envelope = {
  eventId: z.string(),
  id: z.string(),
  version: z.number().int().nonnegative(),
}

export const nftUpdatedSchema = z.object({
  ...envelope,
  resource: z.literal('nft'),
  data: z.object({ summary: nftSummarySchema, editionOptions: z.array(editionSchema) }),
})
export type NftUpdated = z.infer<typeof nftUpdatedSchema>

export const orderUpdatedSchema = z.object({
  ...envelope,
  resource: z.literal('order'),
  /** Owner of the order; the client drops events that are not for the signed-in user. */
  userId: z.string(),
  data: orderSchema,
})
export type OrderUpdated = z.infer<typeof orderUpdatedSchema>

export const REALTIME_EVENTS = {
  nftUpdated: 'nft.updated',
  orderUpdated: 'order.updated',
  /** Client → server: binds the connection to a session token (or `null` to leave). */
  sessionJoin: 'session.join',
} as const
