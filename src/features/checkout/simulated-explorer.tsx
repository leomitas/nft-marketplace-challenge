import { Link } from '@tanstack/react-router'
import { ApiError } from '@/api/client'
import { NETWORKS } from '@/api/contracts/catalog'
import { WALLET_PROVIDERS } from '@/api/contracts/wallets'
import { Skeleton } from '@/components/ui/skeleton'
import { formatEth } from '@/lib/money'
import { formatDate } from './format'
import { useOrder } from './use-checkout'

const STATUS = { pending: 'Pendente', confirmed: 'Confirmada', refused: 'Recusada' } as const

/**
 * "Block explorer" for the simulated transaction. Everything shown comes from the order
 * snapshot returned by the API; the page says plainly that no real chain is involved.
 */
export function SimulatedExplorer({ orderId }: { orderId: string }) {
  const order = useOrder(orderId)

  if (order.isPending) {
    return (
      <div aria-busy="true" aria-label="Carregando transação" className="flex flex-col gap-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full rounded-[10px]" />
      </div>
    )
  }
  if (order.isError) {
    const missing =
      order.error instanceof ApiError && (order.error.status === 404 || order.error.status === 403)
    return (
      <div
        role="alert"
        className="flex flex-col items-start gap-3 rounded-[10px] bg-surface-card p-6"
      >
        <h1 className="text-xl font-bold">
          {missing ? 'Transação não encontrada' : 'Não foi possível carregar a transação'}
        </h1>
        <p className="text-sm text-text-secondary">{order.error.message}</p>
      </div>
    )
  }

  const { data } = order
  // Long unbroken values (hash, address) may break anywhere; text values wrap only between words
  const rows: [string, React.ReactNode, 'hex'?][] = [
    ['Hash', data.transaction?.hash ?? '— (ainda sem transação)', 'hex'],
    ['Status', STATUS[data.status]],
    ['Rede', `${NETWORKS[data.payment.network]} (simulada)`],
    ['Data', formatDate(data.updatedAt)],
    [
      'De',
      <>
        {data.payment.walletLabel} · <span className="break-all">{data.payment.address}</span>
      </>,
    ],
    ['Carteira', WALLET_PROVIDERS[data.payment.provider]],
    [
      'Itens',
      <ul className="flex flex-col gap-1">
        {data.lines.map((l) => (
          <li key={l.lineId}>
            {l.name} · {l.editionLabel} × {l.quantity}
          </li>
        ))}
      </ul>,
    ],
    ['Taxa de rede', formatEth(data.networkFeeEth)],
    ['Valor total', formatEth(data.totalEth)],
    ['Pedido', data.id],
  ]

  return (
    <section
      aria-labelledby="explorer-title"
      className="mx-auto flex w-full max-w-3xl flex-col gap-4"
    >
      <h1 id="explorer-title" className="text-[28px] font-bold">
        Explorador simulado
      </h1>
      <p
        role="note"
        className="rounded-[6px] border border-primary/70 bg-primary/10 p-3 text-sm text-foreground"
      >
        Ambiente de demonstração: esta transação não existe em nenhuma blockchain. Os dados abaixo
        são o registro do pedido no servidor simulado.
      </p>
      <dl className="grid gap-x-6 gap-y-3 rounded-[10px] bg-surface-card p-5 text-sm md:grid-cols-[160px_1fr]">
        {rows.map(([label, value, kind]) => (
          <div key={label} className="contents">
            <dt className="text-text-secondary">{label}</dt>
            <dd className={kind === 'hex' ? 'break-all' : 'break-words'}>{value}</dd>
          </div>
        ))}
      </dl>
      <Link
        to="/pedidos/$orderId"
        params={{ orderId: data.id }}
        className="self-start text-sm font-bold text-text-accent underline underline-offset-4"
      >
        Voltar ao recibo
      </Link>
    </section>
  )
}
