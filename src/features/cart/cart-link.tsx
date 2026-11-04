import { Link } from '@tanstack/react-router'
import { cn } from 'cn'
import { useCart } from './use-cart'

/**
 * Cart icon with the item-count badge (Figma "Cart" + "Badge"). The count is the total number of
 * units in the cart and is part of the link's accessible name.
 */
export function CartLink({
  icon,
  iconSize,
  className,
}: {
  icon: string
  iconSize: [number, number]
  className?: string
}) {
  const cart = useCart()
  const count = cart.data?.itemCount ?? 0
  const label = count === 1 ? 'Carrinho, 1 item' : `Carrinho, ${count} itens`

  return (
    <Link
      to="/carrinho"
      aria-label={label}
      className={cn(
        'relative inline-flex items-center justify-center rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        className,
      )}
    >
      <img src={icon} alt="" width={iconSize[0]} height={iconSize[1]} />
      {count > 0 && (
        <span
          aria-hidden="true"
          className="absolute -top-1 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-ink bg-primary px-0.5 text-[10px] leading-none font-medium text-ink"
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  )
}
