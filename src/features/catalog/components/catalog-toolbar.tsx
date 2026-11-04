import { cn } from 'cn'
import { SORTS, TABS, sortIdSchema, type TabId } from '@/api/contracts/catalog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCatalogSearch } from '../use-catalog-search'

/** Tabs (Todos / Novos lançamentos / Em alta) on the left, sort on the right. */
export function CatalogTabs() {
  const { search, update } = useCatalogSearch()

  return (
    <div
      role="group"
      aria-label="Seleção do catálogo"
      className="-mx-1 flex [scrollbar-width:none] gap-3 overflow-x-auto px-1 text-sm whitespace-nowrap sm:gap-4 md:gap-5 md:text-[15px]"
    >
      {(Object.keys(TABS) as TabId[]).map((tab) => {
        const active = search.tab === tab
        return (
          <button
            key={tab}
            type="button"
            aria-pressed={active}
            onClick={() => update({ tab })}
            className={cn(
              'flex flex-col gap-1 py-1 leading-4 focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none md:font-medium',
              active
                ? 'font-bold text-text-accent after:h-0.5 after:w-full after:bg-primary'
                : 'text-foreground hover:text-text-accent',
            )}
          >
            {TABS[tab]}
          </button>
        )
      })}
    </div>
  )
}

export function CatalogSort({ className }: { className?: string }) {
  const { search, update } = useCatalogSearch()

  return (
    <div className={cn('flex items-center gap-2 text-[15px] text-foreground', className)}>
      <span id="sort-label">Ordenar por:</span>
      <Select
        value={search.sort}
        onValueChange={(value) => {
          const sort = sortIdSchema.safeParse(value)
          if (sort.success) update({ sort: sort.data })
        }}
      >
        <SelectTrigger
          aria-labelledby="sort-label"
          className="h-auto gap-3 border-0 bg-transparent p-0 text-[15px] text-foreground shadow-none hover:text-text-accent focus-visible:ring-2 focus-visible:ring-ring dark:bg-transparent [&_svg:not([class*='text-'])]:text-foreground"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper" align="end" className="border-border bg-surface-card">
          {Object.entries(SORTS).map(([id, label]) => (
            <SelectItem key={id} value={id} className="text-sm focus:bg-surface-dark">
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
