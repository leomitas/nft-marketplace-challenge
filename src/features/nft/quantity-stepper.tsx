import { cn } from 'cn'
import { useId } from 'react'
import minusIcon from '@/assets/figma/icon-minus.svg'
import plusIcon from '@/assets/figma/icon-plus.svg'

/**
 * −/+ stepper from the layout. Quantities are integers between 1 and `max`; the reason for
 * the limit is announced next to it.
 */
export function QuantityStepper({
  value,
  max,
  onChange,
  size = 'lg',
  limitReason,
  label = 'Quantidade',
  showLabel = false,
  disabled = false,
}: {
  value: number
  max: number
  onChange: (value: number) => void
  size?: 'lg' | 'sm'
  limitReason?: string
  label?: string
  showLabel?: boolean
  disabled?: boolean
}) {
  const id = useId()
  const atMax = value >= max
  const button = cn(
    'flex items-center justify-center rounded-full border border-ink bg-primary shadow-[0_6px_10px_rgba(20,13,10,0.15)]',
    'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-ink focus-visible:outline-none',
    'disabled:cursor-not-allowed disabled:opacity-40',
    size === 'lg' ? 'h-[49.5px] w-[33px]' : 'h-[30px] w-5',
  )
  const icon = size === 'lg' ? 26 : 16

  return (
    <div className="flex flex-col gap-1">
      <div role="group" aria-labelledby={`${id}-label`} className="flex items-center gap-2">
        <span
          id={`${id}-label`}
          className={cn(
            showLabel ? 'text-[15px] leading-4 font-medium text-text-secondary' : 'sr-only',
          )}
        >
          {label}
        </span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className={button}
            onClick={() => onChange(value - 1)}
            disabled={disabled || value <= 1}
            aria-label="Diminuir quantidade"
          >
            <img src={minusIcon} alt="" width={icon} height={icon} />
          </button>
          <output
            aria-live="polite"
            className={cn(
              'min-w-4 text-center text-foreground',
              size === 'lg' ? 'text-xl leading-7' : 'text-lg leading-[25px] font-medium',
            )}
          >
            {value}
          </output>
          <button
            type="button"
            className={button}
            onClick={() => onChange(value + 1)}
            disabled={disabled || atMax}
            aria-label="Aumentar quantidade"
            aria-describedby={atMax && limitReason ? `${id}-limit` : undefined}
          >
            <img src={plusIcon} alt="" width={icon} height={icon} />
          </button>
        </div>
      </div>
      {atMax && limitReason && (
        <p id={`${id}-limit`} className="text-xs text-text-secondary">
          {limitReason}
        </p>
      )}
    </div>
  )
}
