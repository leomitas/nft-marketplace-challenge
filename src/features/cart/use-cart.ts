import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  acknowledgeCartChanges,
  addToCart,
  applyCoupon,
  getCart,
  getQuote,
  removeCartLine,
  removeCoupon,
  updateCartLine,
} from '@/api/cart'
import type { AddToCart, Cart } from '@/api/contracts/cart'
import { useSession } from '@/features/auth/use-session'
import { cartKey, quoteKey } from './keys'

export function useCart() {
  const { user, isPending } = useSession()
  return useQuery({
    queryKey: cartKey(user?.id ?? null),
    queryFn: ({ signal }) => getCart(signal),
    // Wait for the session check, or a signed-in user would briefly load the guest cart
    enabled: !isPending,
    // Prices and stock can change while the cart is open; refetch when the user comes back
    refetchOnWindowFocus: true,
  })
}

export function useQuote() {
  const { user, isPending } = useSession()
  return useQuery({
    queryKey: quoteKey(user?.id ?? null),
    queryFn: ({ signal }) => getQuote(signal),
    enabled: !isPending,
    refetchOnWindowFocus: true,
  })
}

/** Every cart mutation returns the new cart; it replaces the cache and the quote is refetched. */
function useCartMutation<TVariables>(mutationFn: (variables: TVariables) => Promise<Cart>) {
  const queryClient = useQueryClient()
  const { user } = useSession()
  const userId = user?.id ?? null
  return useMutation({
    // One scope for the whole cart: mutations run one at a time, in click order
    scope: { id: 'cart' },
    mutationFn,
    onSuccess: (cart) => {
      queryClient.setQueryData(cartKey(userId), cart)
      void queryClient.invalidateQueries({ queryKey: quoteKey(userId) })
    },
    // A rejected change (e.g. stock) may mean the cart moved under us: resync
    onError: () => void queryClient.invalidateQueries({ queryKey: cartKey(userId) }),
  })
}

export const useAddToCart = () => useCartMutation((item: AddToCart) => addToCart(item))
export const useUpdateCartLine = () =>
  useCartMutation(({ lineId, quantity }: { lineId: string; quantity: number }) =>
    updateCartLine(lineId, quantity),
  )
export const useRemoveCartLine = () => useCartMutation((lineId: string) => removeCartLine(lineId))
export const useAcknowledgeCart = () => useCartMutation(() => acknowledgeCartChanges())
export const useApplyCoupon = () => useCartMutation((code: string) => applyCoupon(code))
export const useRemoveCoupon = () => useCartMutation(() => removeCoupon())
