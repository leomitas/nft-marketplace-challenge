import { Dialog as DialogPrimitive } from 'radix-ui'
import { ApiError } from '@/api/client'
import type { Cart, Quote } from '@/api/contracts/cart'
import { NETWORKS, type NetworkId } from '@/api/contracts/catalog'
import type { Collector } from '@/api/contracts/orders'
import { WALLET_PROVIDERS, type Wallet, type WalletProvider } from '@/api/contracts/wallets'
import closeIcon from '@/assets/figma/icon-close.svg'
import { CartIssues } from '@/features/cart/cart-issues'
import { Totals } from '@/features/cart/cart-summary'
import { formatEth } from '@/lib/money'
import { shortHex } from './format'
import { useCreateOrder } from './use-checkout'

export type ReviewPayload = {
  collector: Collector
  wallet: Wallet
  provider: WalletProvider
  network: NetworkId
  /** Quote the user is looking at; sent with the order so the server can detect changes. */
  quoteId: string
}

/**
 * Last step before paying: everything that will be sent, and the current quote. If the quote
 * moves while the dialog is open (or the server rejects it), the user must accept the new
 * values before confirming again.
 */
export function ReviewDialog({
  payload,
  cart,
  quote,
  onAcceptQuote,
  onClose,
  onWalletDisconnected,
}: {
  payload: ReviewPayload
  cart: Cart
  quote: Quote
  onAcceptQuote: (quoteId: string) => void
  onClose: () => void
  onWalletDisconnected: () => void
}) {
  const order = useCreateOrder()
  const quoteChanged = quote.id !== payload.quoteId
  const blocked = !quote.purchasable || quoteChanged
  const error = order.error instanceof ApiError ? order.error : null

  const confirm = () => {
    if (order.isPending || blocked) return
    order.mutate(
      {
        quoteId: payload.quoteId,
        collector: payload.collector,
        walletId: payload.wallet.id,
        provider: payload.provider,
        network: payload.network,
      },
      {
        onError: (e) => {
          if (e instanceof ApiError && e.code === 'WALLET_NOT_CONNECTED') onWalletDisconnected()
        },
      },
    )
  }

  return (
    <DialogPrimitive.Root
      open
      // While the order is being sent the dialog stays: closing it would hide the outcome
      onOpenChange={(open) => !open && !order.isPending && onClose()}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-ink/75" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col gap-5 overflow-y-auto rounded-t-[30px] bg-surface-card p-6 text-foreground shadow-xl focus:outline-none md:inset-x-auto md:top-1/2 md:bottom-auto md:left-1/2 md:w-[578px] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-none md:border-b-[10px] md:border-primary md:px-11"
        >
          <div className="flex items-start justify-between gap-4">
            <DialogPrimitive.Title className="text-xl leading-6 font-bold">
              Revise seu pedido
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              disabled={order.isPending}
              aria-label="Voltar e editar"
              className="flex size-8 items-center justify-center rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50"
            >
              <img src={closeIcon} alt="" width={16} height={16} />
            </DialogPrimitive.Close>
          </div>

          <ul aria-label="Itens do pedido" className="flex flex-col gap-3">
            {cart.lines.map((line) => (
              <li key={line.id} className="flex items-center gap-3 text-sm">
                <img
                  src={line.image.src}
                  alt=""
                  width={48}
                  height={48}
                  className="size-12 shrink-0 rounded-[6px] object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{line.name}</p>
                  <p className="text-xs text-text-secondary">
                    {line.editionLabel} · {formatEth(line.unitPriceEth)} cada
                  </p>
                </div>
                <span className="text-xs text-text-secondary">(x {line.quantity})</span>
                <span className="font-bold text-text-accent">{formatEth(line.lineTotalEth)}</span>
              </li>
            ))}
          </ul>

          <Totals quote={quote} updating={false} mobile />

          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 border-t border-foreground/20 pt-4 text-sm">
            <dt className="text-text-secondary">Colecionador</dt>
            <dd>
              {payload.collector.displayName} (@{payload.collector.username})
            </dd>
            <dt className="text-text-secondary">E-mail</dt>
            <dd className="break-all">{payload.collector.email}</dd>
            <dt className="text-text-secondary">Carteira</dt>
            <dd>
              {payload.wallet.label} · {shortHex(payload.wallet.address)} via{' '}
              {WALLET_PROVIDERS[payload.provider]}
            </dd>
            <dt className="text-text-secondary">Rede</dt>
            <dd>{NETWORKS[payload.network]}</dd>
            {payload.collector.note && (
              <>
                <dt className="text-text-secondary">Observação</dt>
                <dd className="break-words">{payload.collector.note}</dd>
              </>
            )}
          </dl>

          {!quote.purchasable ? (
            <CartIssues cart={cart} />
          ) : (
            quoteChanged && (
              <div
                role="alert"
                className="flex flex-col gap-2 rounded-[6px] border border-primary/70 bg-primary/10 p-3 text-sm"
              >
                <p>
                  Os valores mudaram desde a sua revisão. Novo total:{' '}
                  <strong className="text-text-accent">{formatEth(quote.totalEth)}</strong>.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    order.reset()
                    onAcceptQuote(quote.id)
                  }}
                  className="self-start rounded-[3px] bg-primary px-3 py-1.5 font-bold text-ink"
                >
                  Aceitar novos valores
                </button>
              </div>
            )
          )}

          {error && !blocked && (
            <p role="alert" className="text-sm text-destructive">
              {error.isTransient
                ? 'Não recebemos a confirmação do servidor. Tente de novo: o mesmo pedido será recuperado, sem cobrança duplicada.'
                : error.message}
            </p>
          )}

          <div className="flex flex-col gap-3 md:flex-row-reverse">
            <button
              type="button"
              onClick={confirm}
              disabled={order.isPending || blocked}
              aria-busy={order.isPending}
              className="h-[50px] flex-1 rounded-full bg-primary text-base font-bold text-ink hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface-card focus-visible:outline-none disabled:opacity-60 md:h-10 md:rounded-[3px]"
            >
              {order.isPending ? 'Enviando pedido...' : 'Confirmar e pagar'}
            </button>
            <DialogPrimitive.Close
              disabled={order.isPending}
              className="h-[50px] flex-1 rounded-full border border-primary font-bold text-text-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-60 md:h-10 md:rounded-[3px]"
            >
              Voltar e editar
            </DialogPrimitive.Close>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
