import { http, HttpResponse } from 'msw'
import { z } from 'zod'
import { addToCartSchema, couponCodeSchema, type Cart, type Quote } from '@/api/contracts/cart'
import {
  checkCoupon,
  computeQuote,
  emptyCart,
  findEdition,
  findNft,
  lineId,
  maxQuantity,
  toCart,
} from '../cart-logic'
import { db, type CartRecord } from '../db'
import { errorResponse, simulateLatency } from '../scenarios'
import { authenticate } from './auth'

/**
 * Which cart a request refers to: the user's (Bearer token) or a guest cart (X-Cart-Id).
 * Guest carts live on the "server" too, so they survive refreshes.
 */
function resolveCart(request: Request): { key: string; record: CartRecord } | { error: Response } {
  if (request.headers.get('Authorization')) {
    const auth = authenticate(request)
    if ('error' in auth) return auth
    const key = `user:${auth.user.id}`
    return { key, record: db.state.carts[key] ?? emptyCart(key) }
  }
  const cartId = request.headers.get('X-Cart-Id')
  if (!cartId || !/^[\w-]{8,64}$/.test(cartId)) {
    return { error: errorResponse(400, 'CART_ID_REQUIRED', 'Carrinho não identificado.') }
  }
  const key = `guest:${cartId}`
  return { key, record: db.state.carts[key] ?? emptyCart(key) }
}

function save(key: string, record: CartRecord) {
  db.update((draft) => {
    draft.carts[key] = { ...record, updatedAt: new Date().toISOString() }
  })
  return toCart(db.state.carts[key])
}

async function body<T>(request: Request, schema: z.ZodType<T>) {
  try {
    return schema.safeParse(await request.json())
  } catch {
    return schema.safeParse(undefined)
  }
}

function stockError(available: number, max: number) {
  return errorResponse(
    409,
    'INSUFFICIENT_STOCK',
    available === 0
      ? 'Esta edição está esgotada.'
      : `Quantidade indisponível. Máximo para esta edição: ${max}.`,
  )
}

