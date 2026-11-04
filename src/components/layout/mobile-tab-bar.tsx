import { Link } from '@tanstack/react-router'
import heartIcon from '@/assets/figma/m-icon-heart.svg'
import homeIcon from '@/assets/figma/m-icon-home.svg'
import scanIcon from '@/assets/figma/m-icon-scan.svg'
import shopIcon from '@/assets/figma/m-icon-shop.svg'
import userIcon from '@/assets/figma/m-icon-user.svg'
import tabBarBg from '@/assets/figma/m-tabbar-bg.svg'
import tabBarCenter from '@/assets/figma/m-tabbar-center.svg'

/**
 * Bottom navigation from the mobile frames. Favorites, cart and profile arrive with their
 * slices; the center scan action is out of scope, so it is disabled rather than fake.
 */
export function MobileTabBar() {
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 h-[96px] md:hidden"
    >
      <img
        src={tabBarBg}
        alt=""
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[96px] w-full"
        // The SVG has its own drop shadow and notch; stretching it keeps the notch centered
        style={{ objectFit: 'fill' }}
      />
      <button
        type="button"
        disabled
        title="Disponível em breve"
        aria-label="Escanear (disponível em breve)"
        className="absolute top-[-32px] left-1/2 flex size-[65px] -translate-x-1/2 items-center justify-center rounded-full"
      >
        <img src={tabBarCenter} alt="" className="absolute inset-0 size-full" />
        <img src={scanIcon} alt="" width={27} height={24} className="relative" />
      </button>
      <ul className="relative grid h-full grid-cols-5 items-center px-6 pt-8">
        <li className="flex justify-center">
          <Link
            to="/"
            activeOptions={{ exact: true, includeHash: false }}
            className="flex size-11 items-center justify-center rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            aria-label="Início"
          >
            <img src={homeIcon} alt="" width={16} height={17} />
          </Link>
        </li>
        <SoonItem icon={heartIcon} label="Favoritos" width={20} height={18} />
        <li aria-hidden="true" />
        <SoonItem icon={shopIcon} label="Carrinho" width={20} height={20} />
        <SoonItem icon={userIcon} label="Perfil" width={20} height={20} />
      </ul>
    </nav>
  )
}

function SoonItem({
  icon,
  label,
  width,
  height,
}: {
  icon: string
  label: string
  width: number
  height: number
}) {
  return (
    <li className="flex justify-center">
      <span
        className="flex size-11 items-center justify-center opacity-60"
        title="Disponível em breve"
      >
        <img src={icon} alt="" width={width} height={height} />
        <span className="sr-only">{label} (disponível em breve)</span>
      </span>
    </li>
  )
}
