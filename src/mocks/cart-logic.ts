import Big from 'big.js'
import type { Cart, CartIssue, CartLine, Quote } from '@/api/contracts/cart'
import { db, type CartRecord } from './db'
import type { NftRecord } from './fixtures/nfts'

/** Coupons known by the fake backend. Documented in the README. */
export const COUPONS: Record<
  string,
  | { kind: 'percent'; value: string; description: string; expired?: false; minSubtotal?: string }
  | { kind: 'fixed'; value: string; description: string; expired?: false; minSubtotal?: string }
  | { kind: 'expired'; description: string; expired: true }
> = {
  KURIO10: { kind: 'percent', value: '10', description: '10% de desconto' },
  LANCAMENTO: {
    kind: 'fixed',
    value: '0.05',
    description: '0.05 ETH de desconto em compras acima de 0.5 ETH',
    minSubtotal: '0.5',
  },
  GENESIS20: { kind: 'expired', description: 'Cupom de lançamento gênesis', expired: true },
}

export const NETWORK_FEE_ETH = '0.016'
const QUOTE_TTL_MS = 5 * 60_000

export function lineId(nftId: string, editionId: string) {
  return `${nftId}:${editionId}`
}

function findNft(nftId: string) {
  return db.state.nfts.find((nft) => nft.id === nftId)
}

function edition(nft: NftRecord, editionId: string) {
  return nft.editionOptions.find((e) => e.id === editionId)
}

export function emptyCart(id: string): CartRecord {
  return { id, lines: [], couponCode: null, updatedAt: new Date().toISOString() }
}

/** Live view of a stored cart: current prices, stock and the issues they create. */
export function toCart(record: CartRecord): Cart {
  const lines: CartLine[] = []
  for (const stored of record.lines) {
    const nft = findNft(stored.nftId)
    const tier = nft && edition(nft, stored.editionId)
    if (!nft || !tier) continue
    const issues: CartIssue[] = []
    if (tier.available === 0) issues.push({ type: 'SOLD_OUT' })
    else if (stored.quantity > tier.available) {
      issues.push({ type: 'INSUFFICIENT_STOCK', available: tier.available })
    }
    if (!new Big(tier.priceEth).eq(stored.acceptedPriceEth)) {
      issues.push({
        type: 'PRICE_CHANGED',
        previousPriceEth: stored.acceptedPriceEth,
        currentPriceEth: tier.priceEth,
      })
    }
    lines.push({
      id: lineId(nft.id, tier.id),
      nftId: nft.id,
      editionId: tier.id,
      editionLabel: tier.label,
      name: nft.name,
      tokenId: nft.tokenId,
      network: nft.network,
      image: nft.image,
      quantity: stored.quantity,
      unitPriceEth: tier.priceEth,
      lineTotalEth: new Big(tier.priceEth).times(stored.quantity).toString(),
      available: tier.available,
      maxPerOrder: nft.maxPerOrder,
      nftVersion: nft.version,
      issues,
    })
  }
  return {
    id: record.id,
    lines,
    itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
    couponCode: record.couponCode,
    updatedAt: record.updatedAt,
  }
}

export type CouponCheck =
  | { ok: true; discountEth: string; description: string }
  | {
      ok: false
      code: 'COUPON_INVALID' | 'COUPON_EXPIRED' | 'COUPON_MIN_SUBTOTAL'
      message: string
    }

export function checkCoupon(code: string, subtotalEth: string): CouponCheck {
  const coupon = COUPONS[code]
  if (!coupon) return { ok: false, code: 'COUPON_INVALID', message: 'Cupom inválido.' }
  if (coupon.expired) return { ok: false, code: 'COUPON_EXPIRED', message: 'Este cupom expirou.' }
  if (coupon.minSubtotal && new Big(subtotalEth).lt(coupon.minSubtotal)) {
    return {
      ok: false,
      code: 'COUPON_MIN_SUBTOTAL',
      message: `Este cupom vale para compras acima de ${coupon.minSubtotal} ETH.`,
    }
  }
  const subtotal = new Big(subtotalEth)
  const raw =
    coupon.kind === 'percent' ? subtotal.times(coupon.value).div(100) : new Big(coupon.value)
  // Never discount more than the subtotal; 6 decimals is enough precision for display
  const discount = raw.gt(subtotal) ? subtotal : raw.round(6, Big.roundDown)
  return { ok: true, discountEth: discount.toString(), description: coupon.description }
}

/** Deterministic hash (djb2) so equal carts produce equal quote ids. */
function hash(input: string) {
  let h = 5381
  for (let i = 0; i < input.length; i++) h = ((h << 5) + h + input.charCodeAt(i)) | 0
  return (h >>> 0).toString(16)
}

export function computeQuote(cart: Cart): Quote {
  const subtotal = cart.lines.reduce((sum, line) => sum.plus(line.lineTotalEth), new Big(0))
  const coupon = cart.couponCode ? checkCoupon(cart.couponCode, subtotal.toString()) : null
  const discount = coupon?.ok ? new Big(coupon.discountEth) : new Big(0)
  const fee = cart.lines.length ? new Big(NETWORK_FEE_ETH) : new Big(0)
  const total = subtotal.minus(discount).plus(fee)
  const fingerprint = JSON.stringify({
    lines: cart.lines.map((l) => [l.id, l.quantity, l.unitPriceEth]),
    coupon: coupon?.ok ? cart.couponCode : null,
    fee: fee.toString(),
  })
  return {
    id: `q_${hash(fingerprint)}`,
    subtotalEth: subtotal.toString(),
    discountEth: discount.toString(),
    networkFeeEth: fee.toString(),
    totalEth: total.toString(),
    coupon:
      coupon?.ok && cart.couponCode
        ? { code: cart.couponCode, description: coupon.description }
        : null,
    purchasable: cart.lines.length > 0 && cart.lines.every((line) => line.issues.length === 0),
    expiresAt: new Date(Date.now() + QUOTE_TTL_MS).toISOString(),
  }
}

/** Largest quantity allowed for a tier: stock and per-order cap. */
export function maxQuantity(nft: NftRecord, editionId: string) {
  const tier = edition(nft, editionId)
  return tier ? Math.min(tier.available, nft.maxPerOrder) : 0
}

export { findNft, edition as findEdition }
