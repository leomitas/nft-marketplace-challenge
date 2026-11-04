/**
 * Identifier of the visitor's cart, sent as `X-Cart-Id`. The cart itself lives on the server;
 * this id is what lets a visitor's cart survive refreshes and be merged on login.
 */
const CART_ID_KEY = 'kurio:cart-id'

let memoryId: string | null = null

export const cartIdStore = {
  get(): string {
    if (memoryId) return memoryId
    try {
      memoryId = localStorage.getItem(CART_ID_KEY)
    } catch {
      // Storage unavailable: id lasts for this tab
    }
    if (!memoryId) cartIdStore.rotate()
    return memoryId as string
  },
  /** New empty guest cart (after it was merged into an account, or on logout). */
  rotate() {
    memoryId = crypto.randomUUID()
    try {
      localStorage.setItem(CART_ID_KEY, memoryId)
    } catch {
      // Storage unavailable
    }
  },
}
