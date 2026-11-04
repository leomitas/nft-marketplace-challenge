import Big from 'big.js'
import {
  EDITION_TIERS,
  NETWORKS,
  type CollectionId,
  type Edition,
  type EditionId,
  type GalleryImage,
  type NetworkId,
  type NftDetail,
  type NftSummary,
} from '@/api/contracts/catalog'

/** Fixed clock for fixtures, so dates and the "new releases" tab are reproducible. */
export const FIXTURE_NOW = new Date('2026-10-01T12:00:00.000Z')

export const MAX_PER_ORDER = 5

// The Figma file ships only 4 artworks; every NFT reuses one of them.
const ARTWORKS = {
  green: {
    alt: 'Retrato de um macaco com óculos escuros redondos e jaqueta verde de colégio',
    traits: ['Óculos', 'Jaqueta verde'],
  },
  hat: {
    alt: 'Retrato de um gorila com chapéu bucket verde e moletom lilás',
    traits: ['Chapéu', 'Moletom lilás'],
  },
  dark: {
    alt: 'Retrato de um macaco de pelagem escura com blusa de gola alta verde e blazer claro',
    traits: ['Gola alta', 'Blazer'],
  },
  orange: {
    alt: 'Retrato de um orangotango com fones de ouvido verdes e camisa creme',
    traits: ['Fones', 'Camisa creme'],
  },
} as const
type Artwork = keyof typeof ARTWORKS

function image(art: Artwork) {
  return {
    src: `/nfts/ape-${art}-960.webp`,
    srcSet: `/nfts/ape-${art}-480.webp 480w, /nfts/ape-${art}-960.webp 960w`,
    alt: ARTWORKS[art].alt,
  }
}

// Gallery: the full piece plus close-up views of the same artwork
function gallery(art: Artwork): GalleryImage[] {
  const base = image(art)
  return [
    { ...base, focus: { x: 50, y: 50, zoom: 1 } },
    { ...base, alt: `Detalhe do rosto. ${base.alt}`, focus: { x: 50, y: 32, zoom: 1.8 } },
    { ...base, alt: `Detalhe da roupa. ${base.alt}`, focus: { x: 50, y: 88, zoom: 1.8 } },
    { ...base, alt: `Detalhe do fundo. ${base.alt}`, focus: { x: 12, y: 15, zoom: 2.2 } },
  ]
}

/**
 * Stored shape: the public detail contract plus fields only the mock uses (ranking).
 * The summary's `editions` totals are derived from `editionOptions` when serializing.
 */
export type NftRecord = Omit<NftDetail, 'editions'> & { trendingScore: number; art: Artwork }

type Seed = {
  name: string
  collection: CollectionId
  network: NetworkId
  price: string
  previous?: string
  art: Artwork
  rare?: boolean
  /** Base stock: [supply, available]. available 0 = every tier sold out. */
  editions?: [total: number, available: number]
  trending?: number
}

// The first entries match the cards drawn in Figma, in the same order ("recent" is the default sort).
const DESIGNED: Seed[] = [
  {
    name: 'Emerald Ape #042',
    collection: 'arte-digital',
    network: 'ethereum',
    price: '1.19',
    art: 'green',
    trending: 92,
    editions: [10, 4],
  },
  {
    name: 'Sage Nomad #009',
    collection: 'arte-digital',
    network: 'ethereum',
    price: '1.69',
    art: 'hat',
    trending: 81,
    editions: [5, 2],
  },
  {
    name: 'Neon Vessel #552',
    collection: 'generativa',
    network: 'polygon',
    price: '1.99',
    previous: '2.29',
    art: 'dark',
    rare: true,
    editions: [3, 1],
  },
  {
    name: 'Cosmic Bloom #118',
    collection: 'arte-digital',
    network: 'solana',
    price: '1.29',
    art: 'hat',
    trending: 77,
  },
  {
    name: 'Violet Nomad #314',
    collection: 'colecionaveis',
    network: 'ethereum',
    price: '1.39',
    art: 'hat',
    editions: [8, 8],
  },
  {
    name: 'Ivory Baron #088',
    collection: 'arte-3d',
    network: 'polygon',
    price: '1.79',
    art: 'dark',
    rare: true,
    trending: 88,
  },
  {
    name: 'Golden Beat #207',
    collection: 'musica',
    network: 'ethereum',
    price: '0.99',
    art: 'orange',
    editions: [20, 0],
  },
  {
    name: 'Golden Signal #160',
    collection: 'musica',
    network: 'solana',
    price: '0.39',
    art: 'orange',
    trending: 74,
  },
]

