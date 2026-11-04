import Big from 'big.js'
import { http, HttpResponse } from 'msw'
import {
  catalogQuerySchema,
  COLLECTIONS,
  NETWORKS,
  type CatalogFacets,
  type CatalogPage,
  type CatalogQuery,
  type Featured,
  type NftDetail,
  type Review,
} from '@/api/contracts/catalog'
import { db } from '../db'
import { FIXTURE_NOW, SPOTLIGHT_NFT_ID, toSummary, type NftRecord } from '../fixtures/nfts'
import { averageRating, reviewsFor } from '../fixtures/reviews'
import { catalogFailure, errorResponse, getScenario, simulateLatency } from '../scenarios'

const DEFAULT_PAGE_SIZE = 9
const NEW_RELEASE_WINDOW_MS = 14 * 24 * 3_600_000
const TRENDING_MIN_SCORE = 70

function readQuery(url: URL) {
  const params = url.searchParams
  const number = (key: string) => (params.has(key) ? Number(params.get(key)) : undefined)
  return catalogQuerySchema.safeParse({
    q: params.get('q') ?? undefined,
    collections: params.getAll('collections'),
    networks: params.getAll('networks'),
    minPrice: params.get('minPrice') ?? undefined,
    maxPrice: params.get('maxPrice') ?? undefined,
    sort: params.get('sort') ?? undefined,
    tab: params.get('tab') ?? undefined,
    page: number('page'),
    pageSize: number('pageSize'),
  })
}

function filterAndSort(records: NftRecord[], query: CatalogQuery) {
  const q = query.q?.trim().toLowerCase()
  let result = records.filter((nft) => {
    if (q && !nft.name.toLowerCase().includes(q) && !nft.tokenId.includes(q)) return false
    if (query.collections?.length && !query.collections.includes(nft.collection)) return false
    if (query.networks?.length && !query.networks.includes(nft.network)) return false
    if (query.minPrice && new Big(nft.priceEth).lt(query.minPrice)) return false
    if (query.maxPrice && new Big(nft.priceEth).gt(query.maxPrice)) return false
    if (query.tab === 'new') {
      return FIXTURE_NOW.getTime() - Date.parse(nft.listedAt) <= NEW_RELEASE_WINDOW_MS
    }
    if (query.tab === 'trending') return nft.trendingScore >= TRENDING_MIN_SCORE
    return true
  })

  const byPrice = (a: NftRecord, b: NftRecord) => new Big(a.priceEth).cmp(b.priceEth)
  const byRecent = (a: NftRecord, b: NftRecord) => b.listedAt.localeCompare(a.listedAt)
  switch (query.sort ?? 'recent') {
    case 'price-asc':
      result = result.sort((a, b) => byPrice(a, b) || byRecent(a, b))
      break
    case 'price-desc':
      result = result.sort((a, b) => byPrice(b, a) || byRecent(a, b))
      break
    case 'name':
      result = result.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
      break
    default:
      result = result.sort(byRecent)
  }
  return result
}

function catalogRecords() {
  return getScenario() === 'empty' ? [] : db.state.nfts
}

export const catalogHandlers = [
  http.get('/api/nfts/facets', async () => {
    await simulateLatency()
    const records = catalogRecords()
    const count = <K extends keyof NftRecord>(key: K, value: NftRecord[K]) =>
      records.filter((nft) => nft[key] === value).length
    const prices = records.map((nft) => new Big(nft.priceEth))
    const min = prices.reduce((acc, p) => (p.lt(acc) ? p : acc), prices[0] ?? new Big(0))
    const max = prices.reduce((acc, p) => (p.gt(acc) ? p : acc), prices[0] ?? new Big(0))
    return HttpResponse.json<CatalogFacets>({
      collections: Object.entries(COLLECTIONS).map(([id, label]) => ({
        id: id as keyof typeof COLLECTIONS,
        label,
        count: count('collection', id as keyof typeof COLLECTIONS),
      })),
      networks: Object.entries(NETWORKS).map(([id, label]) => ({
        id: id as keyof typeof NETWORKS,
        label,
        count: count('network', id as keyof typeof NETWORKS),
      })),
      price: { minEth: min.toFixed(2), maxEth: max.toFixed(2) },
    })
  }),

  http.get('/api/nfts/featured', async () => {
    await simulateLatency()
    const spotlight = db.state.nfts.find((nft) => nft.id === SPOTLIGHT_NFT_ID)
    if (!spotlight) return errorResponse(404, 'NOT_FOUND', 'Nenhum NFT em destaque.')
    return HttpResponse.json<Featured>({ spotlight: toSummary(spotlight) })
  }),

  http.get('/api/nfts', async ({ request }) => {
    await simulateLatency()
    const failure = catalogFailure()
    if (failure) return failure

    const parsed = readQuery(new URL(request.url))
    if (!parsed.success) {
      return errorResponse(400, 'VALIDATION', 'Parâmetros de busca inválidos.')
    }
    const query = parsed.data
    const filtered = filterAndSort(catalogRecords(), query)
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE
    const totalPages = Math.ceil(filtered.length / pageSize)
    const page = query.page ?? 1
    const start = (page - 1) * pageSize
    return HttpResponse.json<CatalogPage>({
      items: filtered.slice(start, start + pageSize).map(toSummary),
      page,
      pageSize,
      total: filtered.length,
      totalPages,
    })
  }),

  // Registered after the static /nfts/* routes so "facets" and "featured" are not read as ids
  http.get('/api/nfts/:id', async ({ params }) => {
    await simulateLatency()
    const record = db.state.nfts.find((nft) => nft.id === params.id)
    if (!record) return errorResponse(404, 'NOT_FOUND', 'NFT não encontrado.')
    return HttpResponse.json<NftDetail>(toDetail(record))
  }),

  http.get('/api/nfts/:id/reviews', async ({ params }) => {
    await simulateLatency()
    const record = db.state.nfts.find((nft) => nft.id === params.id)
    if (!record) return errorResponse(404, 'NOT_FOUND', 'NFT não encontrado.')
    return HttpResponse.json<{ items: Review[] }>({
      items: reviewsFor(record.id, record.rating.count),
    })
  }),
]

export function toDetail(record: NftRecord): NftDetail {
  const { trendingScore: _t, art: _a, ...rest } = record
  const reviews = reviewsFor(record.id, record.rating.count)
  return {
    ...rest,
    editions: toSummary(record).editions,
    rating: { average: averageRating(reviews), count: reviews.length },
  }
}
