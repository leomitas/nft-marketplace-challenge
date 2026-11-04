import { useQuery } from '@tanstack/react-query'
import { cn } from 'cn'
import { NETWORKS, type NftDetail } from '@/api/contracts/catalog'
import linkedinIcon from '@/assets/figma/icon-linkedin.svg'
import messageIcon from '@/assets/figma/icon-message.svg'
import starEmpty from '@/assets/figma/icon-star-empty.svg'
import starIcon from '@/assets/figma/icon-star.svg'
import twitterIcon from '@/assets/figma/icon-twitter.svg'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { reviewsQuery } from '@/features/catalog/queries'

export function RatingStars({ average, count }: { average: number; count: number }) {
  const filled = Math.round(average)
  return (
    <p className="flex items-center gap-1 text-[15px] text-foreground">
      <span className="sr-only">Nota {average.toFixed(1)} de 5.</span>
      {Array.from({ length: 5 }, (_, i) => (
        <img
          key={i}
          src={i < filled ? starIcon : starEmpty}
          alt=""
          width={15}
          height={15}
          className="p-px"
        />
      ))}
      <span className="ml-0.5">{count} avaliações de colecionadores</span>
    </p>
  )
}

/** Real share links (new tab): LinkedIn, e-mail and X/Twitter. */
export function ShareLinks({ nft }: { nft: NftDetail }) {
  const url = typeof window === 'undefined' ? '' : window.location.href.split('?')[0]
  const text = `${nft.name} na Kurio`
  const links = [
    {
      label: 'Compartilhar no LinkedIn',
      icon: linkedinIcon,
      size: [15, 14],
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    },
    {
      label: 'Compartilhar por e-mail',
      icon: messageIcon,
      size: [18, 18],
      href: `mailto:?subject=${encodeURIComponent(text)}&body=${encodeURIComponent(url)}`,
    },
    {
      label: 'Compartilhar no X (Twitter)',
      icon: twitterIcon,
      size: [16, 12],
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
    },
  ] as const

  return (
    <div className="flex items-center gap-2">
      <p className="text-[15px] leading-4 font-bold text-foreground">Compartilhar este NFT:</p>
      <ul className="flex items-center gap-1">
        {links.map((link) => (
          <li key={link.label}>
            <a
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${link.label} (abre em nova aba)`}
              className="flex size-7 items-center justify-center rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <img src={link.icon} alt="" width={link.size[0]} height={link.size[1]} />
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** "Detalhes do NFT" / "Avaliações de colecionadores (n)" tabs. Reviews load on first open. */
export function NftInfoTabs({ nft }: { nft: NftDetail }) {
  return (
    <Tabs defaultValue="details" className="gap-3">
      <TabsList className="h-auto w-full flex-wrap justify-start gap-x-8 gap-y-2 rounded-none border-b border-foreground/30 bg-transparent p-0">
        {[
          { value: 'details', label: 'Detalhes do NFT' },
          { value: 'reviews', label: `Avaliações de colecionadores (${nft.rating.count})` },
        ].map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className={cn(
              'h-auto flex-none rounded-none border-0 border-b-[3px] border-transparent bg-transparent px-0 pt-0 pb-3 text-left text-[15px] leading-5 font-normal whitespace-normal text-foreground shadow-none md:text-[17px] md:leading-4',
              'data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:font-bold data-[state=active]:text-text-accent data-[state=active]:shadow-none',
              'focus-visible:ring-2 focus-visible:ring-ring dark:data-[state=active]:bg-transparent',
            )}
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="details" className="flex flex-col text-sm leading-6">
        {nft.description.map((paragraph, i) => (
          <p key={i} className={cn('text-text-secondary', i > 0 && 'mt-6')}>
            {paragraph}
          </p>
        ))}
        <dl className="mt-3 flex flex-col">
          <dt className="font-bold text-foreground">Rede:</dt>
          <dd className="text-text-secondary">
            Cunhado na {NETWORKS[nft.network]} com procedência imutável e metadados armazenados no
            IPFS.
          </dd>
          <dt className="mt-3 font-bold text-foreground">Contrato:</dt>
          <dd className="text-text-secondary">
            {nft.contract.address} • Contrato inteligente {nft.contract.standard} verificado.
          </dd>
          <dt className="mt-3 font-bold text-foreground">Direitos autorais:</dt>
          <dd className="text-text-secondary">
            Direitos autorais do criador: {nft.royaltyPercent}% nas vendas secundárias, pagos
            automaticamente pelos mercados compatíveis.
          </dd>
        </dl>
      </TabsContent>

      <TabsContent value="reviews">
        <ReviewList nftId={nft.id} />
      </TabsContent>
    </Tabs>
  )
}

function ReviewList({ nftId }: { nftId: string }) {
  const reviews = useQuery(reviewsQuery(nftId))

  if (reviews.isPending) {
    return (
      <div aria-busy="true" aria-label="Carregando avaliações" className="flex flex-col gap-4">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    )
  }
  if (reviews.isError) {
    return (
      <p role="alert" className="text-sm text-text-secondary">
        Não foi possível carregar as avaliações.{' '}
        <button
          type="button"
          onClick={() => reviews.refetch()}
          className="font-bold text-text-accent underline"
        >
          Tentar novamente
        </button>
      </p>
    )
  }
  return (
    <ul className="flex flex-col divide-y divide-border">
      {reviews.data.items.map((review) => (
        <li key={review.id} className="flex flex-col gap-1 py-4 text-sm">
          <p className="flex items-center gap-3">
            <span className="font-bold text-foreground">{review.author}</span>
            <span className="text-text-accent" aria-label={`Nota ${review.rating} de 5`}>
              {'★'.repeat(review.rating)}
              <span aria-hidden="true" className="text-border-soft">
                {'★'.repeat(5 - review.rating)}
              </span>
            </span>
            <time dateTime={review.createdAt} className="text-xs text-text-secondary">
              {new Date(review.createdAt).toLocaleDateString('pt-BR')}
            </time>
          </p>
          <p className="text-text-secondary">{review.comment}</p>
        </li>
      ))}
    </ul>
  )
}
