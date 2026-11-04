import { meKeys } from '@/features/auth/session'

export const checkoutKeys = {
  wallets: (userId: string) => [...meKeys.user(userId), 'wallets'] as const,
  connection: (userId: string) => [...meKeys.user(userId), 'wallet-connection'] as const,
  orders: (userId: string) => [...meKeys.user(userId), 'orders'] as const,
  order: (userId: string, orderId: string) => [...meKeys.user(userId), 'orders', orderId] as const,
}
