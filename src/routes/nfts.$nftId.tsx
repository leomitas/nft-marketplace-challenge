import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { COLLECTIONS, NETWORKS } from '@/api/contracts/catalog'
import { ApiError } from '@/api/client'
import { PageShell } from '@/components/layout/page-shell'
import { Skeleton } from '@/components/ui/skeleton'
import { nftDetailQuery } from '@/features/catalog/queries'
import { formatEth } from '@/lib/money'

// Minimal detail page so catalog cards already lead somewhere real. The full screen
// (gallery, editions, quantity, favorites, buy) is built in the next slice.
export const Route = createFileRoute('/nfts/$nftId')({
  loader: ({ context: { queryClient }, params }) => {
    void queryClient.prefetchQuery(nftDetailQuery(params.nftId))
  },
  component: NftDetailPage,
})

function NftDetailPage() {
  const { nftId } = Route.useParams()
  const nft = useQuery(nftDetailQuery(nftId))

  return (
    <PageShell section="market" headerDivider={false}>
      <nav aria-label="Trilha" className="text-sm text-text-secondary">
        <Link to="/" className="underline-offset-4 hover:underline">
          Início
        </Link>{' '}
        / <span aria-current="page">{nft.data?.name ?? 'NFT'}</span>
      </nav>

      {nft.isPending && (
        <div className="grid gap-8 md:grid-cols-2" aria-busy="true" aria-label="Carregando NFT">
          <Skeleton className="aspect-square w-full rounded-3xl" />
          <div className="flex flex-col gap-4">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      )}

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
        <article className="grid gap-8 md:grid-cols-2">
          <img
            src={nft.data.image.src}
            srcSet={nft.data.image.srcSet}
            sizes="(min-width: 768px) 50vw, 100vw"
            alt={nft.data.image.alt}
            width={560}
            height={560}
            fetchPriority="high"
            className="aspect-square w-full rounded-3xl object-cover"
          />
          <div className="flex flex-col gap-4">
            <h1 className="text-[28px] leading-tight font-bold">{nft.data.name}</h1>
            <p className="text-2xl font-bold text-text-accent">{formatEth(nft.data.priceEth)}</p>
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
              <dt className="text-text-secondary">ID do token</dt>
              <dd>{nft.data.tokenId}</dd>
              <dt className="text-text-secondary">Coleção</dt>
              <dd>{COLLECTIONS[nft.data.collection]}</dd>
              <dt className="text-text-secondary">Rede</dt>
              <dd>{NETWORKS[nft.data.network]}</dd>
              <dt className="text-text-secondary">Edições disponíveis</dt>
              <dd>
                {nft.data.editions.available} de {nft.data.editions.total}
              </dd>
            </dl>
            <p className="text-sm leading-6 text-text-secondary">{nft.data.description}</p>
          </div>
        </article>
      )}
    </PageShell>
  )
}
