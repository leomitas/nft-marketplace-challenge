import { cn } from 'cn'
import filterIcon from '@/assets/figma/m-icon-filter.svg'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { CatalogFilters } from './catalog-filters'
import { CatalogSort } from './catalog-toolbar'
import { useCatalogSearch } from '../use-catalog-search'

/**
 * Below the desktop breakpoint the sidebar becomes a drawer. Radix Dialog traps focus
 * inside it and returns focus to the trigger on close.
 */
export function FiltersSheet({ variant }: { variant: 'icon' | 'text' }) {
  const { search } = useCatalogSearch()
  const activeCount =
    search.collections.length +
    search.networks.length +
    (search.minPrice || search.maxPrice ? 1 : 0)

  return (
    <Sheet>
      <SheetTrigger
        className={cn(
          'relative shrink-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-ink focus-visible:outline-none',
          variant === 'icon'
            ? 'flex size-[45px] items-center justify-center rounded-[14px] bg-linear-[137deg] from-primary/45 from-25% to-primary'
            : 'rounded-[6px] border border-border-soft px-3 py-1.5 text-sm font-bold text-foreground',
        )}
        aria-label={variant === 'icon' ? 'Abrir filtros' : undefined}
      >
        {variant === 'icon' ? <img src={filterIcon} alt="" width={16} height={16} /> : 'Filtros'}
        {activeCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full border-2 border-ink bg-primary text-[10px] font-medium text-ink">
            {activeCount}
            <span className="sr-only"> filtros ativos</span>
          </span>
        )}
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-[85vw] max-w-[340px] overflow-y-auto border-border bg-surface-card p-0"
      >
        <SheetHeader className="px-5 pt-5 pb-0">
          <SheetTitle className="text-lg font-bold text-foreground">Filtros</SheetTitle>
          <SheetDescription className="text-text-secondary">
            Os resultados são atualizados a cada alteração.
          </SheetDescription>
        </SheetHeader>
        <CatalogSort className="px-5 pt-4 md:hidden" />
        <CatalogFilters className="bg-transparent" />
      </SheetContent>
    </Sheet>
  )
}
