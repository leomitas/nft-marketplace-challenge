import { cn } from 'cn'
import { useId } from 'react'
import type { Edition, EditionId } from '@/api/contracts/catalog'

/**
 * "Edição" chips. Native radio inputs give arrow-key navigation and a single tab stop;
 * sold-out tiers stay visible but disabled and struck through (state not only by color).
 */
export function EditionPicker({
  editions,
  value,
  onChange,
  gap = 'gap-1.5',
}: {
  editions: Edition[]
  value: EditionId | undefined
  onChange: (id: EditionId) => void
  gap?: string
}) {
  // Unique group name: desktop and mobile pickers coexist in the DOM and must not share one
  const name = useId()
  return (
    <fieldset className="flex flex-col gap-2 md:gap-3">
      <legend className="mb-2 text-[15px] leading-4 font-bold text-foreground md:mb-3">
        Edição:
      </legend>
      <div className={cn('flex flex-wrap items-center', gap)}>
        {editions.map((edition) => {
          const soldOut = edition.available === 0
          const checked = edition.id === value
          return (
            <label
              key={edition.id}
              className={cn(
                'relative flex h-7 min-w-[42px] items-center justify-center rounded-full border px-2 text-sm leading-4',
                'has-focus-visible:ring-2 has-focus-visible:ring-ring',
                checked
                  ? 'border-primary font-medium text-text-accent'
                  : 'border-border-soft text-text-secondary',
                soldOut
                  ? 'cursor-not-allowed line-through opacity-60'
                  : 'cursor-pointer hover:border-primary/70',
              )}
            >
              <input
                type="radio"
                name={name}
                value={edition.id}
                checked={checked}
                disabled={soldOut}
                onChange={() => onChange(edition.id)}
                className="sr-only"
              />
              {edition.label}
              <span className="sr-only">
                {soldOut ? ' (esgotada)' : ` (${edition.available} disponíveis)`}
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
