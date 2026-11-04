import { Link, useCanGoBack, useNavigate, useRouter } from '@tanstack/react-router'
import { cn } from 'cn'
import { Dialog as DialogPrimitive } from 'radix-ui'
import closeIcon from '@/assets/figma/icon-close.svg'
import facebookIcon from '@/assets/figma/icon-facebook.svg'
import googleIcon from '@/assets/figma/icon-google.svg'
import { PageShell } from '@/components/layout/page-shell'
import { HomeHero } from '@/features/catalog/components/home-hero'
import { HomePromos } from '@/features/catalog/components/home-promos'

type Mode = 'login' | 'register'

const COPY: Record<Mode, { mobileTitle: string; subtitle: string }> = {
  login: {
    mobileTitle: 'Entrar',
    subtitle: 'Entre para gerenciar sua carteira, coleção e perfil de criador.',
  },
  register: {
    mobileTitle: 'Criar perfil de colecionador',
    subtitle: 'Crie seu perfil de colecionador e conecte uma carteira quando quiser.',
  },
}

/**
 * Desktop: modal over the marketplace page, as in the Figma "Sign In/Up Modal" frames.
 * Mobile: full-screen page with the large wordmark. Radix Dialog traps focus, and closing
 * (X, Esc) returns to where the user came from.
 */
export function AuthLayout({
  mode,
  redirect,
  notice,
  children,
}: {
  mode: Mode
  redirect?: string
  notice?: React.ReactNode
  children: React.ReactNode
}) {
  const navigate = useNavigate()
  const copy = COPY[mode]
  const router = useRouter()
  const canGoBack = useCanGoBack()
  // Closing returns to the previous page. It never goes to `redirect`: that may be a
  // private page, which would just bounce back here.
  const close = () => (canGoBack ? router.history.back() : void navigate({ to: '/' }))

  return (
    <>
      {/* Decorative page behind the modal (desktop only); not reachable by keyboard or AT */}
      <div inert aria-hidden="true" className="hidden md:block">
        <PageShell section="home">
          <HomeHero />
          <HomePromos />
        </PageShell>
      </div>

      <DialogPrimitive.Root open onOpenChange={(open) => !open && close()}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 hidden bg-ink/75 md:block" />
          <DialogPrimitive.Content
            aria-describedby="auth-subtitle"
            // Start on the first field instead of the close button
            onOpenAutoFocus={(event) => {
              const field = (event.currentTarget as HTMLElement).querySelector('input')
              if (field) {
                event.preventDefault()
                field.focus()
              }
            }}
            className={cn(
              'fixed inset-0 z-50 flex flex-col overflow-y-auto bg-ink px-7 pt-16 pb-8 focus:outline-none',
              'md:inset-auto md:top-1/2 md:left-1/2 md:max-h-[calc(100dvh-32px)] md:w-[500px] md:-translate-x-1/2 md:-translate-y-1/2 md:bg-surface-card md:px-0 md:pt-12 md:pb-0',
            )}
          >
            <DialogPrimitive.Close
              className="absolute top-3 right-3 flex size-9 items-center justify-center rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              aria-label="Fechar"
            >
              <img src={closeIcon} alt="" width={18} height={18} />
            </DialogPrimitive.Close>

            {/* Mobile header: wordmark + title */}
            <div className="flex flex-col items-center gap-10 md:hidden">
              <p
                aria-hidden="true"
                className="flex h-[136px] items-center text-[32px] font-bold tracking-[0.1em] text-foreground"
              >
                KURIO
              </p>
            </div>

            <div className="flex flex-col items-center gap-10 md:px-12">
              {/* Visible on mobile; on desktop the tab switch below plays the visual role */}
              <DialogPrimitive.Title className="text-center text-xl leading-4 font-bold text-foreground md:sr-only">
                {copy.mobileTitle}
              </DialogPrimitive.Title>
              <nav aria-label="Acesso à conta" className="hidden md:block">
                <ul className="flex items-center gap-2 text-xl leading-4 font-medium">
                  <li>
                    <AuthTab to="/login" current={mode === 'login'} redirect={redirect}>
                      Entrar
                    </AuthTab>
                  </li>
                  <li aria-hidden="true" className="h-5 w-px bg-[#f0805f]" />
                  <li>
                    <AuthTab to="/cadastro" current={mode === 'register'} redirect={redirect}>
                      Criar conta
                    </AuthTab>
                  </li>
                </ul>
              </nav>
              <DialogPrimitive.Description
                id="auth-subtitle"
                className="hidden text-center text-[13px] leading-4 text-foreground md:block"
              >
                {copy.subtitle}
              </DialogPrimitive.Description>
            </div>

            {notice && <div className="mt-8 md:mx-20 md:mt-6">{notice}</div>}

            <div className="mt-10 md:mt-0 md:px-20">{children}</div>

            <SocialBlock />

            <p className="mt-10 text-center text-[15px] text-text-secondary md:hidden">
              {mode === 'login' ? (
                <>
                  Novo na Kurio?{' '}
                  <Link
                    to="/cadastro"
                    search={{ redirect }}
                    className="underline-offset-4 hover:underline"
                  >
                    Crie uma conta
                  </Link>
                </>
              ) : (
                <>
                  Já tem uma conta?{' '}
                  <Link
                    to="/login"
                    search={{ redirect }}
                    className="underline-offset-4 hover:underline"
                  >
                    Entre
                  </Link>
                </>
              )}
            </p>

            <div
              aria-hidden="true"
              className="mt-auto hidden h-2.5 w-full bg-primary md:mt-12 md:block"
            />
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  )
}

function AuthTab({
  to,
  current,
  redirect,
  children,
}: {
  to: '/login' | '/cadastro'
  current: boolean
  redirect?: string
  children: React.ReactNode
}) {
  return (
    <Link
      to={to}
      search={{ redirect }}
      replace
      aria-current={current ? 'page' : undefined}
      className={cn(
        'rounded-sm px-0.5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        current ? 'text-text-accent' : 'text-foreground hover:text-text-accent',
      )}
    >
      {children}
    </Link>
  )
}

/** Third-party sign-in is out of scope: the buttons are shown disabled, not faked. */
function SocialBlock() {
  return (
    <div className="mt-6 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-[13px] leading-4 text-foreground">Ou continue com</span>
        <span className="h-px flex-1 bg-border" />
      </div>
      <div className="flex flex-col gap-4 md:gap-3 md:px-20">
        {[
          { icon: googleIcon, label: 'Continuar com Google' },
          { icon: facebookIcon, label: 'Continuar com Facebook' },
        ].map((provider) => (
          <button
            key={provider.label}
            type="button"
            disabled
            title="Disponível em breve"
            className="flex h-10 items-center justify-center gap-3 rounded-[5px] border border-border text-[13px] leading-4 font-medium text-text-secondary disabled:cursor-not-allowed"
          >
            <img src={provider.icon} alt="" width={20} height={20} />
            {provider.label}
            <span className="sr-only">(disponível em breve)</span>
          </button>
        ))}
      </div>
    </div>
  )
}
