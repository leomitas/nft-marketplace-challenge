import { createFileRoute, Link } from '@tanstack/react-router'
import { MobilePageHeader } from '@/components/layout/mobile-page-header'
import { PageShell } from '@/components/layout/page-shell'
import { CheckoutPage } from '@/features/checkout/checkout-page'

export const Route = createFileRoute('/_authenticated/pagamento')({
  head: () => ({ meta: [{ title: 'Pagamento · Kurio' }] }),
  // The mobile frame has its own header and a fixed confirm button
  staticData: { hideTabBar: true },
  component: PaymentRoute,
})

function PaymentRoute() {
  const { user } = Route.useRouteContext()
  return (
    <PageShell section="market" headerDivider={false}>
      <div className="flex flex-col gap-6">
        <nav
          aria-label="Trilha"
          className="hidden text-[15px] leading-4 font-bold text-foreground md:block"
        >
          <Link to="/" className="hover:underline">
            Início
          </Link>{' '}
          /{' '}
          <Link to="/carrinho" className="hover:underline">
            Carrinho
          </Link>{' '}
          / <span aria-current="page">Pagamento</span>
        </nav>
        <MobilePageHeader title="Pagamento com carteira" />
        <h1 className="sr-only">Pagamento</h1>
        {/* Keyed by user: a different account never sees another one's draft */}
        <CheckoutPage key={user.id} user={user} />
      </div>
    </PageShell>
  )
}
