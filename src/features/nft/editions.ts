import type { Edition, EditionId } from '@/api/contracts/catalog'

/** Default selection: the 1/50 tier (the price shown in the catalog) or the first one in stock. */
export function defaultEdition(editions: Edition[]): EditionId | undefined {
  const base = editions.find((e) => e.id === '1-50' && e.available > 0)
  return (base ?? editions.find((e) => e.available > 0))?.id
}
