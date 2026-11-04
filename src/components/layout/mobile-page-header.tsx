import { useCanGoBack, useRouter } from '@tanstack/react-router'
import arrowLeft from '@/assets/figma/m-icon-arrow-left.svg'

/** Mobile frames' top bar: round back button and a centered title (the page h1 is separate). */
export function MobilePageHeader({ title }: { title: string }) {
  const router = useRouter()
  const canGoBack = useCanGoBack()
  return (
    <div className="relative flex h-[35px] items-center justify-center md:hidden">
      <button
        type="button"
        onClick={() => (canGoBack ? router.history.back() : void router.navigate({ to: '/' }))}
        aria-label="Voltar"
        className="absolute left-0 flex size-[35px] items-center justify-center rounded-full bg-surface-raised focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        {/* Figma arrow points down; rotated 90° to point left, as in the design */}
        <img src={arrowLeft} alt="" width={12} height={7} className="rotate-90" />
      </button>
      <p aria-hidden="true" className="text-xl leading-4 font-bold text-foreground">
        {title}
      </p>
    </div>
  )
}
