import { useEffect, useRef, useState } from 'react'
import searchIcon from '@/assets/figma/m-icon-search.svg'
import { useCatalogSearch } from '../use-catalog-search'

const DEBOUNCE_MS = 350

/** Mobile "Explorar coleções" field. Typing updates `?q=` after a short pause. */
export function CatalogSearchInput() {
  const { search, update } = useCatalogSearch()
  const [value, setValue] = useState(search.q)
  const lastSent = useRef(search.q)

  // Back/forward navigation changes the URL: reflect it in the field
  useEffect(() => {
    if (search.q !== lastSent.current) {
      lastSent.current = search.q
      setValue(search.q)
    }
  }, [search.q])

  useEffect(() => {
    const term = value.trim()
    if (term === lastSent.current) return
    const timer = setTimeout(() => {
      lastSent.current = term
      // replace: typing should not create one history entry per keystroke
      update({ q: term }, { replace: true })
    }, DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [value, update])

  return (
    <form role="search" onSubmit={(event) => event.preventDefault()} className="min-w-0 flex-1">
      <label htmlFor="catalog-search" className="sr-only">
        Buscar NFTs
      </label>
      <div className="flex h-[45px] items-center gap-2 rounded-[10px] bg-surface-card px-3 focus-within:ring-2 focus-within:ring-ring">
        <img src={searchIcon} alt="" width={22} height={22} />
        <input
          id="catalog-search"
          type="search"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Explorar coleções"
          className="min-w-0 flex-1 bg-transparent text-sm leading-4 font-bold text-foreground placeholder:text-brand-secondary focus:outline-none"
        />
      </div>
    </form>
  )
}
