import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { PageShell } from '@/components/layout/page-shell'
import { useLogout, useSession } from '@/features/auth/use-session'
import { AvatarField, PasswordForm, ProfileForm } from '@/features/profile/profile-forms'

// No Figma frame: follows the payment form's visual language (cards, labels, orange actions)
export const Route = createFileRoute('/_authenticated/perfil')({
  head: () => ({ meta: [{ title: 'Perfil · Kurio' }] }),
  component: ProfilePage,
})

const linkClass =
  'rounded-[6px] border border-primary px-4 py-2 text-sm font-medium text-text-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'

function ProfilePage() {
  const context = Route.useRouteContext()
  // The session cache follows profile mutations; the route context is the fallback
  const user = useSession().user ?? context.user
  const logout = useLogout()
  const navigate = useNavigate()

  return (
    <PageShell section="home">
      <div className="flex max-w-3xl flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-[28px] font-bold">Perfil do colecionador</h1>
          <p className="text-sm text-text-secondary">{user.email}</p>
        </div>
        {/* Keyed by user so forms never keep another account's values */}
        <AvatarField key={`avatar-${user.id}`} user={user} />
        <ProfileForm key={`profile-${user.id}`} user={user} />
        <PasswordForm key={`password-${user.id}`} />
        <nav aria-label="Conta" className="flex flex-wrap gap-3">
          <Link to="/carteiras" className={linkClass}>
            Minhas carteiras
          </Link>
          <Link to="/favoritos" className={linkClass}>
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
        </nav>
      </div>
    </PageShell>
  )
}
