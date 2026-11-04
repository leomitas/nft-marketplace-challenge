import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import type { Socket } from 'socket.io-client'
import type { Cart } from '@/api/contracts/cart'
import type { CatalogPage, Featured, NftDetail } from '@/api/contracts/catalog'
import type { Order } from '@/api/contracts/orders'
import {
  nftUpdatedSchema,
  orderUpdatedSchema,
  REALTIME_EVENTS,
  type NftUpdated,
  type OrderUpdated,
} from '@/api/contracts/realtime'
import { tokenStore } from '@/api/token-store'
import { toast } from '@/components/ui/toaster'
import { meKeys } from '@/features/auth/session'
import { useSession } from '@/features/auth/use-session'
import { cartKey } from '@/features/cart/keys'
import { catalogKeys } from '@/features/catalog/queries'
import { checkoutKeys } from '@/features/checkout/keys'
import { REALTIME_URL } from './config'
import { createEventFilter } from './event-filter'

type Status = 'connecting' | 'online' | 'offline'

/**
 * Single Socket.IO connection for the app. Events update the TanStack Query cache (never
 * component state directly); after a reconnection, active queries are refetched from REST to
 * recover anything missed while offline.
 */
export function RealtimeBridge() {
  const queryClient = useQueryClient()
  const { user } = useSession()
  const userId = user?.id ?? null
  const userIdRef = useRef(userId)
  const socketRef = useRef<Socket | null>(null)
  const filterRef = useRef(createEventFilter())
  const [status, setStatus] = useState<Status>('connecting')

  useEffect(() => {
    let socket: Socket | null = null
    let cancelled = false

    // Imported lazily, after MSW patched WebSocket: engine.io keeps the reference it finds at
    // import time. It also keeps the client out of the initial bundle.
    void import('socket.io-client').then(({ io }) => {
      if (cancelled) return
      const current = io(REALTIME_URL, {
        // MSW intercepts WebSockets only; long-polling would bypass the mock server
        transports: ['websocket'],
        reconnectionDelay: 500,
        reconnectionDelayMax: 2000,
        // A connection attempt the server never answers is retried instead of hanging
        timeout: 3000,
      })
      socket = current
      socketRef.current = current
      current.on('connect', () => {
        current.emit(REALTIME_EVENTS.sessionJoin, tokenStore.get())
        setStatus('online')
        document.documentElement.dataset.realtime = 'online'
        // Changes made before (or while) the socket was down were not pushed: refetch what is
        // on screen from REST, the source of truth
        void queryClient.invalidateQueries({
          refetchType: 'active',
          predicate: (query) => query.queryKey[0] !== 'session',
        })
      })
      current.on('disconnect', () => {
        setStatus('offline')
        document.documentElement.dataset.realtime = 'offline'
      })

      current.on(REALTIME_EVENTS.nftUpdated, (raw: unknown) => {
        const parsed = nftUpdatedSchema.safeParse(raw)
        if (!parsed.success || !filterRef.current.accept(parsed.data)) return
        applyNftUpdated(queryClient, parsed.data, userIdRef.current)
      })
      current.on(REALTIME_EVENTS.orderUpdated, (raw: unknown) => {
        const parsed = orderUpdatedSchema.safeParse(raw)
        // Another account's event (e.g. from before a user switch) never touches this cache
        if (!parsed.success || parsed.data.userId !== userIdRef.current) return
        if (!filterRef.current.accept(parsed.data)) return
        applyOrderUpdated(queryClient, parsed.data)
      })
    })

    return () => {
      cancelled = true
      socket?.removeAllListeners()
      socket?.disconnect()
      socketRef.current = null
    }
  }, [queryClient])

  // Login, logout or user switch: rebind the connection to the current session
  useEffect(() => {
    if (userIdRef.current === userId) return
    userIdRef.current = userId
    filterRef.current = createEventFilter()
    const socket = socketRef.current
    if (socket?.connected) socket.emit(REALTIME_EVENTS.sessionJoin, tokenStore.get())
  }, [userId])

  if (status !== 'offline') return null
  return (
    <p
      role="status"
      className="fixed top-3 left-1/2 z-50 -translate-x-1/2 rounded-full border border-primary/60 bg-surface-card px-4 py-2 text-xs text-foreground shadow-lg"
    >
      Tempo real desconectado. Reconectando...
    </p>
  )
}

function applyNftUpdated(queryClient: QueryClient, event: NftUpdated, userId: string | null) {
  const { summary, editionOptions } = event.data
  const newer = (current?: { version: number }) => !current || current.version < event.version

  queryClient.setQueryData<NftDetail>(catalogKeys.detail(event.id), (old) =>
    old && newer(old) ? { ...old, ...summary, editionOptions } : old,
  )
  queryClient.setQueriesData<CatalogPage>({ queryKey: catalogKeys.lists() }, (old) =>
    old
      ? {
          ...old,
          items: old.items.map((item) => (item.id === event.id && newer(item) ? summary : item)),
        }
      : old,
  )
  queryClient.setQueryData<Featured>(catalogKeys.featured(), (old) =>
    old && old.spotlight.id === event.id && newer(old.spotlight) ? { spotlight: summary } : old,
  )
  if (userId) {
    void queryClient.invalidateQueries({ queryKey: [...meKeys.user(userId), 'favorites'] })
  }

  // Price and stock issues of the cart are computed by the server: refetch cart and quote
  const cart = queryClient.getQueryData<Cart>(cartKey(userId))
  const inCart = cart?.lines.find((line) => line.nftId === event.id)
  if (inCart) {
    void queryClient.invalidateQueries({ queryKey: cartKey(userId) })
    toast.info(`${inCart.name} mudou de preço ou disponibilidade. Confira seu carrinho.`)
  }
}

function applyOrderUpdated(queryClient: QueryClient, event: OrderUpdated) {
  queryClient.setQueryData<Order>(checkoutKeys.order(event.userId, event.id), (old) =>
    !old || old.version < event.version ? event.data : old,
  )
  void queryClient.invalidateQueries({ queryKey: checkoutKeys.orders(event.userId), exact: true })
  if (event.data.status === 'confirmed') {
    void queryClient.invalidateQueries({ queryKey: cartKey(event.userId) })
  }
}
