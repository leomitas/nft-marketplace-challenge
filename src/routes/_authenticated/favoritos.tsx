import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { PageShell } from '@/components/layout/page-shell'
import { NftCard, NftCardSkeleton } from '@/features/catalog/components/nft-card'
import { favoritesQuery } from '@/features/favorites/use-favorites'

export const Route = createFileRoute('/_authenticated/favoritos')({
  loader: ({ context: { queryClient, user } }) => {
    void queryClient.prefetchQuery(favoritesQuery(user.id))
  },
  head: () => ({ meta: [{ title: 'Favoritos · Kurio' }] }),
  component: FavoritesPage,
})

function FavoritesPage() {
  const { user } = Route.useRouteContext()
  const favorites = useQuery(favoritesQuery(user.id))

  return (
    <PageShell section="home">
      <section aria-labelledby="favorites-title" className="flex flex-col gap-8">
        <h1 id="favorites-title" className="text-[28px] font-bold">
          Meus favoritos
        </h1>

        {favorites.isPending && (
          <div
            aria-busy="true"
            aria-label="Carregando favoritos"
            className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4"
          >
            {Array.from({ length: 4 }, (_, i) => (
              <NftCardSkeleton key={i} />
            ))}
          </div>
        )}

        {favorites.isError && (
          <div
            role="alert"
            className="flex flex-col items-start gap-4 rounded-lg bg-surface-card p-8"
          >
            <p>Não foi possível carregar seus favoritos.</p>
            <button
              type="button"
              onClick={() => favorites.refetch()}
              className="rounded-[6px] bg-primary px-4 py-2 font-bold text-ink"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {favorites.data?.items.length === 0 && (
          <div
            role="status"
            className="flex flex-col items-start gap-4 rounded-lg bg-surface-card p-8"
          >
            <p className="text-text-secondary">Você ainda não favoritou nenhum NFT.</p>
            <Link
              to="/"
              hash="catalogo"
              className="font-bold text-text-accent underline underline-offset-4"
            >
              Explorar o catálogo
            </Link>
          </div>
        )}

        {Boolean(favorites.data?.items.length) && (
          <ul className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 md:gap-x-6 lg:grid-cols-4">
            {favorites.data?.items.map((nft) => (
              <li key={nft.id}>
                <NftCard nft={nft} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </PageShell>
  )
}
