import { createFileRoute, Link, useCanGoBack, useRouter } from '@tanstack/react-router'
import type { Cart } from '@/api/contracts/cart'
import arrowLeft from '@/assets/figma/m-icon-arrow-left.svg'
import { PageShell } from '@/components/layout/page-shell'
import { Skeleton } from '@/components/ui/skeleton'
import { CartIssues } from '@/features/cart/cart-issues'
import { CartLineCard, CartLineRow } from '@/features/cart/cart-line'
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
        <MobileHeader />
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
  // Payment arrives with the next slice; until then the CTA is shown but unavailable
  const checkout = (
    <span
      title="Pagamento disponível em breve"
      className="flex h-10 w-full cursor-not-allowed items-center justify-center rounded-[3px] bg-primary text-[15px] leading-4 font-bold text-ink opacity-70 max-md:h-[60px] max-md:rounded-full max-md:bg-linear-[100deg] max-md:from-primary max-md:to-primary/80"
    >
      Conectar e finalizar
      <span className="sr-only"> (pagamento disponível em breve)</span>
    </span>
  )

  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between md:gap-12">
      <div className="flex min-w-0 flex-1 flex-col gap-3 md:max-w-[782px]">
        <CartIssues cart={cart} />

        {/* Desktop table */}
        <div className="hidden flex-col gap-3 md:flex">
          <div
            aria-hidden="true"
            className="grid grid-cols-[250px_1fr_auto_100px_auto] items-center gap-4 pr-6 text-base leading-4 text-foreground"
          >
            <span className="font-bold">NFTs</span>
            <span className="font-medium">Preço</span>
            <span className="w-[110px] font-bold">Edições</span>
            <span className="font-medium">Total</span>
            <span className="w-9" />
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

function MobileHeader() {
  const router = useRouter()
  const canGoBack = useCanGoBack()
  return (
    <div className="relative flex h-[35px] items-center justify-center md:hidden">
      <button
        type="button"
        onClick={() => (canGoBack ? router.history.back() : void router.navigate({ to: '/' }))}
        aria-label="Voltar"
        className="absolute left-0 flex size-[35px] items-center justify-center rounded-full bg-surface-raised focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        {/* Figma arrow points down; rotated 90° to point left, as in the design */}
        <img src={arrowLeft} alt="" width={12} height={7} className="rotate-90" />
      </button>
      <p aria-hidden="true" className="text-xl leading-4 font-bold text-foreground">
        Carrinho de NFTs
      </p>
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
