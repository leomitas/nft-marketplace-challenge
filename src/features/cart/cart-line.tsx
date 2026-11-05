import { Link } from '@tanstack/react-router'
import { cn } from 'cn'
import { useId } from 'react'
import type { CartLine } from '@/api/contracts/cart'
import deleteIcon from '@/assets/figma/icon-delete.svg'
import { toast } from '@/components/ui/toaster'
import { QuantityStepper } from '@/features/nft/quantity-stepper'
import { formatEth } from '@/lib/money'
import { useAddToCart, useRemoveCartLine, useUpdateCartLine } from './use-cart'

function useLineActions(line: CartLine) {
  const update = useUpdateCartLine()
  const remove = useRemoveCartLine()
  const add = useAddToCart()
  // Stock and the per-order cap bound the quantity. A line already above it (stock dropped)
  // keeps its value as the ceiling, so "+" is disabled and only "−" works
  const max = Math.max(Math.min(line.available, line.maxPerOrder), line.quantity)
  const pending = update.isPending || remove.isPending

  function setQuantity(quantity: number) {
    update.mutate({ lineId: line.id, quantity }, { onError: (error) => toast.error(error.message) })
  }

  function removeLine() {
    remove.mutate(line.id, {
      onSuccess: () =>
        toast(`${line.name} (${line.editionLabel}) removido do carrinho.`, {
          action: {
            label: 'Desfazer',
            onClick: () =>
              add.mutate(
                { nftId: line.nftId, editionId: line.editionId, quantity: line.quantity },
                { onError: (error) => toast.error(error.message) },
              ),
          },
        }),
      onError: (error) => toast.error(error.message),
    })
  }

  return { max, pending, setQuantity, removeLine }
}

const limitText = (line: CartLine) =>
  line.available < line.maxPerOrder
    ? `Apenas ${line.available} ${line.available === 1 ? 'disponível' : 'disponíveis'} nesta edição.`
    : `Limite de ${line.maxPerOrder} por pedido.`

function RemoveButton({
  line,
  onClick,
  disabled,
}: {
  line: CartLine
  onClick: () => void
  disabled: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={`Remover ${line.name} (${line.editionLabel}) do carrinho`}
      className="flex size-9 shrink-0 items-center justify-center rounded-full hover:bg-surface-dark focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50"
    >
      <img src={deleteIcon} alt="" width={18} height={20} />
    </button>
  )
}

function NftLink({ line, className }: { line: CartLine; className?: string }) {
  return (
    <Link
      to="/nfts/$nftId"
      params={{ nftId: line.nftId }}
      search={{ edition: line.editionId }}
      className={cn(
        'hover:underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        className,
      )}
    >
      {line.name}
    </Link>
  )
}

/** Desktop row: NFT | price | quantity | total | remove (Figma "Cart Table"). */
/**
 * Column template shared by the desktop table header and every row: fixed tracks, so a row with
 * extra content (e.g. a stock warning) can't push its columns out of line with the others.
 */
export const CART_TABLE_COLUMNS = 'grid-cols-[250px_minmax(0,1fr)_110px_100px_36px]'

export function CartLineRow({ line }: { line: CartLine }) {
  const { max, pending, setQuantity, removeLine } = useLineActions(line)
  const stockCap = Math.min(line.available, line.maxPerOrder)
  const limitId = useId()
  const limit = line.quantity >= stockCap ? limitText(line) : undefined

  return (
    <li
      aria-busy={pending}
      className={cn(
        'grid min-h-[70px] items-center gap-x-4 bg-surface-card pr-6 transition-opacity',
        CART_TABLE_COLUMNS,
        pending && 'opacity-70',
      )}
    >
      <div className={cn('flex items-center gap-4', limit && 'row-span-2')}>
        <img
          src={line.image.src}
          srcSet={line.image.srcSet}
          sizes="70px"
          alt=""
          width={70}
          height={70}
          loading="lazy"
          className="size-[70px] shrink-0 rounded-[6px] object-cover"
        />
        <div className="flex min-w-0 flex-col gap-1.5 leading-4">
          <NftLink line={line} className="text-base font-bold text-foreground" />
          <p className="text-sm text-brand-secondary">ID do token: {line.tokenId}</p>
          <p className="text-xs text-text-secondary">Edição {line.editionLabel}</p>
        </div>
      </div>
      <p className="text-base leading-4 font-bold whitespace-nowrap text-text-secondary">
        <span className="sr-only">Preço unitário: </span>
        {formatEth(line.unitPriceEth)}
      </p>
      <QuantityStepper
        value={line.quantity}
        max={max}
        onChange={setQuantity}
        size="sm"
        label={`Quantidade de ${line.name}`}
        disabled={pending}
        limitReason={limit}
        limitId={limit ? limitId : undefined}
      />
      <p className="text-base leading-4 font-bold whitespace-nowrap text-text-accent">
        <span className="sr-only">Total do item: </span>
        {formatEth(line.lineTotalEth)}
      </p>
      <RemoveButton line={line} onClick={removeLine} disabled={pending} />
      {limit && (
        // Own row under the quantity control, spanning to the end, so the columns above stay put
        <p id={limitId} className="col-span-3 col-start-3 -mt-2 pb-2 text-xs text-text-secondary">
          {limit}
        </p>
      )}
    </li>
  )
}

/** Mobile card: artwork, name, edition, line total and stepper (Figma mobile cart). */
export function CartLineCard({ line }: { line: CartLine }) {
  const { max, pending, setQuantity, removeLine } = useLineActions(line)
  const stockCap = Math.min(line.available, line.maxPerOrder)

  return (
    <li
      aria-busy={pending}
      className={cn(
        'flex min-h-[100px] overflow-hidden rounded-[10px] bg-surface-card transition-opacity',
        pending && 'opacity-70',
      )}
    >
      <img
        src={line.image.src}
        srcSet={line.image.srcSet}
        sizes="100px"
        alt=""
        width={100}
        height={100}
        loading="lazy"
        className="w-[100px] shrink-0 object-cover"
      />
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-1 py-3 pr-2 pl-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <NftLink
              line={line}
              className="block truncate text-[15px] leading-5 font-bold text-foreground"
            />
            <p className="text-sm text-brand-secondary">Edição: {line.editionLabel}</p>
          </div>
          <RemoveButton line={line} onClick={removeLine} disabled={pending} />
        </div>
        <div className="flex items-end justify-between gap-2">
          <p className="text-lg leading-5 font-bold text-text-accent">
            <span className="sr-only">Total do item: </span>
            {formatEth(line.lineTotalEth)}
          </p>
          <QuantityStepper
            value={line.quantity}
            max={max}
            onChange={setQuantity}
            size="sm"
            tone="dark"
            label={`Quantidade de ${line.name}`}
            disabled={pending}
            limitReason={line.quantity >= stockCap ? limitText(line) : undefined}
          />
        </div>
      </div>
    </li>
  )
}
