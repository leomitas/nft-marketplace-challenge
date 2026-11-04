import { createNftFixtures, type NftRecord } from './fixtures/nfts'
import { createFavoriteFixtures, createUserFixtures, type UserRecord } from './fixtures/users'

/**
 * In-memory state of the fake backend, persisted to localStorage so refreshes keep
 * mutations. Bump DB_VERSION whenever the shape or fixtures change: old data is discarded.
 */
const DB_KEY = 'kurio:mock-db'
const DB_VERSION = 2

export type SessionRecord = { token: string; userId: string; expiresAt: string }

export type DbState = {
  version: typeof DB_VERSION
  nfts: NftRecord[]
  users: UserRecord[]
  sessions: SessionRecord[]
  /** userId -> NFT ids, most recent first */
  favorites: Record<string, string[]>
}

function seed(): DbState {
  return {
    version: DB_VERSION,
    nfts: createNftFixtures(),
    users: createUserFixtures(),
    sessions: [],
    favorites: createFavoriteFixtures(),
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
