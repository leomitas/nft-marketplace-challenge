import { QueryClientProvider } from '@tanstack/react-query'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { queryClient } from './lib/query-client'
import { routeTree } from './routeTree.gen'

function makeRouter() {
  return createRouter({
    routeTree,
    context: { queryClient },
    defaultPreload: 'intent',
    // Preloaded data is owned by TanStack Query, so the router must not cache it separately
    defaultPreloadStaleTime: 0,
    scrollRestoration: true,
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof makeRouter>
  }
}

export function renderApp(container: HTMLElement) {
  const router = makeRouter()
  createRoot(container).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  )
}
