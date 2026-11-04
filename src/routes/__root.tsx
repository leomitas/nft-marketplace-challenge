import type { QueryClient } from '@tanstack/react-query'
import {
  createRootRouteWithContext,
  HeadContent,
  Link,
  Outlet,
  useMatches,
} from '@tanstack/react-router'
import { MobileTabBar } from '@/components/layout/mobile-tab-bar'
import { PageShell } from '@/components/layout/page-shell'
import { Toaster } from '@/components/ui/toaster'
import { SessionWatcher } from '@/features/auth/session-watcher'
import { RealtimeBridge } from '@/realtime/realtime-bridge'

export type RouterContext = { queryClient: QueryClient }

declare module '@tanstack/react-router' {
  interface StaticDataRouteOption {
    /** Hides the mobile tab bar (e.g. screens with their own bottom action bar). */
    hideTabBar?: boolean
  }
}

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({ meta: [{ title: 'Kurio · Marketplace de NFTs' }] }),
  component: RootLayout,
  notFoundComponent: NotFound,
})

function RootLayout() {
  const hideTabBar = useMatches({
    select: (matches) => matches.some((m) => m.staticData?.hideTabBar),
  })

  return (
    <>
      <HeadContent />
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-[6px] focus:bg-primary focus:px-4 focus:py-2 focus:font-bold focus:text-ink"
      >
        Pular para o conteúdo
      </a>
      <Outlet />
      {!hideTabBar && <MobileTabBar />}
      <Toaster />
      <SessionWatcher />
      <RealtimeBridge />
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
