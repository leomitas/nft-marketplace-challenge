import { QueryClientProvider } from '@tanstack/react-query'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { queryClient } from './lib/query-client'
import { routeTree } from './routeTree.gen'
import './index.css'

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

// There is no real backend, so mocks are on unless explicitly disabled with VITE_ENABLE_MOCKS=false
async function enableMocking() {
  if (import.meta.env.VITE_ENABLE_MOCKS === 'false') return
  const { worker, applyMockControlsFromUrl } = await import('./mocks/browser')
  applyMockControlsFromUrl()
  await worker.start({ onUnhandledRequest: 'bypass', quiet: import.meta.env.PROD })
}

// The router is created only after the mock controls are stripped from the URL, and rendering
// waits for the worker so the first requests are already intercepted
enableMocking().then(() => {
  const router = makeRouter()
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  )
})
