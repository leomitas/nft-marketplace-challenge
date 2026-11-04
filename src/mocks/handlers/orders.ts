import Big from 'big.js'
import { delay, http, HttpResponse } from 'msw'
import { createOrderSchema, type Order } from '@/api/contracts/orders'
import { connectWalletSchema, type WalletConnection } from '@/api/contracts/wallets'
import { computeQuote, emptyCart, toCart } from '../cart-logic'
import { db, type OrderRecord } from '../db'
import { applyBasePrice } from '../fixtures/nfts'
import {
  newOrderId,
  scheduleSettlement,
  SETTLE_DELAY_MS,
  settleDueOrders,
  toOrder,
} from '../order-logic'
import { publishNftUpdated } from '../realtime'
import { errorResponse, fireOnce, getScenario, simulateLatency } from '../scenarios'
import { authenticate } from './auth'

async function readJson(request: Request) {
  try {
    return await request.json()
  } catch {
    return undefined
  }
}

function fieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const fields: Record<string, string> = {}
  for (const issue of issues) fields[String(issue.path.at(-1) ?? 'form')] ??= issue.message
  return errorResponse(422, 'VALIDATION', 'Revise os campos destacados.', fields)
}

/** Checkout scenarios that change the catalog right when the order is submitted. */
function applyCheckoutScenario(userId: string) {
  const first = db.state.carts[`user:${userId}`]?.lines[0]
  if (!first) return
  const before = db.state.nfts.find((n) => n.id === first.nftId)?.version
  if (fireOnce('checkout-price-change')) {
    db.update((draft) => {
      const nft = draft.nfts.find((n) => n.id === first.nftId)
      if (nft) applyBasePrice(nft, new Big(nft.priceEth).plus('0.1').toString())
    })
  }
  if (fireOnce('checkout-sold-out')) {
    db.update((draft) => {
      const nft = draft.nfts.find((n) => n.id === first.nftId)
      const tier = nft?.editionOptions.find((e) => e.id === first.editionId)
      if (nft && tier) {
        tier.available = 0
        nft.version += 1
      }
    })
  }
  if (db.state.nfts.find((n) => n.id === first.nftId)?.version !== before) {
    publishNftUpdated(first.nftId)
  }
}

