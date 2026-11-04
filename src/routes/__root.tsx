import type { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, Link, Outlet } from '@tanstack/react-router'
import { MobileTabBar } from '@/components/layout/mobile-tab-bar'
import { PageShell } from '@/components/layout/page-shell'

export type RouterContext = { queryClient: QueryClient }

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  notFoundComponent: NotFound,
})

function RootLayout() {
  return (
    <>
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-[6px] focus:bg-primary focus:px-4 focus:py-2 focus:font-bold focus:text-ink"
      >
        Pular para o conteúdo
      </a>
      <Outlet />
      <MobileTabBar />
    </>
  )
}

function NotFound() {
  return (
    <PageShell section="home">
      <section className="flex flex-col items-start gap-4 py-16">
        <h1 className="text-2xl font-bold">Página não encontrada</h1>
        <p className="text-text-secondary">O endereço acessado não existe.</p>
        <Link to="/" className="font-bold text-text-accent underline underline-offset-4">
          Voltar ao início
        </Link>
      </section>
    </PageShell>
  )
}
