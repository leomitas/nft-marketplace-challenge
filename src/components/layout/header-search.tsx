import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import searchIcon from '@/assets/figma/icon-search.svg'

/**
 * Header search icon (Figma) that expands into a field. Submitting goes to the catalog
 * with the term in the URL, from any page.
 */
export function HeaderSearch() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-sm p-0.5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        aria-label="Abrir busca"
        aria-expanded={false}
      >
        <img src={searchIcon} alt="" width={20} height={20} />
      </button>
    )
  }

  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault()
        void navigate({ to: '/', search: { q: value.trim() }, hash: 'catalogo' })
        setOpen(false)
        setValue('')
      }}
      className="flex items-center gap-2"
    >
      <label htmlFor="header-search" className="sr-only">
        Buscar NFTs
      </label>
      <input
        id="header-search"
        type="search"
        autoFocus
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => event.key === 'Escape' && setOpen(false)}
        onBlur={() => !value && setOpen(false)}
        placeholder="Buscar NFTs"
        className="h-[35px] w-48 rounded-[6px] border border-border-soft bg-surface-dark px-3 text-sm text-foreground placeholder:text-brand-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      />
      <button
        type="submit"
        className="rounded-sm p-0.5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        aria-label="Buscar"
      >
        <img src={searchIcon} alt="" width={20} height={20} />
      </button>
    </form>
  )
}
