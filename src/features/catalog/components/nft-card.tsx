import { Link } from '@tanstack/react-router'
import { cn } from 'cn'
import type { NftSummary } from '@/api/contracts/catalog'
import { Skeleton } from '@/components/ui/skeleton'
import { formatEth } from '@/lib/money'

// Desktop: flat surface-card block with a 250px artwork. Mobile: rounded gradient tile.
const tileClass =
  'rounded-[20px] bg-linear-[140deg] from-surface-card from-12% to-surface-raised px-1 pt-3 pb-5 md:rounded-none md:bg-none md:bg-surface-card md:pt-6 md:pb-7'

export function NftCard({ nft, priority = false }: { nft: NftSummary; priority?: boolean }) {
  const soldOut = nft.editions.available === 0
  return (
    <article className="group relative flex flex-col gap-2 md:gap-3">
      <div className={cn(tileClass, 'relative')}>
        <img
          src={nft.image.src}
          srcSet={nft.image.srcSet}
          sizes="(min-width: 768px) 250px, 45vw"
          alt={nft.image.alt}
          width={250}
          height={250}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          decoding="async"
          className="aspect-square w-full rounded-2xl object-cover transition-transform duration-300 group-hover:scale-[1.02] motion-reduce:transition-none md:rounded-[15px]"
        />
        {nft.rarity === 'rare' && (
          <span className="absolute top-4 left-0 bg-primary px-2 py-2 text-[13px] leading-4 font-medium text-ink">
            RARO
          </span>
        )}
        {soldOut && (
          <span className="absolute right-3 bottom-7 rounded-[6px] bg-ink/85 px-2 py-1 text-xs font-bold text-foreground md:bottom-9">
            Esgotado
          </span>
        )}
      </div>
      <div className="flex flex-col pl-2 md:gap-1.5 md:pl-0">
        <h3 className="text-[15px] text-foreground md:text-base md:leading-4">
          {/* Stretched link: the whole card is clickable, with a single tab stop */}
          <Link
            to="/nfts/$nftId"
            params={{ nftId: nft.id }}
            className="after:absolute after:inset-0 after:rounded-[20px] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring md:after:rounded-none"
          >
            {nft.name}
          </Link>
        </h3>
        <p className="flex items-center gap-3 text-base leading-4 md:text-lg">
          <span className="font-bold text-text-accent">
            <span className="sr-only">Preço: </span>
            {formatEth(nft.priceEth)}
          </span>
          {nft.previousPriceEth && (
            <s className="text-brand-secondary">
              <span className="sr-only">Preço anterior: </span>
              {formatEth(nft.previousPriceEth)}
            </s>
          )}
        </p>
      </div>
    </article>
  )
}

export function NftCardSkeleton() {
  return (
    <div className="flex flex-col gap-2 md:gap-3" aria-hidden="true">
      <div className={tileClass}>
        <Skeleton className="aspect-square w-full rounded-2xl md:rounded-[15px]" />
      </div>
      <div className="flex flex-col gap-2 pl-2 md:pl-0">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/3" />
      </div>
    </div>
  )
}
