import type { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, Link, Outlet } from '@tanstack/react-router'

export type RouterContext = { queryClient: QueryClient }

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  notFoundComponent: NotFound,
})

function RootLayout() {
  return (
    <div className="min-h-dvh">
      <Outlet />
    </div>
  )
}

function NotFound() {
  return (
    <main className="mx-auto flex max-w-content flex-col items-start gap-4 px-4 py-24">
      <h1 className="text-2xl font-bold">Página não encontrada</h1>
      <p className="text-muted-foreground">O endereço acessado não existe.</p>
      <Link to="/" className="text-text-accent underline underline-offset-4">
        Voltar ao início
      </Link>
    </main>
  )
}
