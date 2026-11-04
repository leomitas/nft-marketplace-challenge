import arrowRight from '@/assets/figma/m-icon-arrow-right.svg'
import heroDots from '@/assets/figma/hero-dots.svg'
import mobileHeroBg from '@/assets/figma/m-hero-mask.svg'
import mobileDots from '@/assets/figma/m-hero-dots.svg'

// Marketing artwork (static in Figma). It is the LCP element, so it loads eagerly at high priority.
const HERO_ART = {
  src: '/nfts/ape-green-960.webp',
  srcSet: '/nfts/ape-green-480.webp 480w, /nfts/ape-green-960.webp 960w',
}
const HERO_ALT = 'Retrato de um macaco com óculos escuros redondos e jaqueta verde de colégio'

function scrollToCatalog() {
  const catalog = document.getElementById('catalogo')
  catalog?.scrollIntoView({
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
  })
  catalog?.focus({ preventScroll: true })
}

export function HomeHero() {
  return (
    <>
      {/* Desktop/tablet hero */}
      <section
        aria-labelledby="hero-title"
        className="hidden overflow-hidden rounded-3xl bg-surface-card md:flex md:items-center md:justify-between md:gap-8 md:p-8 lg:h-[450px] lg:py-0 lg:pr-0 lg:pl-10"
      >
        <div className="flex max-w-[600px] flex-col items-end gap-11">
          <div className="flex w-full flex-col items-start gap-8">
            <div className="flex flex-col gap-1">
              <p className="text-sm leading-4 font-medium tracking-[0.1em] text-foreground">
                Bem-vindo à Kurio
              </p>
              <h1
                id="hero-title"
                className="mt-2 text-[32px] leading-[52px] font-bold text-foreground lg:text-[43px] lg:leading-[70px]"
              >
                SEJA DONO DO FUTURO
                <br />
                DA ARTE DIGITAL
              </h1>
              <p className="max-w-[557px] text-sm leading-6 text-text-secondary">
                Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte
                digital rara, apoie artistas e tenha uma parte da cultura da internet.
              </p>
            </div>
            <button
              type="button"
              onClick={scrollToCatalog}
              className="flex h-10 w-[140px] items-center justify-center rounded-[6px] bg-primary text-base leading-5 font-bold text-ink hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface-card focus-visible:outline-none"
            >
              EXPLORAR
            </button>
          </div>
          <img src={heroDots} alt="" width={40} height={8} />
        </div>
        <img
          src={HERO_ART.src}
          srcSet={HERO_ART.srcSet}
          sizes="(min-width: 1024px) 450px, 40vw"
          alt={HERO_ALT}
          width={450}
          height={450}
          fetchPriority="high"
          className="aspect-square w-[40%] max-w-[450px] shrink-0 rounded-3xl object-cover lg:w-[450px]"
        />
      </section>

      {/* Mobile hero banner */}
      <section
        aria-labelledby="hero-title-mobile"
        className="relative flex min-h-[190px] flex-col items-center justify-center gap-4 overflow-hidden rounded-[30px] p-4 md:hidden"
      >
        <img
          src={mobileHeroBg}
          alt=""
          className="pointer-events-none absolute inset-0 size-full"
          style={{ objectFit: 'fill' }}
        />
        <div className="relative flex w-full items-center gap-2">
          <div className="flex min-w-0 flex-1 flex-col">
            <p className="text-xs leading-4 font-medium text-foreground">Bem-vindo à Kurio</p>
            <h1
              id="hero-title-mobile"
              className="mt-1.5 text-lg leading-[29px] font-bold text-foreground"
            >
              SEJA DONO DA
              <br />
              CULTURA DIGITAL
            </h1>
            <p className="mt-1.5 text-xs leading-[18px] text-text-secondary">
              Descubra NFTs selecionados de criadores do mundo todo.
            </p>
            <button
              type="button"
              onClick={scrollToCatalog}
              className="mt-1 flex items-center gap-2 self-start py-1 text-xs leading-[14px] font-bold text-text-accent focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              EXPLORAR
              {/* Figma arrow points down; rotated -90° as in the design */}
              <img src={arrowRight} alt="" width={10} height={12} className="-rotate-90" />
            </button>
          </div>
          {/* Figma frame is 414px wide: on narrower phones the artwork shrinks to leave room for the title */}
          <div className="relative size-[clamp(104px,33vw,138px)] shrink-0">
            <img
              src={HERO_ART.src}
              srcSet={HERO_ART.srcSet}
              sizes="138px"
              alt={HERO_ALT}
              width={138}
              height={138}
              fetchPriority="high"
              className="size-full rounded-2xl object-cover"
            />
            <img
              src="/nfts/ape-hat-480.webp"
              alt=""
              width={58}
              height={58}
              className="absolute bottom-[-8%] left-[10%] size-[42%] rounded-2xl object-cover"
            />
          </div>
        </div>
        <img src={mobileDots} alt="" width={33} height={7} className="relative" />
      </section>
    </>
  )
}
