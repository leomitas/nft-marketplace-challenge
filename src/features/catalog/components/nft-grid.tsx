import { useQuery } from '@tanstack/react-query'
import { cn } from 'cn'
import { ApiError } from '@/api/client'
import { catalogListQuery } from '../queries'
import { hasActiveFilters, toCatalogQuery, type CatalogSearch } from '../search'
import { useCatalogSearch } from '../use-catalog-search'
import { CatalogPagination } from './catalog-pagination'
import { NftCard, NftCardSkeleton } from './nft-card'

const PAGE_SIZE = 9

// Mobile: two columns with the right one shifted down 32px, as in the Figma frame.
const gridClass =
  'grid grid-cols-2 gap-x-4 gap-y-6 pb-8 max-md:[&>*:nth-child(even)]:translate-y-8 md:grid-cols-3 md:gap-x-6 md:gap-y-[72px] md:pb-0'

export function NftGrid() {
  const { search, update } = useCatalogSearch()
  const list = useQuery(catalogListQuery(toCatalogQuery(search)))

  if (list.isPending) {
    return (
      <div aria-busy="true" aria-label="Carregando NFTs">
        <div className={gridClass}>
          {Array.from({ length: PAGE_SIZE }, (_, i) => (
            <NftCardSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  if (list.isError) {
    const error = list.error
    return (
      <div role="alert" className="flex flex-col items-start gap-4 rounded-lg bg-surface-card p-8">
        <h3 className="text-lg font-bold text-foreground">Não foi possível carregar os NFTs</h3>
        <p className="text-sm text-text-secondary">
          {error instanceof ApiError && error.kind === 'network'
            ? 'Verifique sua conexão e tente novamente.'
            : error.message}
        </p>
        <button
          type="button"
          onClick={() => list.refetch()}
          disabled={list.isFetching}
          className="rounded-[6px] bg-primary px-4 py-2 text-base font-bold text-ink focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-ink focus-visible:outline-none disabled:opacity-60"
        >
          {list.isFetching ? 'Tentando...' : 'Tentar novamente'}
        </button>
      </div>
    )
  }

  const page = list.data
  // Placeholder data is the previous page, shown dimmed while the new one loads
  const updating = list.isPlaceholderData

  if (page.total === 0) {
    return <EmptyState search={search} onClear={() => update(clearedFilters)} />
  }

  return (
    <div className="flex flex-col items-end gap-14 md:gap-[88px]">
      <p className="sr-only" aria-live="polite">
        {updating
          ? 'Atualizando resultados'
          : `${page.total} ${page.total === 1 ? 'NFT encontrado' : 'NFTs encontrados'}, página ${page.page} de ${page.totalPages}`}
      </p>
      <ul
        aria-busy={updating}
        className={cn(gridClass, 'w-full transition-opacity', updating && 'opacity-60')}
      >
        {page.items.map((nft, index) => (
          <li key={nft.id}>
            <NftCard nft={nft} priority={index < 3} />
          </li>
        ))}
      </ul>
      {page.page > page.totalPages ? (
        <OutOfRange onFirstPage={() => update({ page: 1 })} />
      ) : (
        <CatalogPagination
          page={page.page}
          totalPages={page.totalPages}
          onChange={(next) => update({ page: next })}
        />
      )}
    </div>
  )
}

const clearedFilters: Partial<CatalogSearch> = {
  q: '',
  collections: [],
  networks: [],
  minPrice: undefined,
  maxPrice: undefined,
  tab: 'all',
}

function EmptyState({ search, onClear }: { search: CatalogSearch; onClear: () => void }) {
  const filtered = hasActiveFilters(search)
  return (
    <div
      role="status"
      className="flex flex-col items-start gap-4 rounded-lg bg-surface-card p-8 text-foreground"
    >
      <h3 className="text-lg font-bold">Nenhum NFT encontrado</h3>
      <p className="text-sm text-text-secondary">
        {filtered
          ? 'Nenhum item corresponde à busca e aos filtros selecionados.'
          : 'Ainda não há NFTs disponíveis no catálogo.'}
      </p>
      {filtered && (
        <button
          type="button"
          onClick={onClear}
          className="rounded-[6px] border border-border-soft px-4 py-2 text-sm font-bold text-text-accent hover:bg-surface-dark focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          Limpar filtros
        </button>
      )}
    </div>
  )
}

function OutOfRange({ onFirstPage }: { onFirstPage: () => void }) {
  return (
    <div role="status" className="w-full text-sm text-text-secondary">
      Essa página não existe para os filtros atuais.{' '}
      <button type="button" onClick={onFirstPage} className="font-bold text-text-accent underline">
        Ir para a primeira página
      </button>
    </div>
  )
}
