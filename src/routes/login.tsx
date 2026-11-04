import { createFileRoute, redirect } from '@tanstack/react-router'
import { AuthLayout } from '@/features/auth/auth-layout'
import { authSearchSchema } from '@/features/auth/auth-search'
import { LoginForm } from '@/features/auth/login-form'
import { safeRedirect, sessionQuery } from '@/features/auth/session'

export const Route = createFileRoute('/login')({
  validateSearch: authSearchSchema,
  beforeLoad: async ({ context, search }) => {
    // Already signed in: nothing to do here
    const session = await context.queryClient.ensureQueryData(sessionQuery())
    if (session) throw redirect({ href: safeRedirect(search.redirect), replace: true })
  },
  head: () => ({ meta: [{ title: 'Entrar · Kurio' }] }),
  component: LoginPage,
})

function LoginPage() {
  const search = Route.useSearch()
  const target = safeRedirect(search.redirect)

  return (
    <AuthLayout
      mode="login"
      redirect={search.redirect}
      notice={
        search.reason === 'expired' ? (
          <p
            role="status"
            className="rounded-[6px] border border-primary/60 bg-primary/10 px-4 py-3 text-sm text-foreground"
          >
            Sua sessão expirou. Entre novamente para continuar de onde parou.
          </p>
        ) : undefined
      }
    >
      <LoginForm redirect={target} />
    </AuthLayout>
  )
}
