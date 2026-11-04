import { api } from './client'
import {
  catalogFacetsSchema,
  catalogPageSchema,
  featuredSchema,
  nftDetailSchema,
  reviewListSchema,
  type CatalogQuery,
} from './contracts/catalog'

export async function listNfts(query: CatalogQuery, signal?: AbortSignal) {
  const { data } = await api.get('/nfts', { params: query, signal })
  return catalogPageSchema.parse(data)
}

export async function getCatalogFacets(signal?: AbortSignal) {
  const { data } = await api.get('/nfts/facets', { signal })
  return catalogFacetsSchema.parse(data)
}

export async function getFeatured(signal?: AbortSignal) {
  const { data } = await api.get('/nfts/featured', { signal })
  return featuredSchema.parse(data)
}

export async function getNft(id: string, signal?: AbortSignal) {
  const { data } = await api.get(`/nfts/${encodeURIComponent(id)}`, { signal })
  return nftDetailSchema.parse(data)
}

export async function getReviews(id: string, signal?: AbortSignal) {
  const { data } = await api.get(`/nfts/${encodeURIComponent(id)}/reviews`, { signal })
  return reviewListSchema.parse(data)
}
