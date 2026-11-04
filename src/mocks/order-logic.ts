import type { NetworkId } from '@/api/contracts/catalog'
import type { Order } from '@/api/contracts/orders'
import { db, type OrderRecord } from './db'
import { lineId } from './cart-logic'
import { publishNftUpdated, publishOrderUpdated } from './realtime'

/** Time the simulated network takes to confirm or refuse a payment. */
export const SETTLE_DELAY_MS = 2500

const EXPLORERS: Record<NetworkId, string> = {
  ethereum: 'https://etherscan.io/tx/',
  polygon: 'https://polygonscan.com/tx/',
  solana: 'https://solscan.io/tx/',
}

function randomHex(bytes: number) {
  return [...crypto.getRandomValues(new Uint8Array(bytes))]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export function newOrderId() {
  return `ord_${randomHex(5)}`
}

/** Public view of an order: internal bookkeeping (key, fingerprint, outcome) stays server-side. */
export function toOrder(record: OrderRecord): Order {
  const {
    userId: _userId,
    idempotencyKey: _key,
    fingerprint: _fingerprint,
    settleAt: _settleAt,
    outcome: _outcome,
    ...order
  } = record
  return order
}

/**
 * Settles a pending order whose time has come. Confirmation takes the stock, then removes from
 * the buyer's cart exactly the quantities bought; refusal changes nothing else.
 * Returns true when the order changed.
 */
export function settleOrder(orderId: string, now = Date.now()) {
  const current = db.state.orders.find((o) => o.id === orderId)
  if (!current || current.status !== 'pending' || Date.parse(current.settleAt) > now) return false

  db.update((draft) => {
    const order = draft.orders.find((o) => o.id === orderId)
    if (!order) return
    const stamp = new Date(now).toISOString()
    const finish = (status: 'confirmed' | 'refused', failureReason: string | null) => {
      order.status = status
      order.failureReason = failureReason
      order.version += 1
      order.updatedAt = stamp
    }

    if (order.outcome === 'refused') {
      finish('refused', 'O pagamento foi recusado pela rede. Nenhum valor foi cobrado.')
      return
    }

    const tiers = order.lines.map((line) => {
      const nft = draft.nfts.find((n) => n.id === line.nftId)
      return { line, nft, tier: nft?.editionOptions.find((e) => e.id === line.editionId) }
    })
    const short = tiers.find(({ line, tier }) => !tier || tier.available < line.quantity)
    if (short) {
      finish(
        'refused',
        `${short.line.name} (${short.line.editionLabel}) esgotou antes da confirmação.`,
      )
      return
    }

    for (const { line, nft, tier } of tiers) {
      if (!nft || !tier) continue
      tier.available -= line.quantity
      nft.version += 1
    }

    const cartKey = `user:${order.userId}`
    const cart = draft.carts[cartKey]
    if (cart) {
      const bought = new Map(order.lines.map((l) => [l.lineId, l.quantity]))
      cart.lines = cart.lines
        .map((l) => ({
          ...l,
          quantity: l.quantity - (bought.get(lineId(l.nftId, l.editionId)) ?? 0),
        }))
        .filter((l) => l.quantity > 0)
      if (!cart.lines.length) cart.couponCode = null
      cart.updatedAt = stamp
    }

    const hash = `0x${randomHex(32)}`
    order.transaction = { hash, explorerUrl: `${EXPLORERS[order.payment.network]}${hash}` }
    finish('confirmed', null)
  })
  const settled = db.state.orders.find((o) => o.id === orderId)
  if (settled?.status === 'confirmed') {
    for (const nftId of new Set(settled.lines.map((l) => l.nftId))) publishNftUpdated(nftId)
  }
  publishOrderUpdated(orderId)
  return true
}

/** Lazily settles a user's due orders, so a refresh after the delay sees the final state. */
export function settleDueOrders(userId: string) {
  for (const order of db.state.orders) {
    if (order.userId === userId) settleOrder(order.id)
  }
}

/**
 * Settles the order when its time comes and pushes `order.updated`. If the page reloads before
 * that, the timer is gone, but the next read of the order settles it lazily.
 */
export function scheduleSettlement(orderId: string) {
  const order = db.state.orders.find((o) => o.id === orderId)
  if (!order) return
  const wait = Math.max(0, Date.parse(order.settleAt) - Date.now())
  setTimeout(() => settleOrder(orderId), wait)
}

/** After a reload of the mock layer, pending orders get their settlement timers back. */
export function resumePendingSettlements() {
  for (const order of db.state.orders) {
    if (order.status === 'pending') scheduleSettlement(order.id)
  }
}
