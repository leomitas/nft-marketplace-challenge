import { cn } from 'cn'
import { useState } from 'react'
import type { GalleryImage } from '@/api/contracts/catalog'
import zoomIcon from '@/assets/figma/icon-zoom.svg'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

/** Renders one gallery view: same artwork, framed by its focus point and zoom. */
function GalleryImg({
  image,
  sizes,
  className,
  priority = false,
}: {
  image: GalleryImage
  sizes: string
  className?: string
  priority?: boolean
}) {
  return (
    <img
      src={image.src}
      srcSet={image.srcSet}
      sizes={sizes}
      alt={image.alt}
      width={404}
      height={404}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding="async"
      style={{
        objectPosition: `${image.focus.x}% ${image.focus.y}%`,
        transform: image.focus.zoom > 1 ? `scale(${image.focus.zoom})` : undefined,
        transformOrigin: `${image.focus.x}% ${image.focus.y}%`,
      }}
      className={cn('size-full object-cover', className)}
    />
  )
}

/** Desktop gallery from Figma: 4 thumbnails (100px) beside a 444px main frame with zoom. */
export function NftGallery({ images, name }: { images: GalleryImage[]; name: string }) {
  const [selected, setSelected] = useState(0)
  const current = images[selected] ?? images[0]

  return (
    <div className="flex gap-7">
      <div
        role="group"
        aria-label="Imagens do NFT"
        className="flex w-[100px] shrink-0 flex-col gap-4"
      >
        {images.map((image, index) => (
          <button
            key={index}
            type="button"
            onClick={() => setSelected(index)}
            aria-pressed={index === selected}
            aria-label={`Ver imagem ${index + 1} de ${images.length}`}
            className={cn(
              'size-[100px] overflow-hidden rounded-[8px] bg-surface-card focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-ink focus-visible:outline-none',
              index === selected ? 'border border-primary' : 'opacity-80 hover:opacity-100',
            )}
          >
            <GalleryImg image={image} sizes="100px" />
          </button>
        ))}
      </div>

      <div className="relative flex aspect-square w-full max-w-[444px] items-center justify-center self-start rounded-[6px] bg-surface-card p-4">
        <div className="size-full overflow-hidden rounded-3xl">
          <GalleryImg image={current} sizes="(min-width: 1024px) 404px, 40vw" priority />
        </div>
        <Dialog>
          <DialogTrigger
            className="absolute top-[15px] right-[15px] rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            aria-label="Ampliar imagem"
          >
            <img src={zoomIcon} alt="" width={30} height={30} />
          </DialogTrigger>
          <DialogContent className="max-w-[min(90vw,720px)] border-border bg-surface-card p-4 sm:max-w-[min(90vw,720px)]">
            <DialogTitle className="sr-only">{name}</DialogTitle>
            <DialogDescription className="sr-only">{current.alt}</DialogDescription>
            <div className="aspect-square w-full overflow-hidden rounded-2xl">
              <GalleryImg image={current} sizes="720px" />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

export { GalleryImg }
