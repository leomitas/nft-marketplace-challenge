import { createFileRoute, Link } from '@tanstack/react-router'
import type { Cart } from '@/api/contracts/cart'
import { MobilePageHeader } from '@/components/layout/mobile-page-header'
import { PageShell } from '@/components/layout/page-shell'
import { Skeleton } from '@/components/ui/skeleton'
import { CartIssues } from '@/features/cart/cart-issues'
import { CART_TABLE_COLUMNS, CartLineCard, CartLineRow } from '@/features/cart/cart-line'
import { CartSummary } from '@/features/cart/cart-summary'
import { useCart, useQuote } from '@/features/cart/use-cart'
import { RelatedCarousel } from '@/features/nft/related-carousel'

export const Route = createFileRoute('/carrinho')({
  head: () => ({ meta: [{ title: 'Carrinho · Kurio' }] }),
  // The mobile cart frame has its own header and bottom summary instead of the tab bar
  staticData: { hideTabBar: true },
  component: CartPage,
})

function CartPage() {
  const cart = useCart()

  return (
    <PageShell section="market" headerDivider={false}>
      <div className="flex flex-col gap-3">
        <nav
          aria-label="Trilha"
          className="hidden text-[15px] leading-4 font-bold text-foreground md:block"
        >
          <Link to="/" className="hover:underline">
            Início
          </Link>{' '}
          /{' '}
          <Link to="/" hash="catalogo" className="hover:underline">
            Mercado
          </Link>{' '}
          / <span aria-current="page">Carrinho</span>
        </nav>
        <MobilePageHeader title="Carrinho de NFTs" />
        <h1 className="sr-only">Carrinho de NFTs</h1>

        {cart.isPending && <CartSkeleton />}
        {cart.isError && (
          <div
            role="alert"
            className="flex flex-col items-start gap-4 rounded-lg bg-surface-card p-8"
          >
            <p>Não foi possível carregar seu carrinho.</p>
            <button
              type="button"
              onClick={() => cart.refetch()}
              className="rounded-[6px] bg-primary px-4 py-2 font-bold text-ink"
            >
              Tentar novamente
            </button>
          </div>
        )}
        {cart.data && (cart.data.lines.length ? <CartContent cart={cart.data} /> : <EmptyCart />)}
      </div>

      {/* Not in the mobile frame, whose bottom is taken by the summary sheet */}
      <div className="hidden md:block">
        <RelatedCarousel
          title="Colecionadores também viram"
          query={{ tab: 'trending', pageSize: 12 }}
          excludeIds={cart.data?.lines.map((line) => line.nftId)}
        />
      </div>
    </PageShell>
  )
}

function CartContent({ cart }: { cart: Cart }) {
  const quote = useQuote()
  const blocked = !quote.data?.purchasable
  const ctaClass =
    'flex h-10 w-full items-center justify-center rounded-[3px] bg-primary text-[15px] leading-4 font-bold text-ink max-md:h-[60px] max-md:rounded-full max-md:bg-linear-[100deg] max-md:from-primary max-md:to-primary/80'
  // Visitors go through login (private route) and come back to payment with the merged cart
  const checkout = blocked ? (
    <span aria-disabled="true" className={`${ctaClass} opacity-60`}>
      Conectar e finalizar
    </span>
  ) : (
    <Link
      to="/pagamento"
      className={`${ctaClass} hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-ink focus-visible:outline-none`}
    >
      Conectar e finalizar
    </Link>
  )

  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between md:gap-12">
      <div className="flex min-w-0 flex-1 flex-col gap-3 md:max-w-[782px]">
        <CartIssues cart={cart} />

        {/* Desktop table */}
        <div className="hidden flex-col gap-3 md:flex">
          <div
            aria-hidden="true"
            className={`grid ${CART_TABLE_COLUMNS} items-center gap-x-4 pr-6 text-base leading-4 text-foreground`}
          >
            <span className="font-bold">NFTs</span>
            <span className="font-medium">Preço</span>
            <span className="font-bold">Edições</span>
            <span className="font-medium">Total</span>
            <span />
          </div>
          <hr className="border-foreground/30" />
          <ul aria-label="Itens do carrinho" className="flex flex-col gap-3">
            {cart.lines.map((line) => (
              <CartLineRow key={line.id} line={line} />
            ))}
          </ul>
        </div>

        {/* Mobile cards */}
        <ul aria-label="Itens do carrinho" className="flex flex-col gap-5 pb-[360px] md:hidden">
          {cart.lines.map((line) => (
            <CartLineCard key={line.id} line={line} />
          ))}
        </ul>

        {blocked && quote.data && (
          <p className="text-sm text-text-secondary">
            Resolva os avisos acima para continuar para o pagamento.
          </p>
        )}
      </div>

      <div className="hidden w-[332px] shrink-0 md:block">
        <CartSummary variant="desktop" checkout={checkout} />
      </div>

      {/* Mobile summary sheet, fixed at the bottom as in the frame */}
      <div className="fixed inset-x-0 bottom-0 z-40 rounded-t-[40px] bg-surface-card px-6 pt-6 pb-8 shadow-[0_0_10px_rgba(10,6,4,0.45)] md:hidden">
        <CartSummary variant="mobile" checkout={checkout} />
      </div>
    </div>
  )
}

function EmptyCart() {
  return (
    <div role="status" className="flex flex-col items-start gap-4 rounded-lg bg-surface-card p-8">
      <p className="text-lg font-bold text-foreground">Seu carrinho está vazio</p>
      <p className="text-sm text-text-secondary">
        Explore o catálogo e adicione NFTs para continuar.
      </p>
      <Link
        to="/"
        hash="catalogo"
        className="rounded-[6px] bg-primary px-4 py-2 text-sm font-bold text-ink focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-ink focus-visible:outline-none"
      >
        Continuar explorando
      </Link>
    </div>
  )
}

function CartSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Carregando carrinho"
      className="flex flex-col gap-6 md:flex-row md:justify-between"
    >
      <div className="flex flex-1 flex-col gap-3 md:max-w-[782px]">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton
            key={i}
            className="h-[100px] w-full rounded-[10px] md:h-[70px] md:rounded-none"
          />
        ))}
      </div>
      <div className="flex w-full flex-col gap-4 md:w-[332px]">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  )
}