export const orderHandlers = [
  http.get('/api/me/wallets', async ({ request }) => {
    await simulateLatency()
    const auth = authenticate(request)
    if ('error' in auth) return auth.error
    const items = db.state.wallets
      .filter((w) => w.userId === auth.user.id)
      .map(({ userId: _userId, ...wallet }) => wallet)
      .sort((a, b) => a.role.localeCompare(b.role))
    return HttpResponse.json({ items })
  }),

  http.get('/api/me/wallet-connection', async ({ request }) => {
    await simulateLatency()
    const auth = authenticate(request)
    if ('error' in auth) return auth.error
    return HttpResponse.json({ connection: db.state.connections[auth.user.id] ?? null })
  }),

  // Simulated "connect" in the wallet app: approves, or refuses in the wallet-rejected scenario
  http.put('/api/me/wallet-connection', async ({ request }) => {
    await simulateLatency()
    await delay(400)
    const auth = authenticate(request)
    if ('error' in auth) return auth.error
    const parsed = connectWalletSchema.safeParse(await readJson(request))
    if (!parsed.success) return fieldErrors(parsed.error.issues)
    const wallet = db.state.wallets.find(
      (w) => w.id === parsed.data.walletId && w.userId === auth.user.id,
    )
    if (!wallet) return errorResponse(404, 'NOT_FOUND', 'Carteira não encontrada.')
    if (getScenario() === 'wallet-rejected') {
      return errorResponse(409, 'WALLET_REJECTED', 'A conexão foi recusada na carteira.')
    }
    const connection: WalletConnection = {
      ...parsed.data,
      address: wallet.address,
      connectedAt: new Date().toISOString(),
    }
    db.update((draft) => {
      draft.connections[auth.user.id] = connection
    })
    return HttpResponse.json({ connection })
  }),

  http.delete('/api/me/wallet-connection', async ({ request }) => {
    await simulateLatency()
    const auth = authenticate(request)
    if ('error' in auth) return auth.error
    db.update((draft) => {
      delete draft.connections[auth.user.id]
    })
    return HttpResponse.json({ connection: null })
  }),

  http.get('/api/orders', async ({ request }) => {
    await simulateLatency()
    const auth = authenticate(request)
    if ('error' in auth) return auth.error
    settleDueOrders(auth.user.id)
    const items = db.state.orders
      .filter((o) => o.userId === auth.user.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(toOrder)
    return HttpResponse.json({ items })
  }),

  http.get('/api/orders/:orderId', async ({ request, params }) => {
    await simulateLatency()
    const auth = authenticate(request)
    if ('error' in auth) return auth.error
    const record = db.state.orders.find((o) => o.id === params.orderId)
    if (!record) return errorResponse(404, 'NOT_FOUND', 'Pedido não encontrado.')
    if (record.userId !== auth.user.id) {
      return errorResponse(403, 'FORBIDDEN', 'Este pedido pertence a outra conta.')
    }
    settleDueOrders(auth.user.id)
    const order = db.state.orders.find((o) => o.id === record.id)
    return HttpResponse.json<Order>(toOrder(order ?? record))
  }),

  /**
   * Idempotent order creation. Same key + same body returns the original order (even after a
   * lost response); same key + different body is a conflict. Price, stock, coupon and fees are
   * revalidated against the quote the user reviewed.
   */
  http.post('/api/orders', async ({ request }) => {
    await simulateLatency()
    const auth = authenticate(request)
    if ('error' in auth) return auth.error
    const userId = auth.user.id

    const key = request.headers.get('Idempotency-Key')
    if (!key || !/^[\w-]{8,64}$/.test(key)) {
      return errorResponse(400, 'IDEMPOTENCY_KEY_REQUIRED', 'Chave de idempotência ausente.')
    }
    const parsed = createOrderSchema.safeParse(await readJson(request))
    if (!parsed.success) return fieldErrors(parsed.error.issues)
    const fingerprint = JSON.stringify(parsed.data)

    const previous = db.state.orders.find((o) => o.userId === userId && o.idempotencyKey === key)
    if (previous) {
      if (previous.fingerprint !== fingerprint) {
        return errorResponse(
          409,
          'IDEMPOTENCY_CONFLICT',
          'Esta tentativa de compra já foi usada com outros dados.',
        )
      }
      settleDueOrders(userId)
      const order = db.state.orders.find((o) => o.id === previous.id) ?? previous
      return HttpResponse.json<Order>(toOrder(order), {
        status: 200,
        headers: { 'Idempotent-Replayed': 'true' },
      })
    }

    const { walletId, provider, network } = parsed.data
    const wallet = db.state.wallets.find((w) => w.id === walletId && w.userId === userId)
    if (!wallet) return errorResponse(404, 'NOT_FOUND', 'Carteira não encontrada.')
    const connection = db.state.connections[userId]
    if (
      !connection ||
      connection.walletId !== walletId ||
      connection.provider !== provider ||
      connection.network !== network
    ) {
      return errorResponse(409, 'WALLET_NOT_CONNECTED', 'Conecte a carteira antes de confirmar.')
    }

    applyCheckoutScenario(userId)
    const cart = toCart(db.state.carts[`user:${userId}`] ?? emptyCart(`user:${userId}`))
    if (!cart.lines.length) return errorResponse(409, 'CART_EMPTY', 'Seu carrinho está vazio.')
    const quote = computeQuote(cart)
    if (!quote.purchasable) {
      return errorResponse(
        409,
        'CART_HAS_ISSUES',
        'Preço ou disponibilidade de algum item mudou. Revise antes de confirmar.',
      )
    }
    if (quote.id !== parsed.data.quoteId) {
      return errorResponse(
        409,
        'QUOTE_OUTDATED',
        'Os valores mudaram desde a sua revisão. Confira o novo total e confirme novamente.',
      )
    }

    const now = new Date()
    const record: OrderRecord = {
      id: newOrderId(),
      status: 'pending',
      version: 1,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      lines: cart.lines.map((line) => ({
        lineId: line.id,
        nftId: line.nftId,
        editionId: line.editionId,
        editionLabel: line.editionLabel,
        name: line.name,
        tokenId: line.tokenId,
        image: line.image,
        quantity: line.quantity,
        unitPriceEth: line.unitPriceEth,
        lineTotalEth: line.lineTotalEth,
      })),
      subtotalEth: quote.subtotalEth,
      discountEth: quote.discountEth,
      networkFeeEth: quote.networkFeeEth,
      totalEth: quote.totalEth,
      couponCode: quote.coupon?.code ?? null,
      collector: parsed.data.collector,
      payment: { walletId, walletLabel: wallet.label, address: wallet.address, provider, network },
      transaction: null,
      failureReason: null,
      userId,
      idempotencyKey: key,
      fingerprint,
      settleAt: new Date(now.getTime() + SETTLE_DELAY_MS).toISOString(),
      outcome: getScenario() === 'payment-refused' ? 'refused' : 'confirmed',
    }
    db.update((draft) => {
      draft.orders.push(record)
    })
    scheduleSettlement(record.id)

    // The order exists, but this response is lost: only a retry with the same key recovers it
    if (fireOnce('order-timeout')) await delay('infinite')
    return HttpResponse.json<Order>(toOrder(record), { status: 201 })
  }),
]
