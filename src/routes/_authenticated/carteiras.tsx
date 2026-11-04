import { createFileRoute, Link } from '@tanstack/react-router'
import { PageShell } from '@/components/layout/page-shell'
import { Skeleton } from '@/components/ui/skeleton'
import { useWallets } from '@/features/checkout/use-checkout'
import { WalletForm } from '@/features/profile/wallet-form'

export const Route = createFileRoute('/_authenticated/carteiras')({
  head: () => ({ meta: [{ title: 'Carteiras · Kurio' }] }),
  component: WalletsPage,
})

function WalletsPage() {
  const { user } = Route.useRouteContext()
  const wallets = useWallets()

  return (
    <PageShell section="home">
      <div className="flex max-w-3xl flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-[28px] font-bold">Carteiras</h1>
          <p className="text-sm text-text-secondary">
            A carteira principal e a secundária aparecem no pagamento.{' '}
            <Link to="/perfil" className="text-text-accent underline-offset-4 hover:underline">
              Voltar ao perfil
            </Link>
          </p>
        </div>
        {wallets.isPending ? (
          <div aria-busy="true" aria-label="Carregando carteiras" className="flex flex-col gap-6">
            <Skeleton className="h-72 w-full rounded-[10px]" />
            <Skeleton className="h-72 w-full rounded-[10px]" />
          </div>
        ) : wallets.isError ? (
          <div
            role="alert"
            className="flex flex-col items-start gap-3 rounded-[10px] bg-surface-card p-6"
          >
            <p>Não foi possível carregar suas carteiras.</p>
            <button
              type="button"
              onClick={() => wallets.refetch()}
              className="rounded-[6px] bg-primary px-4 py-2 font-bold text-ink"
            >
              Tentar novamente
            </button>
          </div>
        ) : (
          (['primary', 'secondary'] as const).map((role) => {
            const wallet = wallets.data.find((w) => w.role === role)
            // Remount after a save so the form shows what the server stored
            return (
              <WalletForm
                key={`${user.id}-${role}-${wallet?.updatedAt ?? 'new'}`}
                role={role}
                wallet={wallet}
              />
            )
          })
        )}
      </div>
    </PageShell>
  )
}