const ADJECTIVES = [
  'Amber',
  'Crimson',
  'Silent',
  'Lunar',
  'Velvet',
  'Copper',
  'Obsidian',
  'Solar',
  'Misty',
  'Royal',
  'Rusty',
  'Hidden',
]
const NOUNS = [
  'Ape',
  'Nomad',
  'Baron',
  'Signal',
  'Bloom',
  'Vessel',
  'Beat',
  'Echo',
  'Relic',
  'Drifter',
]
const COLLECTION_IDS: CollectionId[] = [
  'arte-digital',
  'fotografia',
  'musica',
  'arte-3d',
  'colecionaveis',
  'generativa',
  'jogos',
  'assinaturas',
  'utilidade',
]
const NETWORK_IDS: NetworkId[] = ['ethereum', 'polygon', 'solana']
const ART_IDS: Artwork[] = ['green', 'hat', 'dark', 'orange']

/** Small seeded PRNG (mulberry32): same seed, same catalog on every run. */
export function prng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Keep the call order of `rand()` unchanged: tests rely on the generated catalog.
function generated(count: number): Seed[] {
  const rand = prng(42)
  const pick = <T>(list: readonly T[]) => list[Math.floor(rand() * list.length)]
  return Array.from({ length: count }, (_, i) => {
    // Prices in hundredths of ETH between 0.02 and 12.30, converted to strings once
    const cents = 2 + Math.floor(rand() * rand() * 1229)
    const total = pick([1, 3, 5, 10, 25])
    return {
      name: `${pick(ADJECTIVES)} ${pick(NOUNS)} #${String(200 + i * 7).padStart(3, '0')}`,
      collection: COLLECTION_IDS[i % COLLECTION_IDS.length],
      network: pick(NETWORK_IDS),
      price: (cents / 100).toFixed(2),
      art: pick(ART_IDS),
      rare: rand() < 0.15,
      editions: [total, rand() < 0.1 ? 0 : Math.ceil(rand() * total)],
      trending: Math.floor(rand() * 100),
    }
  })
}

/** Price multiplier and supply of each edition tier, relative to the 1/50 base price. */
export const TIER_RULES: Record<EditionId, { multiplier: string; supply: number }> = {
  '1-1': { multiplier: '5', supply: 1 },
  '1-10': { multiplier: '2', supply: 10 },
  '1-50': { multiplier: '1', supply: 50 },
  open: { multiplier: '0.5', supply: 500 },
}

function editionOptions(seed: Seed, index: number): Edition[] {
  const [, baseAvailable] = seed.editions ?? [10, 6]
  const soldOut = baseAvailable === 0
  const available: Record<EditionId, number> = {
    // Most 1/1 pieces are already sold: exercises the "edition unavailable" state
    '1-1': soldOut || index % 3 !== 1 ? 0 : 1,
    '1-10': soldOut ? 0 : Math.min(10, baseAvailable + 1),
    '1-50': soldOut ? 0 : baseAvailable,
    open: soldOut ? 0 : 500 - ((index * 37) % 300),
  }
  return (Object.keys(TIER_RULES) as EditionId[]).map((id) => ({
    id,
    label: EDITION_TIERS[id],
    priceEth: new Big(seed.price).times(TIER_RULES[id].multiplier).toFixed(2),
    supply: TIER_RULES[id].supply,
    available: available[id],
  }))
}

export function reviewCount(index: number) {
  return index === 0 ? 19 : 3 + ((index * 5) % 17)
}

