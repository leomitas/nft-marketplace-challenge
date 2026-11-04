import { api } from './client'
import { orderSchema, ordersSchema, type CreateOrder } from './contracts/orders'

/** Short on purpose: a lost response is retried with the same key instead of waiting. */
export const CREATE_ORDER_TIMEOUT_MS = 5_000

export async function createOrder(body: CreateOrder, idempotencyKey: string) {
  const { data } = await api.post('/orders', body, {
    headers: { 'Idempotency-Key': idempotencyKey },
    timeout: CREATE_ORDER_TIMEOUT_MS,
  })
  return orderSchema.parse(data)
}

export async function getOrder(orderId: string, signal?: AbortSignal) {
  const { data } = await api.get(`/orders/${encodeURIComponent(orderId)}`, { signal })
  return orderSchema.parse(data)
}

export async function getOrders(signal?: AbortSignal) {
  const { data } = await api.get('/orders', { signal })
  return ordersSchema.parse(data).items
}
