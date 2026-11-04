import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { PageShell } from '@/components/layout/page-shell'
import { useLogout } from '@/features/auth/use-session'

// Account summary until the full collector profile (data, avatar, password) lands.
export const Route = createFileRoute('/_authenticated/perfil')({
  head: () => ({ meta: [{ title: 'Perfil · Kurio' }] }),
  component: ProfilePage,
})

function ProfilePage() {
  const { user } = Route.useRouteContext()
  const logout = useLogout()
  const navigate = useNavigate()

  return (
    <PageShell section="home">
      <section aria-labelledby="profile-title" className="flex max-w-xl flex-col gap-6">
        <h1 id="profile-title" className="text-[28px] font-bold">
          Perfil do colecionador
        </h1>
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          <dt className="text-text-secondary">Nome de usuário</dt>
          <dd>{user.username}</dd>
          <dt className="text-text-secondary">E-mail</dt>
          <dd>{user.email}</dd>
        </dl>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/favoritos"
            className="rounded-[6px] border border-primary px-4 py-2 text-sm font-medium text-text-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            Meus favoritos
          </Link>
          <button
            type="button"
            onClick={() =>
              logout.mutate(undefined, { onSettled: () => void navigate({ to: '/' }) })
            }
            className="rounded-[6px] bg-primary px-4 py-2 text-sm font-bold text-ink focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-ink focus-visible:outline-none"
          >
            Sair
          </button>
        </div>
      </section>
    </PageShell>
  )
}
