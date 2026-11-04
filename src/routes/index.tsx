import { createFileRoute, stripSearchParams } from '@tanstack/react-router'
import { PageShell } from '@/components/layout/page-shell'
import { CatalogFilters } from '@/features/catalog/components/catalog-filters'
import { CatalogSearchInput } from '@/features/catalog/components/catalog-search-input'
import { CatalogSort, CatalogTabs } from '@/features/catalog/components/catalog-toolbar'
import { FeaturedBanner } from '@/features/catalog/components/featured-banner'
import { FiltersSheet } from '@/features/catalog/components/filters-sheet'
import { HomeBlog } from '@/features/catalog/components/home-blog'
import { HomeHero } from '@/features/catalog/components/home-hero'
import { HomePromos } from '@/features/catalog/components/home-promos'
import { NftGrid } from '@/features/catalog/components/nft-grid'
import { catalogFacetsQuery, catalogListQuery } from '@/features/catalog/queries'
import {
  catalogSearchDefaults,
  catalogSearchSchema,
  toCatalogQuery,
} from '@/features/catalog/search'

export const Route = createFileRoute('/')({
  validateSearch: catalogSearchSchema,
  search: { middlewares: [stripSearchParams(catalogSearchDefaults)] },
  loaderDeps: ({ search }) => toCatalogQuery(search),
  // Starts both requests in parallel with route matching (and on link hover via preload),
  // without blocking render: the page shows skeletons until the data arrives.
  loader: ({ context: { queryClient }, deps }) => {
    void queryClient.prefetchQuery(catalogListQuery(deps))
    void queryClient.prefetchQuery(catalogFacetsQuery())
  },
  component: HomePage,
})

function HomePage() {
  return (
    <PageShell section="home">
      <div className="flex gap-2 md:hidden">
        <CatalogSearchInput />
        <FiltersSheet variant="icon" />
      </div>

      <HomeHero />

      <section
        id="catalogo"
        tabIndex={-1}
        aria-labelledby="catalog-title"
        className="flex scroll-mt-6 gap-12 focus:outline-none"
      >
        <aside aria-label="Filtros do catálogo" className="hidden flex-col gap-6 lg:flex">
          <CatalogFilters className="w-[310px]" />
          <FeaturedBanner />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-6 md:gap-8">
          <h2 id="catalog-title" className="sr-only">
            Catálogo de NFTs
          </h2>
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
            <CatalogTabs />
            <div className="flex items-center gap-4">
              <div className="hidden md:block lg:hidden">
                <FiltersSheet variant="text" />
              </div>
              <CatalogSort className="hidden md:flex" />
            </div>
          </div>
          <NftGrid />
        </div>
      </section>

      <HomePromos />
      <HomeBlog />
    </PageShell>
  )
}
