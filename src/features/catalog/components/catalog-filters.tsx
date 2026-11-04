import { useQuery } from '@tanstack/react-query'
import { cn } from 'cn'
import { Check } from 'lucide-react'
import { useId, useState } from 'react'
import type { CatalogFacets } from '@/api/contracts/catalog'
import { Skeleton } from '@/components/ui/skeleton'
import { Slider } from '@/components/ui/slider'
import { ethToHundredths, formatEth, hundredthsToEth } from '@/lib/money'
import { catalogFacetsQuery } from '../queries'
import { useCatalogSearch } from '../use-catalog-search'

/** "Filters" panel from Figma: collections, price range and network. */
export function CatalogFilters({ className }: { className?: string }) {
  const facets = useQuery(catalogFacetsQuery())

  return (
    <div className={cn('flex flex-col gap-10 bg-surface-card p-5', className)}>
      {facets.isPending && <FiltersSkeleton />}
      {facets.isError && (
        <div role="alert" className="flex flex-col items-start gap-3 text-sm text-text-secondary">
          Não foi possível carregar os filtros.
          <button
            type="button"
            onClick={() => facets.refetch()}
            className="font-bold text-text-accent underline underline-offset-4"
          >
            Tentar novamente
          </button>
        </div>
      )}
      {facets.data && <FiltersContent facets={facets.data} />}
    </div>
  )
}

function FiltersContent({ facets }: { facets: CatalogFacets }) {
  const { search, update } = useCatalogSearch()

  const toggle = <T extends string>(list: readonly T[], value: T) =>
    list.includes(value) ? list.filter((item) => item !== value) : [...list, value]

  return (
    <>
      <CheckboxGroup
        legend="Coleções"
        options={facets.collections}
        selected={search.collections}
        onToggle={(id) => update({ collections: toggle(search.collections, id) })}
      />
      {/* key: a URL change (e.g. back button) remounts the slider with the new bounds */}
      <PriceFilter
        key={`${search.minPrice}-${search.maxPrice}`}
        bounds={facets.price}
        minPrice={search.minPrice}
        maxPrice={search.maxPrice}
        onApply={(minPrice, maxPrice) => update({ minPrice, maxPrice })}
      />
      <CheckboxGroup
        legend="Rede"
        options={facets.networks}
        selected={search.networks}
        onToggle={(id) => update({ networks: toggle(search.networks, id) })}
      />
    </>
  )
}

function CheckboxGroup<T extends string>({
  legend,
  options,
  selected,
  onToggle,
}: {
  legend: string
  options: { id: T; label: string; count: number }[]
  selected: readonly T[]
  onToggle: (id: T) => void
}) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-3 text-lg leading-4 font-bold text-foreground">{legend}</legend>
      <ul className="px-3">
        {options.map((option) => {
          const checked = selected.includes(option.id)
          return (
            <li key={option.id}>
              <label
                className={cn(
                  'group flex cursor-pointer items-center justify-between gap-2 text-[15px] leading-10',
                  checked ? 'text-text-accent' : 'text-text-secondary hover:text-foreground',
                )}
              >
                <span className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggle(option.id)}
                    className="peer sr-only"
                  />
                  {/* Check mark: selection is not conveyed by color alone */}
                  <span
                    aria-hidden="true"
                    className={cn(
                      'flex size-3.5 items-center justify-center rounded-[3px] border transition-colors',
                      'peer-focus-visible:ring-2 peer-focus-visible:ring-ring',
                      checked ? 'border-text-accent bg-text-accent text-ink' : 'border-border-soft',
                    )}
                  >
                    {checked && <Check className="size-3" strokeWidth={3} />}
                  </span>
                  {option.label}
                </span>
                <span className="font-bold">({option.count})</span>
              </label>
            </li>
          )
        })}
      </ul>
    </fieldset>
  )
}

function PriceFilter({
  bounds,
  minPrice,
  maxPrice,
  onApply,
}: {
  bounds: CatalogFacets['price']
  minPrice?: string
  maxPrice?: string
  onApply: (min: string | undefined, max: string | undefined) => void
}) {
  const id = useId()
  const lower = ethToHundredths(bounds.minEth, 'down')
  const upper = ethToHundredths(bounds.maxEth, 'up')
  const [range, setRange] = useState<[number, number]>([
    minPrice ? ethToHundredths(minPrice) : lower,
    maxPrice ? ethToHundredths(maxPrice, 'up') : upper,
  ])
  const [from, to] = range.map(hundredthsToEth)

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-3 text-lg leading-4 font-bold text-foreground">Faixa de preço</legend>
      <div className="flex flex-col gap-3 pl-3">
        <Slider
          min={lower}
          max={upper}
          step={1}
          minStepsBetweenThumbs={1}
          value={range}
          onValueChange={(value) => setRange([value[0], value[1]])}
          aria-labelledby={`${id}-label`}
          thumbLabels={['Preço mínimo', 'Preço máximo']}
          formatValueText={(value) => formatEth(hundredthsToEth(value))}
        />
        <p id={`${id}-label`} className="text-[15px] text-foreground" aria-live="polite">
          Preço: {formatEth(from).replace(' ETH', '')} - {formatEth(to)}
        </p>
        <button
          type="button"
          onClick={() =>
            // Bounds mean "no limit", so they are left out of the URL
            onApply(range[0] > lower ? from : undefined, range[1] < upper ? to : undefined)
          }
          className="self-start rounded-[6px] bg-primary px-3 py-2 text-base leading-5 font-bold text-ink hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface-card focus-visible:outline-none"
        >
          Aplicar
        </button>
      </div>
    </fieldset>
  )
}

function FiltersSkeleton() {
  return (
    <div className="flex flex-col gap-10" aria-hidden="true">
      {[9, 2, 3].map((rows, group) => (
        <div key={group} className="flex flex-col gap-4">
          <Skeleton className="h-4 w-32" />
          {Array.from({ length: rows }, (_, i) => (
            <Skeleton key={i} className="ml-3 h-6 w-[85%]" />
          ))}
        </div>
      ))}
    </div>
  )
}
