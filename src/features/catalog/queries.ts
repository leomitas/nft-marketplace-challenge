import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { getCatalogFacets, getFeatured, getNft, getReviews, listNfts } from '@/api/catalog'
import type { CatalogQuery } from '@/api/contracts/catalog'

export const catalogKeys = {
  all: ['catalog'] as const,
  lists: () => [...catalogKeys.all, 'list'] as const,
  list: (query: CatalogQuery) => [...catalogKeys.lists(), query] as const,
  facets: () => [...catalogKeys.all, 'facets'] as const,
  featured: () => [...catalogKeys.all, 'featured'] as const,
  detail: (id: string) => [...catalogKeys.all, 'detail', id] as const,
  reviews: (id: string) => [...catalogKeys.all, 'reviews', id] as const,
}

/**
 * Each parameter combination is its own cache entry. When the key changes, the previous
 * request is aborted through `signal`, so a slow stale response can never overwrite the
 * current one. `keepPreviousData` keeps the last page on screen while the next one loads.
 */
export const catalogListQuery = (query: CatalogQuery) =>
  queryOptions({
    queryKey: catalogKeys.list(query),
    queryFn: ({ signal }) => listNfts(query, signal),
    placeholderData: keepPreviousData,
  })

export const catalogFacetsQuery = () =>
  queryOptions({
    queryKey: catalogKeys.facets(),
    queryFn: ({ signal }) => getCatalogFacets(signal),
    staleTime: 5 * 60_000,
  })

export const featuredQuery = () =>
  queryOptions({
    queryKey: catalogKeys.featured(),
    queryFn: ({ signal }) => getFeatured(signal),
    staleTime: 5 * 60_000,
  })

export const nftDetailQuery = (id: string) =>
  queryOptions({
    queryKey: catalogKeys.detail(id),
    queryFn: ({ signal }) => getNft(id, signal),
  })

export const reviewsQuery = (id: string) =>
  queryOptions({
    queryKey: catalogKeys.reviews(id),
    queryFn: ({ signal }) => getReviews(id, signal),
    staleTime: 5 * 60_000,
  })
