import { http, HttpResponse } from 'msw'
import { db } from '../db'
import { applyBasePrice } from '../fixtures/nfts'
import { publishNftUpdated, replayNft, setRealtimeOffline } from '../realtime'
import { isScenarioId, setScenario } from '../scenarios'

/**
 * Test/demo controls of the fake backend. They are part of the mock layer (not the app):
 * the dev panel and Playwright call them to change server-side state, never the UI.
 */
export const controlHandlers = [
  http.post('/api/__mock/reset', () => {
    db.reset()
    setScenario('default')
    setRealtimeOffline(false)
    return new HttpResponse(null, { status: 204 })
  }),

  http.post('/api/__mock/scenario/:id', ({ params }) => {
    if (!isScenarioId(params.id)) return new HttpResponse(null, { status: 404 })
    setScenario(params.id)
    return new HttpResponse(null, { status: 204 })
  }),

  // Read-only view of every order, so tests can assert that no duplicate was created
  http.get('/api/__mock/orders', () =>
    HttpResponse.json(db.state.orders.map(({ id, userId, status }) => ({ id, userId, status }))),
  ),

  // Simulates expiry: every active session is now in the past
  http.post('/api/__mock/sessions/expire', () => {
    const past = new Date(Date.now() - 1000).toISOString()
    db.update((draft) => {
      draft.sessions = draft.sessions.map((s) => ({ ...s, expiresAt: past }))
    })
    return new HttpResponse(null, { status: 204 })
  }),

  // Price change on the "server": new base price (1/50), every tier re-derived, version bumped
  http.post('/api/__mock/nfts/:id/price', async ({ request, params }) => {
    const { priceEth } = (await request.json()) as { priceEth: string }
    const exists = db.state.nfts.some((nft) => nft.id === params.id)
    if (!exists || !/^\d+(\.\d+)?$/.test(priceEth)) return new HttpResponse(null, { status: 400 })
    db.update((draft) => {
      const nft = draft.nfts.find((n) => n.id === params.id)
      if (nft) applyBasePrice(nft, priceEth)
    })
    // The same change reaches connected clients as `nft.updated`
    publishNftUpdated(String(params.id))
    return new HttpResponse(null, { status: 204 })
  }),

  // Stock change on the "server" (e.g. an edition sells out while it sits in a cart)
  http.post('/api/__mock/nfts/:id/stock', async ({ request, params }) => {
    const { editionId, available } = (await request.json()) as {
      editionId: string
      available: number
    }
    let found = false
    db.update((draft) => {
      const nft = draft.nfts.find((n) => n.id === params.id)
      const tier = nft?.editionOptions.find((e) => e.id === editionId)
      if (nft && tier && Number.isInteger(available) && available >= 0) {
        tier.available = Math.min(available, tier.supply)
        nft.version += 1
        found = true
      }
    })
    if (found) publishNftUpdated(String(params.id))
    return new HttpResponse(null, { status: found ? 204 : 400 })
  }),

  // Real-time controls: drop the socket (and refuse reconnections) / bring it back
  http.post('/api/__mock/realtime/offline', () => {
    setRealtimeOffline(true)
    return new HttpResponse(null, { status: 204 })
  }),
  http.post('/api/__mock/realtime/online', () => {
    setRealtimeOffline(false)
    return new HttpResponse(null, { status: 204 })
  }),

  // Sends the last nft.updated twice and then the previous (older) one
  http.post('/api/__mock/realtime/replay/:nftId', ({ params }) =>
    replayNft(String(params.nftId))
      ? new HttpResponse(null, { status: 204 })
      : new HttpResponse(null, { status: 404 }),
  ),
]
