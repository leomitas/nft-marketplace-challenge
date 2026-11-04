import { Link } from '@tanstack/react-router'
import arrowRight from '@/assets/figma/icon-arrow-right.svg'
import promoMask from '@/assets/figma/promo-mask.svg'

/**
 * Two promo cards. Their "Explorar" buttons open the catalog already filtered, so they lead
 * somewhere real instead of being decorative.
 */
export function HomePromos() {
  return (
    <section aria-label="Destaques do mercado" className="hidden gap-6 md:grid lg:grid-cols-2">
      <PromoCard
        title={['Lançamentos gênesis', 'de edição limitada']}
        text="Colecione edições escassas diretamente dos criadores antes da revelação pública."
        image="/nfts/ape-green-480.webp"
        link={{ search: { tab: 'new' } }}
      />
      <PromoCard
        title={['Arte digital selecionada', 'e muito mais']}
        text="Explore novos artistas, coleções verificadas e obras digitais que definem a cultura."
        image="/nfts/ape-dark-480.webp"
        link={{ search: { collections: ['arte-digital'] } }}
      />
    </section>
  )
}

function PromoCard({
  title,
  text,
  image,
  link,
}: {
  title: [string, string]
  text: string
  image: string
  link: { search: { tab?: 'new'; collections?: ['arte-digital'] } }
}) {
  return (
    <article className="relative flex h-[250px] overflow-hidden rounded-lg bg-surface-card">
      <img
        src={image}
        alt=""
        width={292}
        height={250}
        loading="lazy"
        className="h-full w-[292px] max-w-[50%] shrink-0 rounded-[18px] object-cover"
      />
      <img
        src={promoMask}
        alt=""
        className="pointer-events-none absolute inset-0 size-full"
        style={{ objectFit: 'fill' }}
      />
      <div className="relative flex flex-1 flex-col items-end justify-center gap-4 px-6 text-right lg:pr-[30px]">
        <h2 className="text-lg leading-6 font-bold text-foreground">
          {title[0]}
          <br />
          {title[1]}
        </h2>
        <p className="max-w-[263px] text-sm leading-6 text-text-secondary">{text}</p>
        <Link
          to="/"
          search={link.search}
          hash="catalogo"
          className="mt-2 flex h-10 w-[140px] items-center justify-center gap-6 rounded-[6px] bg-primary text-sm leading-5 font-medium text-ink hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface-card focus-visible:outline-none"
        >
          Explorar
          {/* Figma arrow points down; rotated -90° as in the design */}
          <img src={arrowRight} alt="" width={11} height={13} className="-rotate-90" />
        </Link>
      </div>
    </article>
  )
}
