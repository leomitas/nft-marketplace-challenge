import { z } from 'zod'
import { ethAmountSchema } from './common'

export const COLLECTIONS = {
  'arte-digital': 'Arte digital',
  fotografia: 'Fotografia',
  musica: 'Música',
  'arte-3d': 'Arte 3D',
  colecionaveis: 'Colecionáveis',
  generativa: 'Generativa',
  jogos: 'Jogos',
  assinaturas: 'Assinaturas',
  utilidade: 'Utilidade',
} as const

export const NETWORKS = {
  ethereum: 'Ethereum',
  polygon: 'Polygon',
  solana: 'Solana',
} as const

export const SORTS = {
  recent: 'Listados recentemente',
  'price-asc': 'Menor preço',
  'price-desc': 'Maior preço',
  name: 'Nome (A–Z)',
} as const

export const TABS = {
  all: 'Todos os NFTs',
  new: 'Novos lançamentos',
  trending: 'Em alta',
} as const

const keys = <T extends Record<string, string>>(o: T) =>
  Object.keys(o) as [keyof T & string, ...(keyof T & string)[]]

export const collectionIdSchema = z.enum(keys(COLLECTIONS))
export const networkIdSchema = z.enum(keys(NETWORKS))
export const sortIdSchema = z.enum(keys(SORTS))
export const tabIdSchema = z.enum(keys(TABS))

export type CollectionId = z.infer<typeof collectionIdSchema>
export type NetworkId = z.infer<typeof networkIdSchema>
export type SortId = z.infer<typeof sortIdSchema>
export type TabId = z.infer<typeof tabIdSchema>

export const nftImageSchema = z.object({
  src: z.string(),
  srcSet: z.string(),
  alt: z.string(),
})

export const nftSummarySchema = z.object({
  id: z.string(),
  tokenId: z.string(),
  name: z.string(),
  collection: collectionIdSchema,
  network: networkIdSchema,
  priceEth: ethAmountSchema,
  previousPriceEth: ethAmountSchema.nullable(),
  rarity: z.enum(['common', 'rare']),
  image: nftImageSchema,
  editions: z.object({
    total: z.number().int().positive(),
    available: z.number().int().nonnegative(),
  }),
  listedAt: z.iso.datetime(),
  /** Incremented on every change; real-time events carry it to discard stale updates. */
  version: z.number().int().nonnegative(),
})
export type NftSummary = z.infer<typeof nftSummarySchema>

export const catalogQuerySchema = z.object({
  q: z.string().optional(),
  collections: z.array(collectionIdSchema).optional(),
  networks: z.array(networkIdSchema).optional(),
  minPrice: ethAmountSchema.optional(),
  maxPrice: ethAmountSchema.optional(),
  sort: sortIdSchema.optional(),
  tab: tabIdSchema.optional(),
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().max(48).optional(),
})
export type CatalogQuery = z.infer<typeof catalogQuerySchema>

export const catalogPageSchema = z.object({
  items: z.array(nftSummarySchema),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
})
export type CatalogPage = z.infer<typeof catalogPageSchema>

const facetSchema = <T extends z.ZodType>(id: T) =>
  z.object({ id, label: z.string(), count: z.number().int().nonnegative() })

export const catalogFacetsSchema = z.object({
  collections: z.array(facetSchema(collectionIdSchema)),
  networks: z.array(facetSchema(networkIdSchema)),
  price: z.object({ minEth: ethAmountSchema, maxEth: ethAmountSchema }),
})
export type CatalogFacets = z.infer<typeof catalogFacetsSchema>

export const featuredSchema = z.object({ spotlight: nftSummarySchema })
export type Featured = z.infer<typeof featuredSchema>

export const nftDetailSchema = nftSummarySchema.extend({
  description: z.string(),
  creator: z.string(),
})
export type NftDetail = z.infer<typeof nftDetailSchema>
