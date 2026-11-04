import { z } from 'zod'
import {
  collectionIdSchema,
  networkIdSchema,
  sortIdSchema,
  tabIdSchema,
  type CatalogQuery,
} from '@/api/contracts/catalog'
import { ethAmountSchema } from '@/api/contracts/common'

// Every field falls back instead of failing, so a hand-edited URL never breaks the page
export const catalogSearchSchema = z.object({
  q: z.string().trim().max(80).default('').catch(''),
  collections: z.array(collectionIdSchema).default([]).catch([]),
  networks: z.array(networkIdSchema).default([]).catch([]),
  minPrice: ethAmountSchema.optional().catch(undefined),
  maxPrice: ethAmountSchema.optional().catch(undefined),
  sort: sortIdSchema.default('recent').catch('recent'),
  tab: tabIdSchema.default('all').catch('all'),
  page: z.coerce.number().int().positive().default(1).catch(1),
})

export type CatalogSearch = z.infer<typeof catalogSearchSchema>

/** Defaults are stripped from the URL, so a clean "/" means the default catalog view. */
export const catalogSearchDefaults = {
  q: '',
  collections: [],
  networks: [],
  sort: 'recent',
  tab: 'all',
  page: 1,
} satisfies Partial<CatalogSearch>

export function toCatalogQuery(search: CatalogSearch): CatalogQuery {
  return {
    q: search.q || undefined,
    collections: search.collections.length ? search.collections : undefined,
    networks: search.networks.length ? search.networks : undefined,
    minPrice: search.minPrice,
    maxPrice: search.maxPrice,
    sort: search.sort,
    tab: search.tab,
    page: search.page,
  }
}

export function hasActiveFilters(search: CatalogSearch) {
  return Boolean(
    search.q ||
    search.collections.length ||
    search.networks.length ||
    search.minPrice ||
    search.maxPrice ||
    search.tab !== 'all',
  )
}
