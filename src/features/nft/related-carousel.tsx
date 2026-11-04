import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { cn } from 'cn'
import { useEffect, useRef, useState } from 'react'
import type { CollectionId } from '@/api/contracts/catalog'
import { Skeleton } from '@/components/ui/skeleton'
import { catalogListQuery } from '@/features/catalog/queries'
import { formatEth } from '@/lib/money'

/**
 * "Mais desta coleção": items of the same collection, in a horizontal scroll-snap row.
 * The dots reflect and control the scroll position, like the carousel dots in Figma.
 */
export function RelatedCarousel({
  nftId,
  collection,
}: {
  nftId: string
  collection: CollectionId
}) {
  const related = useQuery(catalogListQuery({ collections: [collection], pageSize: 11 }))
  const items = related.data?.items.filter((item) => item.id !== nftId).slice(0, 10) ?? []
  const scroller = useRef<HTMLUListElement>(null)
  const [page, setPage] = useState(0)
  const [pages, setPages] = useState(1)

  useEffect(() => {
    const el = scroller.current
    if (!el) return
    const update = () => {
      setPages(Math.max(1, Math.ceil(el.scrollWidth / el.clientWidth)))
      setPage(Math.round(el.scrollLeft / el.clientWidth))
    }
    update()
    el.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      el.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [items.length])

  if (related.isError || (related.isSuccess && items.length === 0)) return null

  return (
    <section aria-labelledby="related-title" className="flex flex-col gap-8">
      <div className="flex flex-col gap-3 border-b border-foreground/30 pb-3">
        <h2 id="related-title" className="text-[17px] leading-4 font-bold text-text-accent">
          Mais desta coleção
        </h2>
      </div>

      <ul
        ref={scroller}
        className="flex snap-x snap-mandatory [scrollbar-width:none] gap-6 overflow-x-auto scroll-smooth pb-2 motion-reduce:scroll-auto"
      >
        {related.isPending
          ? Array.from({ length: 5 }, (_, i) => (
              <li key={i} className="w-[219px] shrink-0">
                <Skeleton className="h-[255px] w-full rounded-none" />
              </li>
            ))
          : items.map((item) => (
              <li key={item.id} className="relative w-[180px] shrink-0 snap-start md:w-[219px]">
                <div className="flex h-[210px] items-center justify-center bg-surface-card px-1 md:h-[255px]">
                  <img
                    src={item.image.src}
                    srcSet={item.image.srcSet}
                    sizes="212px"
                    alt={item.image.alt}
                    width={212}
                    height={212}
                    loading="lazy"
                    className="aspect-square w-full rounded-[13px] object-cover"
                  />
                </div>
                <h3 className="mt-3 text-[15px] text-foreground">
                  <Link
                    to="/nfts/$nftId"
                    params={{ nftId: item.id }}
                    className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring"
                  >
                    {item.name}
                  </Link>
                </h3>
                <p className="text-base leading-4 font-bold text-text-accent">
                  {formatEth(item.priceEth)}
                </p>
              </li>
            ))}
      </ul>

      {pages > 1 && (
        <div className="flex justify-center gap-2" role="group" aria-label="Páginas do carrossel">
          {Array.from({ length: pages }, (_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Ir para a página ${i + 1} de ${pages}`}
              aria-current={i === page ? 'true' : undefined}
              onClick={() => scroller.current?.scrollTo({ left: i * scroller.current.clientWidth })}
              className={cn(
                'size-3 rounded-full border border-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-ink focus-visible:outline-none',
                i === page && 'bg-primary',
              )}
            />
          ))}
        </div>
      )}
    </section>
  )
}
