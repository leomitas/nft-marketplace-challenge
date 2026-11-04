import { queryOptions, type QueryClient } from '@tanstack/react-query'
import { getSession } from '@/api/auth'
import { ApiError } from '@/api/client'
import type { AuthResponse, Session } from '@/api/contracts/auth'
import { tokenStore } from '@/api/token-store'

/**
 * Query keys of private data all start with ['me', userId]. Including the user id keeps
 * caches of different accounts apart, and the shared prefix lets logout drop all of them.
 */
export const meKeys = {
  all: ['me'] as const,
  user: (userId: string) => [...meKeys.all, userId] as const,
}

let sessionExpiredAtBoot = false

/**
 * True once if the stored token was rejected as expired (e.g. after a full reload), so the
 * private-route guard can tell "session expired" apart from "never signed in".
 */
export function consumeExpiredSession() {
  const expired = sessionExpiredAtBoot
  sessionExpiredAtBoot = false
  return expired
}

export const sessionQuery = () =>
  queryOptions({
    queryKey: ['session'],
    queryFn: async ({ signal }): Promise<Session | null> => {
      if (!tokenStore.get()) return null
      try {
        return await getSession(signal)
      } catch (error) {
        // A stored token the server no longer accepts simply means "signed out"
        if (error instanceof ApiError && error.isSessionLost) {
          tokenStore.clear()
          if (error.code === 'SESSION_EXPIRED') sessionExpiredAtBoot = true
          return null
        }
        throw error
      }
    },
    staleTime: Infinity,
    retry: false,
  })

/** Login/sign-up succeeded: store the token and drop anything cached for a previous user. */
export function startSession(queryClient: QueryClient, auth: AuthResponse) {
  tokenStore.set(auth.token)
  queryClient.removeQueries({ queryKey: meKeys.all })
  const session: Session = { user: auth.user, expiresAt: auth.expiresAt }
  queryClient.setQueryData(sessionQuery().queryKey, session)
}

/** Logout or lost session: forget the token and every private cache entry. */
export function endSession(queryClient: QueryClient) {
  tokenStore.clear()
  void queryClient.cancelQueries({ queryKey: meKeys.all })
  queryClient.removeQueries({ queryKey: meKeys.all })
  queryClient.setQueryData(sessionQuery().queryKey, null)
}

/** Only same-origin paths are accepted as post-login destinations (no open redirect). */
export function safeRedirect(target: unknown): string {
  return typeof target === 'string' && target.startsWith('/') && !target.startsWith('//')
    ? target
    : '/'
}
