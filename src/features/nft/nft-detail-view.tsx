import { Link, useCanGoBack, useNavigate, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import type { EditionId, NftDetail } from '@/api/contracts/catalog'
import arrowLeft from '@/assets/figma/m-icon-arrow-left.svg'
import shopIcon from '@/assets/figma/m-icon-shop-dark.svg'
import starIcon from '@/assets/figma/icon-star.svg'
import { toast } from '@/components/ui/toaster'
import { useAddToCart } from '@/features/cart/use-cart'
import { FavoriteButton } from '@/features/favorites/favorite-button'
import { formatEth, multiplyEth } from '@/lib/money'
import { EditionPicker } from './edition-picker'
import { defaultEdition } from './editions'
import { NftInfoTabs, RatingStars, ShareLinks } from './nft-extras'
import { GalleryImg, NftGallery } from './nft-gallery'
import { QuantityStepper } from './quantity-stepper'
import { RelatedCarousel } from './related-carousel'

/**
 * Full NFT detail. The selected edition lives in the URL (`?edition=`), so a shared or
 * refreshed link keeps it; the quantity is local and clamped to stock and per-order limit.
 */
export function NftDetailView({
  nft,
  edition: editionParam,
  onEditionChange,
}: {
  nft: NftDetail
  edition?: EditionId
  onEditionChange: (id: EditionId) => void
}) {
  const requested = nft.editionOptions.find((e) => e.id === editionParam && e.available > 0)
  const editionId = requested?.id ?? defaultEdition(nft.editionOptions)
  const edition = nft.editionOptions.find((e) => e.id === editionId)
  const soldOut = !edition

  const max = edition ? Math.min(edition.available, nft.maxPerOrder) : 0
  const [rawQuantity, setQuantity] = useState(1)
  // Clamped on read: switching to a tier with less stock never shows an invalid amount
  const quantity = Math.min(Math.max(1, rawQuantity), Math.max(1, max))
  const limitReason =
    edition && edition.available < nft.maxPerOrder
      ? `Apenas ${edition.available} ${edition.available === 1 ? 'disponível' : 'disponíveis'} nesta edição.`
      : `Limite de ${nft.maxPerOrder} unidades por pedido.`

  const unitPrice = edition?.priceEth ?? nft.priceEth
  const selectEdition = (id: EditionId) => {
    setQuantity(1)
    onEditionChange(id)
  }

  const addToCart = useAddToCart()
  const navigate = useNavigate()
  /** "Comprar" adds and opens the cart; the mobile cart button only adds. */
  function add(goToCart: boolean) {
    if (!edition || addToCart.isPending) return
    addToCart.mutate(
      { nftId: nft.id, editionId: edition.id, quantity },
      {
        onSuccess: () => {
          if (goToCart) void navigate({ to: '/carrinho' })
          else
            toast.success(`${nft.name} (${edition.label}) adicionado ao carrinho.`, {
              action: { label: 'Ver carrinho', onClick: () => void navigate({ to: '/carrinho' }) },
            })
        },
        onError: (error) => toast.error(error.message),
      },
    )
  }

  return (
    <>
      {/* ---------- Desktop / tablet ---------- */}
      <div className="hidden flex-col gap-24 md:flex">
        <div className="flex flex-col gap-3">
          <nav aria-label="Trilha" className="text-[15px] leading-4 font-bold text-foreground">
            <Link to="/" className="hover:underline">
              Início
            </Link>{' '}
            /{' '}
            <Link to="/" hash="catalogo" className="hover:underline">
              Mercado
            </Link>
          </nav>

          <div className="flex flex-col gap-8 lg:flex-row">
            <NftGallery images={nft.gallery} name={nft.name} />

            <div className="flex flex-1 flex-col justify-between gap-6">
              <div className="flex flex-col gap-3 border-b border-foreground/30 pb-3">
                <h1 className="text-[28px] font-bold text-foreground">{nft.name}</h1>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-[22px] leading-4 font-bold text-text-accent">
                    <span className="sr-only">Preço da edição selecionada: </span>
                    {formatEth(unitPrice)}
                  </p>
                  <RatingStars average={nft.rating.average} count={nft.rating.count} />
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <h2 className="text-[15px] leading-4 font-bold text-foreground">Sobre este NFT:</h2>
                <p className="text-sm leading-6 text-text-secondary">{nft.about}</p>
              </div>

              <EditionPicker
                editions={nft.editionOptions}
                value={editionId}
                onChange={selectEdition}
              />

              <div className="flex flex-wrap items-start justify-between gap-4">
                <QuantityStepper
                  value={quantity}
                  max={max}
                  onChange={setQuantity}
                  limitReason={limitReason}
                  disabled={soldOut}
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => add(true)}
                    disabled={soldOut || addToCart.isPending}
                    aria-busy={addToCart.isPending}
                    className="flex h-10 w-[130px] items-center justify-center rounded-[6px] bg-primary text-sm leading-5 font-bold text-ink hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-ink focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {soldOut ? 'ESGOTADO' : addToCart.isPending ? 'ADICIONANDO...' : 'COMPRAR'}
                  </button>
                  <FavoriteButton nft={nft} variant="detail" />
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <TokenInfo nft={nft} />
                <ShareLinks nft={nft} />
              </div>
            </div>
          </div>
        </div>

        <NftInfoTabs nft={nft} />
        <RelatedCarousel
          title="Mais desta coleção"
          query={{ collections: [nft.collection], pageSize: 11 }}
          excludeIds={[nft.id]}
        />
      </div>

      {/* ---------- Mobile ---------- */}
      <div className="-mx-6 -mt-10 flex flex-col md:hidden">
        <div className="bg-linear-[138deg] from-surface-card from-12% to-surface-raised px-7 pt-6 pb-[130px]">
          <div className="flex items-center justify-between">
            <BackButton />
            <FavoriteButton nft={nft} variant="round" />
          </div>
          <div className="mt-2 aspect-[361/356] overflow-hidden rounded-3xl">
            <GalleryImg image={nft.gallery[0]} sizes="100vw" priority />
          </div>
        </div>

        <div className="-mt-[114px] flex flex-col gap-3 rounded-t-[31px] bg-surface-card px-6 pt-8 pb-[200px]">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-xl leading-6 font-bold text-foreground">{nft.name}</h1>
            <p className="flex h-[27px] shrink-0 items-center gap-1.5 rounded-full border border-primary px-1.5 text-sm leading-4">
              <img src={starIcon} alt="" width={14} height={14} />
              <span className="font-medium text-foreground">{nft.rating.average.toFixed(1)}</span>
              <span className="text-text-secondary">({nft.rating.count})</span>
              <span className="sr-only">
                Nota {nft.rating.average.toFixed(1)} de 5 em {nft.rating.count} avaliações
              </span>
            </p>
          </div>
          <p className="text-sm leading-6 text-text-secondary">{nft.about}</p>
          <EditionPicker
            editions={nft.editionOptions}
            value={editionId}
            onChange={selectEdition}
            gap="gap-3"
          />
          <TokenInfo nft={nft} />
          <div className="mt-6">
            <NftInfoTabs nft={nft} />
          </div>
          <div className="mt-10">
            <RelatedCarousel
              title="Mais desta coleção"
              query={{ collections: [nft.collection], pageSize: 11 }}
              excludeIds={[nft.id]}
            />
          </div>
        </div>

        {/* Buy bar, fixed at the bottom as in the mobile frame */}
        <div className="fixed inset-x-0 bottom-0 z-40 flex flex-col gap-5 rounded-t-[40px] bg-surface-card px-6 pt-5 pb-9 shadow-[0_0_10px_rgba(10,6,4,0.45)]">
          <div className="flex items-center justify-between">
            <QuantityStepper
              value={quantity}
              max={max}
              onChange={setQuantity}
              size="sm"
              label="Qtd."
              showLabel
              disabled={soldOut}
            />
            <p className="text-right text-xl leading-4 font-bold text-text-accent">
              <span className="sr-only">Total: </span>
              {formatEth(multiplyEth(unitPrice, quantity))}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => add(true)}
              disabled={soldOut || addToCart.isPending}
              className="flex h-[60px] flex-1 items-center justify-center rounded-[40px] bg-linear-[100deg] from-primary from-4% to-primary/80 text-base leading-5 font-bold text-ink focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface-card focus-visible:outline-none disabled:opacity-60"
            >
              {soldOut ? 'Esgotado' : 'Comprar NFT'}
            </button>
            <button
              type="button"
              onClick={() => add(false)}
              disabled={soldOut || addToCart.isPending}
              aria-label={`Adicionar ${nft.name} ao carrinho`}
              className="flex size-[60px] shrink-0 items-center justify-center rounded-[40px] border border-border bg-surface-raised focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-60"
            >
              <img src={shopIcon} alt="" width={20} height={20} />
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

function TokenInfo({ nft }: { nft: NftDetail }) {
  return (
    <dl className="flex flex-col gap-3 text-[15px] text-brand-secondary">
      <div>
        <dt className="inline">ID do token: </dt>
        <dd className="inline">{nft.tokenId}</dd>
      </div>
      <div>
        <dt className="inline">Coleção: </dt>
        <dd className="inline">{nft.collectionName}</dd>
      </div>
      <div>
        <dt className="inline">Atributos: </dt>
        <dd className="inline">{nft.attributes.join(', ')}</dd>
      </div>
    </dl>
  )
}

function BackButton() {
  const router = useRouter()
  const canGoBack = useCanGoBack()
  const className =
    'flex size-[35px] items-center justify-center rounded-full border border-border bg-surface-raised focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
  const icon = (
    // Figma arrow points down; rotated 90° to point left, as in the design
    <img src={arrowLeft} alt="" width={12} height={7} className="rotate-90" />
  )
  return canGoBack ? (
    <button
      type="button"
      onClick={() => router.history.back()}
      aria-label="Voltar"
      className={className}
    >
      {icon}
    </button>
  ) : (
    <Link to="/" aria-label="Voltar ao início" className={className}>
      {icon}
    </Link>
  )
}
