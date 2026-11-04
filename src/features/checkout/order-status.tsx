import { Link, useNavigate } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { useEffect } from 'react'
import { ApiError } from '@/api/client'
import type { User } from '@/api/contracts/auth'
import { NETWORKS } from '@/api/contracts/catalog'
import type { Order } from '@/api/contracts/orders'
import { WALLET_PROVIDERS } from '@/api/contracts/wallets'
import closeIcon from '@/assets/figma/icon-close.svg'
import thankYou from '@/assets/figma/thank-you.png'
import { Skeleton } from '@/components/ui/skeleton'
import { formatEth } from '@/lib/money'
import { checkoutDraft } from './draft'
import { formatDate, shortHex } from './format'
import { useOrder } from './use-checkout'

/**
 * Order result, always read from the API: pending (polled until it settles), refused, or the
 * confirmed receipt. Refreshing this page recovers the same order; nothing is re-submitted.
 */
export function OrderStatus({ orderId, user }: { orderId: string; user: User }) {
  const order = useOrder(orderId)

  // The purchase is over: the next checkout starts from a clean form
  const status = order.data?.status
  useEffect(() => {
    if (status === 'confirmed') checkoutDraft.clear(user.id)
    // Keep the form after a refusal, but the next try is a new order
    if (status === 'refused') checkoutDraft.clearAttempt(user.id)
  }, [status, user.id])

  if (order.isPending) {
    return (
      <Card>
        <div aria-busy="true" aria-label="Carregando pedido" className="flex flex-col gap-4 p-8">
          <Skeleton className="mx-auto size-20 rounded-full" />
          <Skeleton className="h-5 w-2/3 self-center" />
          <Skeleton className="h-24 w-full" />
        </div>
      </Card>
    )
  }
  if (order.isError) {
    const missing =
      order.error instanceof ApiError && (order.error.status === 404 || order.error.status === 403)
    return (
      <Card>
        <div role="alert" className="flex flex-col items-center gap-4 p-8 text-center">
          <h1 className="text-xl font-bold">
            {missing ? 'Pedido não encontrado' : 'Não foi possível carregar o pedido'}
          </h1>
          <p className="text-sm text-text-secondary">{order.error.message}</p>
          {missing ? (
            <Link to="/" className="rounded-[6px] bg-primary px-4 py-2 font-bold text-ink">
              Voltar ao início
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => order.refetch()}
              className="rounded-[6px] bg-primary px-4 py-2 font-bold text-ink"
            >
              Tentar novamente
            </button>
          )}
        </div>
      </Card>
    )
  }

  const data = order.data
  if (data.status === 'pending') return <Pending order={data} />
  if (data.status === 'refused') return <Refused order={data} />
  return <Receipt order={data} />
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[578px] overflow-hidden border-b-[10px] border-primary bg-surface-card">
      {children}
    </div>
  )
}

function Pending({ order }: { order: Order }) {
  return (
    <Card>
      <div role="status" className="flex flex-col items-center gap-4 p-8 text-center">
        <Loader2
          aria-hidden="true"
          className="size-12 animate-spin text-primary motion-reduce:animate-none"
        />
        <h1 className="text-xl font-bold">Aguardando confirmação do pagamento</h1>
        <p className="text-sm text-text-secondary">
          Pedido <strong className="text-foreground">{order.id}</strong> enviado para a rede{' '}
          {NETWORKS[order.payment.network]} ({formatEth(order.totalEth)}).
        </p>
        <p className="text-xs text-text-secondary">
          Você pode atualizar ou fechar esta página: o pedido continua o mesmo e não será cobrado
          duas vezes.
        </p>
      </div>
    </Card>
  )
}

function Refused({ order }: { order: Order }) {
  return (
    <Card>
      <div role="alert" className="flex flex-col items-center gap-4 p-8 text-center">
        <h1 className="text-xl font-bold">Pagamento recusado</h1>
        <p className="text-sm">{order.failureReason}</p>
        <p className="text-sm text-text-secondary">
          Pedido {order.id}. Seus itens continuam no carrinho.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            to="/pagamento"
            className="rounded-[6px] bg-primary px-4 py-2 font-bold text-ink focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            Tentar novamente
          </Link>
          <Link
            to="/carrinho"
            className="rounded-[6px] border border-primary px-4 py-2 font-bold text-text-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            Ver carrinho
          </Link>
        </div>
      </div>
    </Card>
  )
}