export const cartHandlers = [
  http.get('/api/cart', async ({ request }) => {
    await simulateLatency()
    const cart = resolveCart(request)
    if ('error' in cart) return cart.error
    return HttpResponse.json<Cart>(toCart(cart.record))
  }),

  http.get('/api/cart/quote', async ({ request }) => {
    await simulateLatency()
    const cart = resolveCart(request)
    if ('error' in cart) return cart.error
    return HttpResponse.json<Quote>(computeQuote(toCart(cart.record)))
  }),

  http.post('/api/cart/items', async ({ request }) => {
    await simulateLatency()
    const cart = resolveCart(request)
    if ('error' in cart) return cart.error
    const parsed = await body(request, addToCartSchema)
    if (!parsed.success) return errorResponse(422, 'VALIDATION', 'Item inválido.')
    const { nftId, editionId, quantity } = parsed.data

    const nft = findNft(nftId)
    const tier = nft && findEdition(nft, editionId)
    if (!nft || !tier) return errorResponse(404, 'NOT_FOUND', 'NFT ou edição não encontrado.')

    const existing = cart.record.lines.find((l) => l.nftId === nftId && l.editionId === editionId)
    const max = maxQuantity(nft, editionId)
    const next = (existing?.quantity ?? 0) + quantity
    if (next > max) return stockError(tier.available, max)

    const lines = existing
      ? cart.record.lines.map((l) => (l === existing ? { ...l, quantity: next } : l))
      : [...cart.record.lines, { nftId, editionId, quantity, acceptedPriceEth: tier.priceEth }]
    return HttpResponse.json<Cart>(save(cart.key, { ...cart.record, lines }), { status: 201 })
  }),

  http.patch('/api/cart/items/:lineId', async ({ request, params }) => {
    await simulateLatency()
    const cart = resolveCart(request)
    if ('error' in cart) return cart.error
    const parsed = await body(request, z.object({ quantity: z.number().int().positive() }))
    if (!parsed.success) return errorResponse(422, 'VALIDATION', 'Quantidade inválida.')

    const line = cart.record.lines.find((l) => lineId(l.nftId, l.editionId) === params.lineId)
    const nft = line && findNft(line.nftId)
    if (!line || !nft) return errorResponse(404, 'NOT_FOUND', 'Item não está no carrinho.')
    const max = maxQuantity(nft, line.editionId)
    // Lowering the quantity is always allowed (it may fix an INSUFFICIENT_STOCK issue)
    if (parsed.data.quantity > line.quantity && parsed.data.quantity > max) {
      return stockError(findEdition(nft, line.editionId)?.available ?? 0, max)
    }
    const lines = cart.record.lines.map((l) =>
      l === line ? { ...l, quantity: parsed.data.quantity } : l,
    )
    return HttpResponse.json<Cart>(save(cart.key, { ...cart.record, lines }))
  }),

  http.delete('/api/cart/items/:lineId', async ({ request, params }) => {
    await simulateLatency()
    const cart = resolveCart(request)
    if ('error' in cart) return cart.error
    // Idempotent: removing a line that is not there just returns the cart
    const lines = cart.record.lines.filter((l) => lineId(l.nftId, l.editionId) !== params.lineId)
    return HttpResponse.json<Cart>(save(cart.key, { ...cart.record, lines }))
  }),

  // The user saw the new prices: they become the accepted ones
  http.post('/api/cart/acknowledge', async ({ request }) => {
    await simulateLatency()
    const cart = resolveCart(request)
    if ('error' in cart) return cart.error
    const lines = cart.record.lines.map((l) => {
      const nft = findNft(l.nftId)
      const tier = nft && findEdition(nft, l.editionId)
      return tier ? { ...l, acceptedPriceEth: tier.priceEth } : l
    })
    return HttpResponse.json<Cart>(save(cart.key, { ...cart.record, lines }))
  }),

  http.put('/api/cart/coupon', async ({ request }) => {
    await simulateLatency()
    const cart = resolveCart(request)
    if ('error' in cart) return cart.error
    const parsed = await body(request, z.object({ code: couponCodeSchema }))
    if (!parsed.success) {
      return errorResponse(422, 'COUPON_INVALID', 'Informe um código válido.', {
        code: 'Informe um código válido.',
      })
    }
    const quote = computeQuote(toCart(cart.record))
    const check = checkCoupon(parsed.data.code, quote.subtotalEth)
    if (!check.ok) return errorResponse(422, check.code, check.message, { code: check.message })
    return HttpResponse.json<Cart>(save(cart.key, { ...cart.record, couponCode: parsed.data.code }))
  }),

  http.delete('/api/cart/coupon', async ({ request }) => {
    await simulateLatency()
    const cart = resolveCart(request)
    if ('error' in cart) return cart.error
    return HttpResponse.json<Cart>(save(cart.key, { ...cart.record, couponCode: null }))
  }),

  /**
   * After login: moves the guest cart (X-Cart-Id) into the user's cart. Quantities add up,
   * capped by stock and per-order limit; the guest cart is deleted.
   */
  http.post('/api/cart/merge', async ({ request }) => {
    await simulateLatency()
    const auth = authenticate(request)
    if ('error' in auth) return auth.error
    const userKey = `user:${auth.user.id}`
    const guestId = request.headers.get('X-Cart-Id')
    const guest = guestId ? db.state.carts[`guest:${guestId}`] : undefined
    const target = db.state.carts[userKey] ?? emptyCart(userKey)
    if (!guest?.lines.length) return HttpResponse.json<Cart>(toCart(target))

    const lines = [...target.lines]
    for (const incoming of guest.lines) {
      const nft = findNft(incoming.nftId)
      if (!nft) continue
      const max = maxQuantity(nft, incoming.editionId)
      const existing = lines.find(
        (l) => l.nftId === incoming.nftId && l.editionId === incoming.editionId,
      )
      if (existing) {
        existing.quantity = Math.max(1, Math.min(existing.quantity + incoming.quantity, max))
      } else {
        lines.push({ ...incoming, quantity: Math.max(1, Math.min(incoming.quantity, max)) })
      }
    }
    db.update((draft) => {
      delete draft.carts[`guest:${guestId}`]
    })
    const merged = save(userKey, {
      ...target,
      lines,
      couponCode: target.couponCode ?? guest.couponCode,
    })
    return HttpResponse.json<Cart>(merged)
  }),
]
