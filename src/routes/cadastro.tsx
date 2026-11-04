import { createFileRoute, redirect } from '@tanstack/react-router'
import { AuthLayout } from '@/features/auth/auth-layout'
import { authSearchSchema } from '@/features/auth/auth-search'
import { RegisterForm } from '@/features/auth/register-form'
import { safeRedirect, sessionQuery } from '@/features/auth/session'

export const Route = createFileRoute('/cadastro')({
  validateSearch: authSearchSchema,
  beforeLoad: async ({ context, search }) => {
    const session = await context.queryClient.ensureQueryData(sessionQuery())
    if (session) throw redirect({ href: safeRedirect(search.redirect), replace: true })
  },
  head: () => ({ meta: [{ title: 'Criar conta · Kurio' }] }),
  component: RegisterPage,
})

function RegisterPage() {
  const search = Route.useSearch()
  return (
    <AuthLayout mode="register" redirect={search.redirect}>
      <RegisterForm redirect={safeRedirect(search.redirect)} />
    </AuthLayout>
  )
}
