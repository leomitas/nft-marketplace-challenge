import { cn } from 'cn'
import { Eye } from 'lucide-react'
import { useId, useState, type InputHTMLAttributes } from 'react'
import hideIcon from '@/assets/figma/icon-hide.svg'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'size'> & {
  label: string
  /** The auth layouts show only placeholders; the label stays available to screen readers. */
  hideLabel?: boolean
  error?: string
  hint?: string
  size?: 'md' | 'lg'
}

/**
 * Input with label, hint and error wired through aria-describedby/aria-invalid.
 * `type="password"` gets the show/hide toggle from the layout.
 */
export function TextField({
  label,
  hideLabel,
  error,
  hint,
  size = 'md',
  type = 'text',
  className,
  ...props
}: Props) {
  const id = useId()
  const [revealed, setRevealed] = useState(false)
  const isPassword = type === 'password'
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ')

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className={cn('text-sm text-foreground', hideLabel && 'sr-only')}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={isPassword && revealed ? 'text' : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          className={cn(
            'w-full border bg-transparent px-4 text-sm text-foreground placeholder:text-brand-secondary',
            'focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary focus-visible:outline-none',
            size === 'lg' ? 'h-[50px] rounded-[10px]' : 'h-10 rounded-[5px]',
            error ? 'border-destructive' : 'border-border',
            isPassword && 'pr-12',
          )}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setRevealed((value) => !value)}
            aria-label={revealed ? 'Ocultar senha' : 'Mostrar senha'}
            aria-pressed={revealed}
            aria-controls={id}
            className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            {/* Figma draws only the "hidden" eye; the revealed state uses an open eye */}
            {revealed ? (
              <Eye className="size-5 text-text-secondary" aria-hidden="true" />
            ) : (
              <img src={hideIcon} alt="" width={20} height={18} />
            )}
          </button>
        )}
      </div>
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-text-secondary">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
