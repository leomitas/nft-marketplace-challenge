import { createFileRoute } from '@tanstack/react-router'
import { PageShell } from '@/components/layout/page-shell'
import { OrderStatus } from '@/features/checkout/order-status'

export const Route = createFileRoute('/_authenticated/pedidos/$orderId')({
  head: () => ({ meta: [{ title: 'Pedido · Kurio' }] }),
  component: OrderRoute,
})

function OrderRoute() {
  const { user } = Route.useRouteContext()
  const { orderId } = Route.useParams()
  return (
    <PageShell section="market" headerDivider={false}>
      <OrderStatus key={`${user.id}:${orderId}`} orderId={orderId} user={user} />
    </PageShell>
  )
}
