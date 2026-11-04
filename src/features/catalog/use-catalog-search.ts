import { getRouteApi } from '@tanstack/react-router'
import type { CatalogSearch } from './search'

const homeRoute = getRouteApi('/')

/**
 * Catalog state lives in the URL. Any change except an explicit page change sends the user
 * back to page 1, so a filter never lands on a page that no longer exists.
 */
export function useCatalogSearch() {
  const search = homeRoute.useSearch()
  const navigate = homeRoute.useNavigate()

  function update(patch: Partial<CatalogSearch>, options: { replace?: boolean } = {}) {
    void navigate({
      search: (prev) => ({ ...prev, ...patch, page: patch.page ?? 1 }),
      replace: options.replace,
      resetScroll: false,
    })
  }

  return { search, update }
}
