import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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
  return useMutation({
    scope: { id: 'create-order' },
    mutationFn: (body: CreateOrder) =>
      createOrder(body, idempotencyKeyFor(userId, JSON.stringify(body))),
    retry: (failures, error) => error instanceof ApiError && error.isTransient && failures < 1,
    onSuccess: (order) => {
      queryClient.setQueryData(checkoutKeys.order(userId, order.id), order)
      void queryClient.invalidateQueries({ queryKey: checkoutKeys.orders(userId) })
    },
    onError: (error) => {
      // Price, stock or quote moved on the server: show the user the current values
      if (error instanceof ApiError && error.status === 409) {
        void queryClient.invalidateQueries({ queryKey: cartKey(userId) })
      }
    },
  })
}

const POLL_MS = 1000

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
    // Pending orders are polled until they settle; terminal states never change again
    refetchInterval: (query) => (query.state.data?.status === 'pending' ? POLL_MS : false),
    staleTime: (query) => (isTerminal(query.state.data) ? Infinity : 0),
    retry: (failures, error) => error instanceof ApiError && error.isTransient && failures < 3,
  })
}

export function isTerminal(order?: Order) {
  return order?.status === 'confirmed' || order?.status === 'refused'
}
