import type { Collector } from '@/api/contracts/orders'
import type { NetworkId } from '@/api/contracts/catalog'
import type { WalletProvider } from '@/api/contracts/wallets'

/**
 * The payment form is kept in sessionStorage, per user, so an expired session (login and back)
 * or a refresh resumes where the collector stopped. Cleared after a confirmed order or logout.
 */
export type CheckoutDraft = {
  collector: Partial<Collector>
  walletId?: string
  provider?: WalletProvider
  network?: NetworkId
}

const PREFIX = 'kurio:checkout:'
const draftKey = (userId: string) => `${PREFIX}draft:${userId}`
const attemptKey = (userId: string) => `${PREFIX}attempt:${userId}`

function read<T>(key: string): T | undefined {
  try {
    const raw = sessionStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : undefined
  } catch {
    return undefined
  }
}

function write(key: string, value: unknown) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage unavailable: the form simply won't survive a reload
  }
}

export const checkoutDraft = {
  load: (userId: string) => read<CheckoutDraft>(draftKey(userId)) ?? { collector: {} },
  save: (userId: string, draft: CheckoutDraft) => write(draftKey(userId), draft),
  clear(userId: string) {
    try {
      sessionStorage.removeItem(draftKey(userId))
      sessionStorage.removeItem(attemptKey(userId))
    } catch {
      // nothing to clear
    }
  },
  /** A refused order is final: retrying must create a new order, so a new key is needed. */
  clearAttempt(userId: string) {
    try {
      sessionStorage.removeItem(attemptKey(userId))
    } catch {
      // nothing to clear
    }
  },
  /** Drops every user's draft (logout on a shared browser). */
  clearAll() {
    try {
      for (const key of Object.keys(sessionStorage)) {
        if (key.startsWith(PREFIX)) sessionStorage.removeItem(key)
      }
    } catch {
      // nothing to clear
    }
  },
}

/**
 * Idempotency key for a purchase attempt. The same request content reuses the same key —
 * across double clicks, retries after a timeout and reloads — so the server returns the same
 * order. Changing anything (e.g. a new quote) starts a new attempt.
 */
export function idempotencyKeyFor(userId: string, fingerprint: string) {
  const stored = read<{ key: string; fingerprint: string }>(attemptKey(userId))
  if (stored?.fingerprint === fingerprint) return stored.key
  const key = crypto.randomUUID()
  write(attemptKey(userId), { key, fingerprint })
  return key
}
