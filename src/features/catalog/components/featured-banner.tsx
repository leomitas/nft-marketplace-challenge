import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Skeleton } from '@/components/ui/skeleton'
import { featuredQuery } from '../queries'

/** "NFT EM DESTAQUE" sidebar banner. The featured item comes from the API. */
export function FeaturedBanner() {
  const featured = useQuery(featuredQuery())
  // Non-essential block: on failure it simply hides instead of competing with the catalog error
  if (featured.isError) return null
  const nft = featured.data?.spotlight

  return (
    <section
      aria-labelledby="featured-title"
      className="relative flex h-[470px] w-[310px] flex-col gap-4 overflow-hidden bg-linear-to-b from-primary/10 to-primary/3 pt-6 pb-1"
    >
      <div className="flex flex-col items-center gap-4 px-5">
        <h2 id="featured-title" className="w-full text-2xl leading-8 font-bold text-text-accent">
          NFT EM DESTAQUE
        </h2>
        <p className="w-full text-center text-[22px] leading-4 font-bold text-foreground">
          OFERTA LIMITADA
        </p>
      </div>
      {nft ? (
        <Link
          to="/nfts/$nftId"
          params={{ nftId: nft.id }}
          className="relative block rounded-[22px] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <img
            src={nft.image.src}
            srcSet={nft.image.srcSet}
            sizes="310px"
            alt={nft.image.alt}
            width={310}
            height={368}
            loading="lazy"
            className="h-[368px] w-full rounded-[22px] object-cover"
          />
          <span className="sr-only">Ver {nft.name}</span>
        </Link>
      ) : (
        <Skeleton className="h-[368px] w-full rounded-[22px]" />
      )}
      {/* Decorative shapes from the design */}
      <span
        aria-hidden="true"
        className="absolute top-[299px] left-4 size-[22px] rounded-[7px] border-2 border-[#46a358] opacity-20"
      />
      <span
        aria-hidden="true"
        className="absolute top-[343px] left-[248px] size-[45px] rounded-[29px] bg-linear-[145deg] from-primary/30 from-46% to-primary/0"
      />
      <span
        aria-hidden="true"
        className="absolute top-[105px] left-[38px] size-[15px] rounded-[29px] bg-linear-[145deg] from-primary/30 from-46% to-primary/0"
      />
    </section>
  )
}