function hexFrom(index: number, length: number) {
  const rand = prng(1000 + index)
  return Array.from({ length }, () => Math.floor(rand() * 16).toString(16))
    .join('')
    .toUpperCase()
}

function toRecord(seed: Seed, index: number): NftRecord {
  // One listing every ~19h going back from FIXTURE_NOW keeps the "recent" order stable
  const listedAt = new Date(FIXTURE_NOW.getTime() - index * 19 * 3_600_000)
  const id = seed.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
  const noun = seed.name.split(' ')[1]
  const network = NETWORKS[seed.network]
  const isEmerald = index === 0

  return {
    id,
    tokenId: `#${seed.name.split('#')[1].padStart(4, '0')}`,
    name: seed.name,
    collection: seed.collection,
    network: seed.network,
    priceEth: seed.price,
    previousPriceEth: seed.previous ?? null,
    rarity: seed.rare ? 'rare' : 'common',
    image: image(seed.art),
    listedAt: listedAt.toISOString(),
    version: 1,
    about: isEmerald
      ? 'Um colecionável digital finalizado à mão da coleção Kurio Editions, verificado na Ethereum, com arte desbloqueável e acesso para colecionadores.'
      : `Um colecionável digital da coleção Kurio Editions, verificado na ${network}, com procedência registrada na rede.`,
    description: [
      `${seed.name} é uma obra digital finalizada à mão da coleção Kurio Editions. Cada atributo fica armazenado nos metadados do token e verificado na ${network}. A obra explora identidade, movimento e luz em um mundo digital sem fronteiras.`,
      'A propriedade inclui a arte em alta resolução, lançamentos exclusivos para colecionadores e um registro permanente de procedência registrada na rede. Nova Sato recebe 5% de direitos autorais nas vendas secundárias, apoiando novos trabalhos e lançamentos da comunidade.',
    ],
    creator: 'Nova Sato',
    collectionName: `Kurio ${noun}s`,
    attributes: isEmerald
      ? ['Óculos', 'Esmeralda', 'Raro']
      : [...ARTWORKS[seed.art].traits, seed.rare ? 'Raro' : 'Comum'],
    editionOptions: editionOptions(seed, index),
    maxPerOrder: MAX_PER_ORDER,
    gallery: gallery(seed.art),
    // Average is recomputed from the generated reviews when serving
    rating: { average: 0, count: reviewCount(index) },
    contract: {
      address: isEmerald ? '0x7A42...19E8' : `0x${hexFrom(index, 4)}...${hexFrom(index + 500, 4)}`,
      standard: 'ERC-721',
    },
    royaltyPercent: 5,
    trendingScore: seed.trending ?? 50,
    art: seed.art,
  }
}

export function createNftFixtures(): NftRecord[] {
  return [...DESIGNED, ...generated(52)].map(toRecord)
}

export const SPOTLIGHT_NFT_ID = 'sage-nomad-009'

/** Public summary: strips mock-only fields and derives the edition totals. */
export function toSummary(record: NftRecord): NftSummary {
  return {
    id: record.id,
    tokenId: record.tokenId,
    name: record.name,
    collection: record.collection,
    network: record.network,
    priceEth: record.priceEth,
    previousPriceEth: record.previousPriceEth,
    rarity: record.rarity,
    image: record.image,
    editions: {
      total: record.editionOptions.reduce((sum, e) => sum + e.supply, 0),
      available: record.editionOptions.reduce((sum, e) => sum + e.available, 0),
    },
    listedAt: record.listedAt,
    version: record.version,
  }
}

/** Changes the base (1/50) price and re-derives every tier price, bumping the version. */
export function applyBasePrice(record: NftRecord, priceEth: string) {
  record.previousPriceEth = record.priceEth
  record.priceEth = new Big(priceEth).toFixed(2)
  record.editionOptions = record.editionOptions.map((edition) => ({
    ...edition,
    priceEth: new Big(record.priceEth).times(TIER_RULES[edition.id].multiplier).toFixed(2),
  }))
  record.version += 1
}
