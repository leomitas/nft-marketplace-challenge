import { cartIdStore } from './cart-id'
import { api } from './client'
import { cartSchema, quoteSchema, type AddToCart } from './contracts/cart'

// Every cart call carries the guest cart id; the server ignores it when a session is present
const headers = () => ({ 'X-Cart-Id': cartIdStore.get() })

export async function getCart(signal?: AbortSignal) {
  const { data } = await api.get('/cart', { signal, headers: headers() })
  return cartSchema.parse(data)
}

export async function getQuote(signal?: AbortSignal) {
  const { data } = await api.get('/cart/quote', { signal, headers: headers() })
  return quoteSchema.parse(data)
}

export async function addToCart(item: AddToCart) {
  const { data } = await api.post('/cart/items', item, { headers: headers() })
  return cartSchema.parse(data)
}

export async function updateCartLine(lineId: string, quantity: number) {
  const { data } = await api.patch(
    `/cart/items/${encodeURIComponent(lineId)}`,
    { quantity },
    { headers: headers() },
  )
  return cartSchema.parse(data)
}

export async function removeCartLine(lineId: string) {
  const { data } = await api.delete(`/cart/items/${encodeURIComponent(lineId)}`, {
    headers: headers(),
  })
  return cartSchema.parse(data)
}

export async function acknowledgeCartChanges() {
  const { data } = await api.post('/cart/acknowledge', null, { headers: headers() })
  return cartSchema.parse(data)
}

export async function applyCoupon(code: string) {
  const { data } = await api.put('/cart/coupon', { code }, { headers: headers() })
  return cartSchema.parse(data)
}

export async function removeCoupon() {
  const { data } = await api.delete('/cart/coupon', { headers: headers() })
  return cartSchema.parse(data)
}

export async function mergeGuestCart() {
  const { data } = await api.post('/cart/merge', null, { headers: headers() })
  return cartSchema.parse(data)
}
