import type { EditionId } from '@/api/contracts/catalog'
import { createNftFixtures, type NftRecord } from './fixtures/nfts'
import type { Order } from '@/api/contracts/orders'
import type { WalletConnection } from '@/api/contracts/wallets'
import { createFavoriteFixtures, createUserFixtures, type UserRecord } from './fixtures/users'
import { createWalletFixtures, type WalletRecord } from './fixtures/wallets'

/**
 * In-memory state of the fake backend, persisted to localStorage so refreshes keep
 * mutations. Bump DB_VERSION whenever the shape or fixtures change: old data is discarded.
 */
const DB_KEY = 'kurio:mock-db'
const DB_VERSION = 4

export type SessionRecord = { token: string; userId: string; expiresAt: string }

export type CartLineRecord = {
  nftId: string
  editionId: EditionId
  quantity: number
  /** Unit price when the line was added (or last acknowledged); detects price changes. */
  acceptedPriceEth: string
}

export type CartRecord = {
  id: string
  lines: CartLineRecord[]
  couponCode: string | null
  updatedAt: string
}

export type OrderRecord = Order & {
  userId: string
  /** Idempotency key and fingerprint of the request that created the order. */
  idempotencyKey: string
  fingerprint: string
  /** When the simulated payment settles, and how (decided by the scenario at creation). */
  settleAt: string
  outcome: 'confirmed' | 'refused'
}

export type DbState = {
  version: typeof DB_VERSION
  nfts: NftRecord[]
  users: UserRecord[]
  sessions: SessionRecord[]
  /** userId -> NFT ids, most recent first */
  favorites: Record<string, string[]>
  /** `user:<id>` or `guest:<cart id>` -> cart */
  carts: Record<string, CartRecord>
  wallets: WalletRecord[]
  /** userId -> simulated wallet connection used by checkout */
  connections: Record<string, WalletConnection>
  orders: OrderRecord[]
}

function seed(): DbState {
  return {
    version: DB_VERSION,
    nfts: createNftFixtures(),
    users: createUserFixtures(),
    sessions: [],
    favorites: createFavoriteFixtures(),
    carts: {},
    wallets: createWalletFixtures(),
    connections: {},
    orders: [],
  }
}

function load(): DbState {
  try {
    const raw = localStorage.getItem(DB_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as DbState
      if (parsed.version === DB_VERSION) return parsed
    }
  } catch {
    // Corrupted or unavailable storage: fall back to the known scenario
  }
  return seed()
}

let state: DbState = load()

export const db = {
  get state() {
    return state
  },
  /** Applies a change and persists it. All writes go through here. */
  update(mutate: (draft: DbState) => void) {
    mutate(state)
    persist()
  },
  reset() {
    state = seed()
    persist()
  },
}

function persist() {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(state))
  } catch {
    // Quota or private mode: state still lives in memory for this tab
  }
}
