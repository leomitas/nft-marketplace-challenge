import { Link } from '@tanstack/react-router'
import { cn } from 'cn'
import cartIcon from '@/assets/figma/icon-cart.svg'
import loginIcon from '@/assets/figma/icon-login.svg'
import { HeaderSearch } from './header-search'
import { SoonBadge } from './soon'

type Section = 'home' | 'market'

/** Desktop/tablet header ("Header Row" in Figma). Mobile uses the bottom tab bar instead. */
export function SiteHeader({ active, divider = true }: { active: Section; divider?: boolean }) {
  return (
    <header className="hidden md:block">
      <div className="flex items-center justify-between gap-6 py-1">
        <Link
          to="/"
          className="w-40 text-sm font-bold tracking-[0.1em] text-foreground"
          aria-label="Kurio, página inicial"
        >
          KURIO
        </Link>

        <nav aria-label="Principal">
          <ul className="flex items-start gap-6 text-base lg:gap-10">
            <NavItem current={active === 'home'}>
              <Link
                to="/"
                activeOptions={{ exact: true, includeHash: true }}
                aria-current={active === 'home' ? 'page' : undefined}
              >
                Início
              </Link>
            </NavItem>
            <NavItem current={active === 'market'}>
              <Link
                to="/"
                hash="catalogo"
                activeOptions={{ exact: true, includeHash: true }}
                aria-current={active === 'market' ? 'page' : undefined}
              >
                Mercado
              </Link>
            </NavItem>
            <NavItem>
              <span className="cursor-not-allowed" title="Disponível em breve">
                Criadores
                <SoonBadge />
              </span>
            </NavItem>
            <NavItem>
              <span className="cursor-not-allowed" title="Disponível em breve">
                Aprenda
                <SoonBadge />
              </span>
            </NavItem>
          </ul>
        </nav>

        <div className="flex items-center gap-7">
          <HeaderSearch />
          {/* Cart and sign-in arrive with their slices; until then they are visibly unavailable */}
          <span className="relative opacity-60" title="Carrinho disponível em breve">
            <img src={cartIcon} alt="" width={24} height={24} />
            <span className="sr-only">Carrinho (disponível em breve)</span>
          </span>
          <span
            className="flex h-[35px] w-[100px] cursor-not-allowed items-center justify-center gap-1 rounded-[6px] bg-primary text-base font-medium text-ink opacity-60"
            title="Login disponível em breve"
          >
            <img src={loginIcon} alt="" width={20} height={20} />
            Entrar
            <span className="sr-only">(disponível em breve)</span>
          </span>
        </div>
      </div>
      {divider && <hr className="mt-1 border-t-[0.3px] border-foreground/60" />}
    </header>
  )
}

function NavItem({ current, children }: { current?: boolean; children: React.ReactNode }) {
  return (
    <li
      className={cn(
        'flex flex-col gap-6 pt-1',
        current ? 'font-bold text-text-accent' : 'text-foreground',
        // Active underline drawn in Figma as a 3px rule spanning the item
        current && 'after:h-[3px] after:w-full after:rounded-full after:bg-text-accent',
      )}
    >
      {children}
    </li>
  )
}
