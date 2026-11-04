import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { consumeExpiredSession, endSession, sessionQuery } from '@/features/auth/session'

/**
 * Pathless layout for private pages. The session is revalidated with the server on every
 * private navigation (cached private data alone would hide an expired session). Visitors
 * and expired sessions go to login with the full URL, to land back on it afterwards.
 */
export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ context: { queryClient }, location, preload }) => {
    const hadSession = Boolean(queryClient.getQueryData(sessionQuery().queryKey))
    const session = await queryClient.fetchQuery({
      ...sessionQuery(),
      // Hover preloads may reuse a recent check; real navigations always ask the server
      staleTime: preload ? 10_000 : 0,
    })
    if (!session) {
      if (hadSession) endSession(queryClient)
      const expired = hadSession || consumeExpiredSession()
      throw redirect({
        to: '/login',
        search: { redirect: location.href, reason: expired ? 'expired' : undefined },
      })
    }
    return { user: session.user }
  },
  component: Outlet,
})
