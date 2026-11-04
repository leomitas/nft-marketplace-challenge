import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { useEffect } from 'react'
import { setSessionLostHandler } from '@/api/client'
import { toast } from '@/components/ui/toaster'
import { endSession } from './session'

/**
 * When any authenticated request comes back 401, the session is over: private caches are
 * dropped and the user goes to login with the current URL, to resume exactly there.
 */
export function SessionWatcher() {
  const queryClient = useQueryClient()
  const router = useRouter()

  useEffect(() => {
    let handling = false
    setSessionLostHandler((reason) => {
      // Several in-flight requests may fail at once; react only to the first
      if (handling) return
      handling = true
      endSession(queryClient)
      const { href, pathname } = router.state.location
      if (pathname !== '/login') {
        if (reason === 'expired') toast.info('Sua sessão expirou. Entre novamente para continuar.')
        void router
          .navigate({ to: '/login', search: { redirect: href, reason: 'expired' } })
          .finally(() => {
            handling = false
          })
      } else {
        handling = false
      }
    })
    return () => setSessionLostHandler(null)
  }, [queryClient, router])

  return null
}
