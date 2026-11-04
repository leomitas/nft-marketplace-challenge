import { cartIdStore } from '@/api/cart-id'
import { meKeys } from '@/features/auth/session'

/**
 * The cart belongs to whoever is browsing: the signed-in user (private, under ['me', id]) or
 * the visitor's guest cart. Switching user switches the key, so carts never mix.
 */
export function cartKey(userId: string | null) {
  return userId
    ? ([...meKeys.user(userId), 'cart'] as const)
    : (['guest-cart', cartIdStore.get()] as const)
}

export function quoteKey(userId: string | null) {
  return [...cartKey(userId), 'quote'] as const
}
