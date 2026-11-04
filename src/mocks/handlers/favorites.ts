import { http, HttpResponse } from 'msw'
import type { FavoriteToggle, Favorites } from '@/api/contracts/auth'
import { db } from '../db'
import { toSummary } from '../fixtures/nfts'
import { errorResponse, favoritesFailure, simulateLatency } from '../scenarios'
import { authenticate } from './auth'

export const favoritesHandlers = [
  http.get('/api/me/favorites', async ({ request }) => {
    await simulateLatency()
    const auth = authenticate(request)
    if ('error' in auth) return auth.error
    const ids = db.state.favorites[auth.user.id] ?? []
    const items = ids
      .map((id) => db.state.nfts.find((nft) => nft.id === id))
      .filter((nft) => nft !== undefined)
      .map(toSummary)
    return HttpResponse.json<Favorites>({ items })
  }),

  // PUT/DELETE are idempotent: repeating them never duplicates or fails
  http.put('/api/me/favorites/:nftId', async ({ request, params }) => {
    await simulateLatency()
    const auth = authenticate(request)
    if ('error' in auth) return auth.error
    const failure = favoritesFailure()
    if (failure) return failure

    const nftId = String(params.nftId)
    if (!db.state.nfts.some((nft) => nft.id === nftId)) {
      return errorResponse(404, 'NOT_FOUND', 'NFT não encontrado.')
    }
    db.update((draft) => {
      const list = draft.favorites[auth.user.id] ?? []
      if (!list.includes(nftId)) draft.favorites[auth.user.id] = [nftId, ...list]
    })
    return HttpResponse.json<FavoriteToggle>({ nftId, favorited: true })
  }),

  http.delete('/api/me/favorites/:nftId', async ({ request, params }) => {
    await simulateLatency()
    const auth = authenticate(request)
    if ('error' in auth) return auth.error
    const failure = favoritesFailure()
    if (failure) return failure

    const nftId = String(params.nftId)
    db.update((draft) => {
      draft.favorites[auth.user.id] = (draft.favorites[auth.user.id] ?? []).filter(
        (id) => id !== nftId,
      )
    })
    return HttpResponse.json<FavoriteToggle>({ nftId, favorited: false })
  }),
]
