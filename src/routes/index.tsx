import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { getHealth } from '@/api/health'
import { Skeleton } from '@/components/ui/skeleton'

export const Route = createFileRoute('/')({
  component: HomePage,
})

// Placeholder until Phase 2: proves the Router → Query → Axios → MSW chain works end to end.
function HomePage() {
  const health = useQuery({ queryKey: ['health'], queryFn: ({ signal }) => getHealth(signal) })

  return (
    <main className="mx-auto max-w-content px-4 py-24">
      <h1 className="text-[43px] leading-[70px] font-bold">NFT Marketplace</h1>
      <div className="mt-6" aria-live="polite">
        {health.isPending && <Skeleton className="h-5 w-48" />}
        {health.isError && <p className="text-destructive">API indisponível.</p>}
        {health.isSuccess && (
          <p className="text-text-secondary" data-testid="api-status">
            API: {health.data.status} {health.data.mocked && '(mock)'}
          </p>
        )}
      </div>
    </main>
  )
}
