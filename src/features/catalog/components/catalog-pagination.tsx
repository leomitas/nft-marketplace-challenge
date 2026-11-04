import { cn } from 'cn'
import chevronDown from '@/assets/figma/icon-chevron-down.svg'
import { pageWindow } from '../page-window'

const squareClass =
  'flex size-[35px] items-center justify-center rounded-[4px] text-lg leading-4 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-ink focus-visible:outline-none'

export function CatalogPagination({
  page,
  totalPages,
  onChange,
}: {
  page: number
  totalPages: number
  onChange: (page: number) => void
}) {
  if (totalPages <= 1) return null

  return (
    <nav aria-label="Paginação" className="w-full md:w-auto">
      <ul className="flex flex-wrap items-center justify-center gap-2">
        {/* Figma chevron points down; rotated -90° for "next", as in the design */}
        {page > 1 && (
          <li>
            <button
              type="button"
              onClick={() => onChange(page - 1)}
              className={cn(squareClass, 'border border-border hover:bg-surface-card')}
              aria-label="Página anterior"
            >
              <img src={chevronDown} alt="" width={12} height={7} className="rotate-90" />
            </button>
          </li>
        )}
        {pageWindow(page, totalPages).map((item, index) =>
          item === 'gap' ? (
            <li key={`gap-${index}`} aria-hidden="true" className="px-1 text-foreground">
              …
            </li>
          ) : (
            <li key={item}>
              <button
                type="button"
                onClick={() => onChange(item)}
                aria-current={item === page ? 'page' : undefined}
                aria-label={`Página ${item}`}
                className={cn(
                  squareClass,
                  item === page
                    ? 'bg-primary font-bold text-ink'
                    : 'border border-border text-foreground hover:bg-surface-card',
                )}
              >
                {item}
              </button>
            </li>
          ),
        )}
        {page < totalPages && (
          <li>
            <button
              type="button"
              onClick={() => onChange(page + 1)}
              className={cn(squareClass, 'border border-border hover:bg-surface-card')}
              aria-label="Próxima página"
            >
              <img src={chevronDown} alt="" width={12} height={7} className="-rotate-90" />
            </button>
          </li>
        )}
      </ul>
    </nav>
  )
}