function Receipt({ order }: { order: Order }) {
  const navigate = useNavigate()
  const network = NETWORKS[order.payment.network]
  const explorer = order.payment.network === 'ethereum' ? 'Etherscan' : 'explorador'
  const meta = [
    { label: 'ID da transação', value: order.transaction ? shortHex(order.transaction.hash) : '—' },
    { label: 'Data', value: formatDate(order.updatedAt) },
    { label: 'Total', value: formatEth(order.totalEth) },
    { label: 'Carteira', value: WALLET_PROVIDERS[order.payment.provider] },
  ]

  return (
    <Card>
      <article aria-labelledby="receipt-title" className="relative flex flex-col">
        <button
          type="button"
          onClick={() => void navigate({ to: '/' })}
          aria-label="Fechar recibo"
          className="absolute top-4 right-4 flex size-8 items-center justify-center rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <img src={closeIcon} alt="" width={16} height={16} />
        </button>
        <header className="flex flex-col items-center gap-4 border-b border-primary px-6 pt-6 pb-5">
          <img src={thankYou} alt="" width={80} height={80} />
          <h1 id="receipt-title" className="text-center text-base font-bold text-text-accent">
            Seus NFTs agora estão na sua carteira
          </h1>
          <p className="sr-only">Pedido {order.id} confirmado.</p>
        </header>

        <dl className="grid grid-cols-2 gap-4 border-b border-primary px-6 py-3 text-sm sm:flex sm:justify-between sm:gap-0 sm:px-9">
          {meta.map((item, index) => (
            <div
              key={item.label}
              className={index > 0 ? 'sm:border-l sm:border-primary sm:pl-4' : undefined}
            >
              <dt className="text-xs font-bold text-text-secondary">{item.label}</dt>
              <dd className="text-text-secondary">{item.value}</dd>
            </div>
          ))}
        </dl>

        <section
          aria-labelledby="receipt-details"
          className="flex flex-col gap-3 px-6 pt-5 pb-8 sm:px-11"
        >
          <h2 id="receipt-details" className="text-sm font-bold">
            Detalhes da transação
          </h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-foreground/30 text-left">
                <th scope="col" className="pb-3 font-bold">
                  NFTs
                </th>
                <th scope="col" className="pb-3 text-center font-bold">
                  Edições
                </th>
                <th scope="col" className="pb-3 text-right font-bold">
                  Subtotal
                </th>
              </tr>
            </thead>
            <tbody>
              {order.lines.map((line) => (
                <tr key={line.lineId}>
                  <td className="py-2">
                    <div className="flex items-center gap-3">
                      <img
                        src={line.image.src}
                        alt=""
                        width={56}
                        height={56}
                        className="size-14 shrink-0 rounded-[6px] object-cover"
                      />
                      <div className="min-w-0">
                        <p className="font-bold">{line.name}</p>
                        <p className="text-xs text-text-secondary">
                          ID do token: {line.tokenId} · {line.editionLabel}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-2 text-center text-xs text-text-secondary">
                    (x {line.quantity})
                  </td>
                  <td className="py-2 text-right font-bold whitespace-nowrap text-text-accent">
                    {formatEth(line.lineTotalEth)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <dl className="ml-auto flex w-full max-w-[321px] flex-col gap-2 border-b border-foreground/30 pb-3 text-sm">
            {order.discountEth !== '0' && (
              <div className="flex justify-between">
                <dt>Desconto{order.couponCode ? ` (${order.couponCode})` : ''}</dt>
                <dd>(-) {formatEth(order.discountEth)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt>Taxa de rede</dt>
              <dd>{formatEth(order.networkFeeEth)}</dd>
            </div>
            <div className="flex justify-between font-bold">
              <dt>Total</dt>
              <dd className="text-text-accent">{formatEth(order.totalEth)}</dd>
            </div>
          </dl>

          <p className="text-center text-xs leading-5 text-text-secondary">
            Transação confirmada na {network}. A propriedade foi transferida para sua carteira
            conectada e registrada na rede.
          </p>
          {order.transaction && (
            <a
              href={order.transaction.explorerUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="self-center rounded-[3px] bg-primary px-4 py-3 text-sm font-bold text-ink focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              Ver no {explorer}
              <span className="sr-only"> (simulado, abre em nova aba)</span>
            </a>
          )}
        </section>
      </article>
    </Card>
  )
}
