import type { CollectionId, NetworkId, NftSummary } from '@/api/contracts/catalog'

/** Fixed clock for fixtures, so dates and the "new releases" tab are reproducible. */
export const FIXTURE_NOW = new Date('2026-10-01T12:00:00.000Z')

// The Figma file ships only 4 artworks; every NFT reuses one of them.
const ARTWORKS = {
  green: 'Retrato de um macaco com óculos escuros redondos e jaqueta verde de colégio',
  hat: 'Retrato de um gorila com chapéu bucket verde e moletom lilás',
  dark: 'Retrato de um macaco de pelagem escura com blusa de gola alta verde e blazer claro',
  orange: 'Retrato de um orangotango com fones de ouvido verdes e camisa creme',
} as const
type Artwork = keyof typeof ARTWORKS

function image(art: Artwork) {
  return {
    src: `/nfts/ape-${art}-960.webp`,
    srcSet: `/nfts/ape-${art}-480.webp 480w, /nfts/ape-${art}-960.webp 960w`,
    alt: ARTWORKS[art],
  }
}

/** Extra fields only the mock needs (ranking, tabs), kept out of the public contract. */
export type NftRecord = NftSummary & {
  trendingScore: number
  description: string
  creator: string
}

type Seed = {
  name: string
  collection: CollectionId
  network: NetworkId
  price: string
  previous?: string
  art: Artwork
  rare?: boolean
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
function prng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

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

function toRecord(seed: Seed, index: number): NftRecord {
  const [total, available] = seed.editions ?? [10, 6]
  // One listing every ~19h going back from FIXTURE_NOW keeps the "recent" order stable
  const listedAt = new Date(FIXTURE_NOW.getTime() - index * 19 * 3_600_000)
  const id = seed.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
  return {
    id,
    tokenId: `#${seed.name.split('#')[1]}`,
    name: seed.name,
    collection: seed.collection,
    network: seed.network,
    priceEth: seed.price,
    previousPriceEth: seed.previous ?? null,
    rarity: seed.rare ? 'rare' : 'common',
    image: image(seed.art),
    editions: { total, available },
    listedAt: listedAt.toISOString(),
    version: 1,
    trendingScore: seed.trending ?? 50,
    description: `${seed.name} faz parte da coleção curada da Kurio: uma peça digital autenticada na rede, com procedência verificada e edição limitada.`,
    creator: 'Estúdio Kurio',
  }
}

export function createNftFixtures(): NftRecord[] {
  return [...DESIGNED, ...generated(52)].map(toRecord)
}

export const SPOTLIGHT_NFT_ID = 'sage-nomad-009'
