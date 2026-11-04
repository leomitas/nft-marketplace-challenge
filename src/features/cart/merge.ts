import type { QueryClient } from '@tanstack/react-query'
import { mergeGuestCart } from '@/api/cart'
import { cartIdStore } from '@/api/cart-id'
import { cartKey } from './keys'

/**
 * Right after login: the visitor's cart is merged into the account on the server, then a new
 * (empty) guest cart id is created for a future sign-out. Failure never blocks the login.
 */
export async function mergeGuestCartAfterLogin(queryClient: QueryClient, userId: string) {
  try {
    await mergeGuestCart()
    queryClient.removeQueries({ queryKey: ['guest-cart'] })
    cartIdStore.rotate()
    // Cancels any cart fetch started before the merge and refetches the merged cart (and quote)
    await queryClient.invalidateQueries({ queryKey: cartKey(userId) })
  } catch {
    // The guest cart stays on the server and the merge can be retried on the next login
  }
}
