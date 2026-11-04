import { useNavigate, useRouterState } from '@tanstack/react-router'
import { cn } from 'cn'
import type { NftSummary } from '@/api/contracts/catalog'
import heartIcon from '@/assets/figma/icon-heart.svg'
import favFilled from '@/assets/figma/m-fav-filled.svg'
import favOutline from '@/assets/figma/m-fav-outline.svg'
import { useSession } from '@/features/auth/use-session'
import { useFavoriteIds, useToggleFavorite } from './use-favorites'

type Variant = 'detail' | 'round' | 'card'

/**
 * Favorite toggle in the three shapes of the layout. Visitors are sent to login and come
 * back to the same page afterwards.
 */
export function FavoriteButton({
  nft,
  variant,
  className,
}: {
  nft: NftSummary
  variant: Variant
  className?: string
}) {
  const { user } = useSession()
  const favorites = useFavoriteIds()
  const toggle = useToggleFavorite(nft)
  const navigate = useNavigate()
  const href = useRouterState({ select: (s) => s.location.href })
  const active = favorites.has(nft.id)

  function onClick() {
    if (!user) {
      void navigate({ to: '/login', search: { redirect: href } })
      return
    }
    toggle.mutate(!active)
  }

  const label = active ? `Remover ${nft.name} dos favoritos` : `Favoritar ${nft.name}`

  if (variant === 'detail') {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        aria-label={label}
        className={cn(
          'flex h-10 w-[130px] items-center justify-center gap-2 rounded-[6px] border border-primary text-sm leading-5 font-medium text-text-accent hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-ink focus-visible:outline-none',
          active && 'bg-primary/15',
          className,
        )}
      >
        {active ? (
          <FilledHeart className="size-5" />
        ) : (
          <img src={heartIcon} alt="" width={20} height={20} />
        )}
        {active ? 'Favoritado' : 'Favoritar'}
      </button>
    )
  }

  // Round 35px (mobile detail) and 28px (mobile card) buttons share the Figma heart assets
  const size = variant === 'round' ? 35 : 28
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      className={cn(
        'relative flex shrink-0 items-center justify-center rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        variant === 'round' ? 'size-[35px]' : 'size-7',
        className,
      )}
    >
      {active ? (
        <span className="flex size-full items-center justify-center rounded-full border border-primary bg-surface-raised">
          <FilledHeart className={variant === 'round' ? 'size-4' : 'size-3.5'} />
        </span>
      ) : (
        <img
          src={variant === 'round' ? favOutline : favFilled}
          alt=""
          width={size}
          height={size}
          className="size-full"
        />
      )}
    </button>
  )
}

// The layout only draws the outline heart; the "favorited" state uses the same shape filled
function FilledHeart({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 18" aria-hidden="true" className={cn('fill-primary', className)}>
      <path d="M18.41 1.74A5.4 5.4 0 0 0 14.41 0c-1.15 0-2.21.36-3.14 1.08-.47.37-.9.81-1.27 1.33A6.3 6.3 0 0 0 8.73 1.08 5.06 5.06 0 0 0 5.59 0a5.4 5.4 0 0 0-4 1.74A6.3 6.3 0 0 0 0 6.01c0 1.69.63 3.24 1.98 4.87 1.21 1.46 2.95 2.95 4.97 4.67.69.58 1.47 1.25 2.28 1.96a1.17 1.17 0 0 0 1.54 0c.81-.71 1.59-1.37 2.28-1.96 2.01-1.72 3.75-3.2 4.96-4.66C19.37 9.25 20 7.7 20 6.01c0-1.64-.56-3.16-1.59-4.27Z" />
    </svg>
  )
}
