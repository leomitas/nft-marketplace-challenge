import { createFileRoute } from '@tanstack/react-router'
import { PageShell } from '@/components/layout/page-shell'
import { SimulatedExplorer } from '@/features/checkout/simulated-explorer'

// `$orderId_` keeps this page out of the receipt layout: /pedidos/:id/transacao is a page of its own
export const Route = createFileRoute('/_authenticated/pedidos/$orderId_/transacao')({
  head: () => ({ meta: [{ title: 'Transação (simulada) · Kurio' }] }),
  component: ExplorerRoute,
})

function ExplorerRoute() {
  const { user } = Route.useRouteContext()
  const { orderId } = Route.useParams()
  return (
    <PageShell section="market" headerDivider={false}>
      <SimulatedExplorer key={`${user.id}:${orderId}`} orderId={orderId} />
    </PageShell>
  )
}
