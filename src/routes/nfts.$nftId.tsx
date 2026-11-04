import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { z } from 'zod'
import { editionIdSchema } from '@/api/contracts/catalog'
import { ApiError } from '@/api/client'
import { PageShell } from '@/components/layout/page-shell'
import { Skeleton } from '@/components/ui/skeleton'
import { nftDetailQuery } from '@/features/catalog/queries'
import { NftDetailView } from '@/features/nft/nft-detail-view'

export const Route = createFileRoute('/nfts/$nftId')({
  validateSearch: z.object({ edition: editionIdSchema.optional().catch(undefined) }),
  loader: ({ context: { queryClient }, params }) => {
    void queryClient.prefetchQuery(nftDetailQuery(params.nftId))
  },
  // The mobile detail frame has its own buy bar instead of the tab bar
  staticData: { hideTabBar: true },
  component: NftDetailPage,
})

function NftDetailPage() {
  const { nftId } = Route.useParams()
  const { edition } = Route.useSearch()
  const navigate = Route.useNavigate()
  const nft = useQuery(nftDetailQuery(nftId))

  return (
    <PageShell section="market" headerDivider={false}>
      {nft.isPending && <DetailSkeleton />}

      {nft.isError &&
        (nft.error instanceof ApiError && nft.error.status === 404 ? (
          <section className="flex flex-col items-start gap-4 py-16">
            <h1 className="text-2xl font-bold">NFT não encontrado</h1>
            <p className="text-text-secondary">
              O item que você procura não existe ou foi removido do catálogo.
            </p>
            <Link to="/" className="font-bold text-text-accent underline underline-offset-4">
              Voltar ao catálogo
            </Link>
          </section>
        ) : (
          <div
            role="alert"
            className="flex flex-col items-start gap-4 rounded-lg bg-surface-card p-8"
          >
            <h1 className="text-lg font-bold">Não foi possível carregar este NFT</h1>
            <p className="text-sm text-text-secondary">{nft.error.message}</p>
            <button
              type="button"
              onClick={() => nft.refetch()}
              className="rounded-[6px] bg-primary px-4 py-2 font-bold text-ink"
            >
              Tentar novamente
            </button>
          </div>
        ))}

      {nft.data && (
        <NftDetailView
          // Remount per NFT so local state (quantity) never leaks between items
          key={nft.data.id}
          nft={nft.data}
          edition={edition}
          onEditionChange={(id) =>
            void navigate({ search: { edition: id }, replace: true, resetScroll: false })
          }
        />
      )}
    </PageShell>
  )
}

/** Same footprint as the loaded layout (gallery + details), so nothing jumps when data arrives. */
function DetailSkeleton() {
  return (
    <div aria-busy="true" aria-label="Carregando NFT" className="flex flex-col gap-8 lg:flex-row">
      <div className="hidden gap-7 md:flex">
        <div className="flex flex-col gap-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="size-[100px] rounded-[8px]" />
          ))}
        </div>
        <Skeleton className="size-[444px] rounded-[6px]" />
      </div>
      <Skeleton className="aspect-square w-full rounded-3xl md:hidden" />
      <div className="flex flex-1 flex-col gap-5">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-7 w-1/2" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-16 w-2/3" />
      </div>
    </div>
  )
}
