import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { ApiError } from '@/api/client'
import type { CreateOrder, Order } from '@/api/contracts/orders'
import type { ConnectWallet } from '@/api/contracts/wallets'
import { createOrder, getOrder } from '@/api/orders'
import { connectWallet, disconnectWallet, getWalletConnection, getWallets } from '@/api/wallets'
import { useSession } from '@/features/auth/use-session'
import { cartKey } from '@/features/cart/keys'
import { idempotencyKeyFor } from './draft'
import { checkoutKeys } from './keys'

/** Checkout only renders under the private layout, so a user is always present. */
function useUserId() {
  const { user } = useSession()
  return user?.id ?? ''
}

export function useWallets() {
  const userId = useUserId()
  return useQuery({
    queryKey: checkoutKeys.wallets(userId),
    queryFn: ({ signal }) => getWallets(signal),
    enabled: Boolean(userId),
  })
}

export function useWalletConnection() {
  const userId = useUserId()
  return useQuery({
    queryKey: checkoutKeys.connection(userId),
    queryFn: ({ signal }) => getWalletConnection(signal),
    enabled: Boolean(userId),
  })
}

export function useConnectWallet() {
  const userId = useUserId()
  const queryClient = useQueryClient()
  return useMutation({
    scope: { id: 'wallet-connection' },
    mutationFn: (body: ConnectWallet) => connectWallet(body),
    onSuccess: (connection) =>
      queryClient.setQueryData(checkoutKeys.connection(userId), connection),
  })
}

export function useDisconnectWallet() {
  const userId = useUserId()
  const queryClient = useQueryClient()
  return useMutation({
    scope: { id: 'wallet-connection' },
    mutationFn: () => disconnectWallet(),
    onSuccess: () => queryClient.setQueryData(checkoutKeys.connection(userId), null),
  })
}

/**
 * Creates the order with an idempotency key derived from the request content. Unlike other
 * mutations it retries once on a timeout/connection failure: with the same key the server
 * returns the order it already created instead of charging twice.
 */
export function useCreateOrder() {
  const userId = useUserId()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  return useMutation({
    scope: { id: 'create-order' },
    mutationFn: (body: CreateOrder) =>
      createOrder(body, idempotencyKeyFor(userId, JSON.stringify(body))),
    retry: (failures, error) => error instanceof ApiError && error.isTransient && failures < 1,
    onSuccess: (order) => {
      // An order.updated event may already have brought a newer version
      queryClient.setQueryData<Order>(checkoutKeys.order(userId, order.id), (old) =>
        old && old.version >= order.version ? old : order,
      )
      void queryClient.invalidateQueries({ queryKey: checkoutKeys.orders(userId) })
      // Here, not in mutate(): the form may unmount while waiting (e.g. the cart empties)
      void navigate({ to: '/pedidos/$orderId', params: { orderId: order.id } })
    },
    onError: (error) => {
      // Price, stock or quote moved on the server: show the user the current values
      if (error instanceof ApiError && error.status === 409) {
        void queryClient.invalidateQueries({ queryKey: cartKey(userId) })
      }
    },
  })
}

export function useOrder(orderId: string) {
  const userId = useUserId()
  const queryClient = useQueryClient()
  return useQuery({
    queryKey: checkoutKeys.order(userId, orderId),
    queryFn: async ({ signal }) => {
      const order = await getOrder(orderId, signal)
      // A settled order changed the cart (bought items left it) and the stock
      if (order.status === 'confirmed') {
        void queryClient.invalidateQueries({ queryKey: cartKey(userId) })
      }
      return order
    },
    enabled: Boolean(userId),
    // No polling: `order.updated` (Socket.IO) moves a pending order forward, and a reconnection
    // or reload refetches it. Terminal states never change again.
    staleTime: (query) => (isTerminal(query.state.data) ? Infinity : 0),
    retry: (failures, error) => error instanceof ApiError && error.isTransient && failures < 3,
  })
}

export function isTerminal(order?: Order) {
  return order?.status === 'confirmed' || order?.status === 'refused'
}
