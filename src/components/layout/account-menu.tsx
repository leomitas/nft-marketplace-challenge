import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { ChevronDown } from 'lucide-react'
import loginIcon from '@/assets/figma/icon-login.svg'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from '@/components/ui/toaster'
import { useLogout, useSession } from '@/features/auth/use-session'

/**
 * "Entrar" button from the layout for visitors. Signed-in users get the same footprint with
 * their name and a menu (the layout has no signed-in header state).
 */
export function AccountMenu() {
  const { user, isPending } = useSession()
  const logout = useLogout()
  const navigate = useNavigate()
  const href = useRouterState({ select: (s) => s.location.href })
  const onAuthPage = href.startsWith('/login') || href.startsWith('/cadastro')

  const buttonClass =
    'flex h-[35px] min-w-[100px] items-center justify-center gap-1 rounded-[6px] bg-primary px-3 text-base font-medium text-ink hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-ink focus-visible:outline-none'

  // Keeps the header from flashing "Entrar" while the stored session is being checked
  if (isPending) return <span aria-hidden="true" className="h-[35px] w-[100px]" />

  if (!user) {
    return (
      <Link
        to="/login"
        search={{ redirect: onAuthPage ? undefined : href }}
        className={buttonClass}
      >
        <img src={loginIcon} alt="" width={20} height={20} />
        Entrar
      </Link>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={buttonClass} aria-label={`Conta de ${user.name}`}>
        <span className="max-w-32 truncate">{user.name.split(' ')[0]}</span>
        <ChevronDown className="size-4" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="min-w-48 border-border bg-surface-card text-foreground"
      >
        <DropdownMenuLabel className="flex flex-col font-normal">
          <span className="font-bold">{user.name}</span>
          <span className="text-xs text-text-secondary">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-border" />
        <DropdownMenuItem asChild className="focus:bg-surface-dark">
          <Link to="/perfil">Perfil</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="focus:bg-surface-dark">
          <Link to="/favoritos">Favoritos</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-border" />
        <DropdownMenuItem
          className="focus:bg-surface-dark"
          onSelect={() =>
            logout.mutate(undefined, {
              onSettled: () => {
                toast.success('Você saiu da sua conta.')
                void navigate({ to: '/' })
              },
            })
          }
        >
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
