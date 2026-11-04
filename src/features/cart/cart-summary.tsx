import { Link } from '@tanstack/react-router'
import { cn } from 'cn'
import { useId, useState } from 'react'
import type { Quote } from '@/api/contracts/cart'
import { couponCodeSchema } from '@/api/contracts/cart'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/toaster'
import { formatEth } from '@/lib/money'
import { useApplyCoupon, useQuote, useRemoveCoupon } from './use-cart'

/**
 * "Resumo da carteira": coupon, subtotal, discount, network fee and total, all from the API
 * quote (never computed in the browser). The CTA stays disabled while the quote has issues.
 */
export function CartSummary({
  variant,
  checkout,
}: {
  variant: 'desktop' | 'mobile'
  checkout: React.ReactNode
}) {
  const quote = useQuote()
  const mobile = variant === 'mobile'

  return (
    <section
      aria-labelledby={`summary-title-${variant}`}
      className={cn('flex flex-col', mobile ? 'gap-3' : 'gap-6')}
    >
      <div className={cn('flex flex-col gap-3', mobile && 'sr-only')}>
        <h2 id={`summary-title-${variant}`} className="text-lg leading-4 font-bold text-foreground">
          Resumo da carteira
        </h2>
        <hr className="border-foreground/30" />
      </div>

      <CouponForm quote={quote.data} variant={variant} />

      <div aria-live="polite" aria-busy={quote.isFetching}>
        {quote.isPending ? (
          <SummarySkeleton />
        ) : quote.isError ? (
          <p role="alert" className="text-sm text-text-secondary">
            Não foi possível calcular o total.{' '}
            <button
              type="button"
              onClick={() => quote.refetch()}
              className="font-bold text-text-accent underline"
            >
              Tentar novamente
            </button>
          </p>
        ) : (
          <Totals quote={quote.data} updating={quote.isFetching} mobile={mobile} />
        )}
      </div>

      <div className={cn('flex flex-col items-center gap-3', mobile && 'mt-2')}>
        {checkout}
        {!mobile && (
          <Link
            to="/"
            hash="catalogo"
            className="text-[15px] text-text-accent underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            Continuar explorando
          </Link>
        )}
      </div>
    </section>
  )
}

function Totals({ quote, updating, mobile }: { quote: Quote; updating: boolean; mobile: boolean }) {
  return (
    <dl
      className={cn(
        'flex flex-col gap-3 text-[15px] text-foreground transition-opacity',
        updating && 'opacity-60',
      )}
    >
      <div className="flex items-start justify-between">
        <dt>Subtotal</dt>
        <dd className="text-lg leading-4">{formatEth(quote.subtotalEth)}</dd>
      </div>
      <div className="flex items-start justify-between">
        <dt>{quote.coupon ? `Desconto (${quote.coupon.code})` : 'Desconto do lançamento'}</dt>
        <dd>(-) {formatEth(quote.discountEth)}</dd>
      </div>
      <div className="flex flex-col items-end gap-1">
        <div className="flex w-full items-center justify-between">
          <dt>Taxa de rede</dt>
          <dd className="text-lg leading-4">{formatEth(quote.networkFeeEth)}</dd>
        </div>
        <p className="text-xs leading-4 text-text-accent">Taxa estimada</p>
      </div>
      <div className={cn('flex items-start justify-between font-bold', !mobile && 'mt-3')}>
        <dt className="text-base leading-4">Total</dt>
        <dd className="text-lg leading-4 text-text-accent">{formatEth(quote.totalEth)}</dd>
      </div>
    </dl>
  )
}

function CouponForm({ quote, variant }: { quote?: Quote; variant: 'desktop' | 'mobile' }) {
  const id = useId()
  const apply = useApplyCoupon()
  const remove = useRemoveCoupon()
  const [error, setError] = useState<string>()
  const mobile = variant === 'mobile'

  if (quote?.coupon) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-[3px] border border-primary/60 bg-primary/10 px-3 py-2 text-sm">
        <p>
          Cupom <strong className="text-text-accent">{quote.coupon.code}</strong> aplicado:{' '}
          {quote.coupon.description}.
        </p>
        <button
          type="button"
          disabled={remove.isPending}
          onClick={() =>
            remove.mutate(undefined, {
              onSuccess: () => toast.success('Cupom removido.'),
              onError: (e) => toast.error(e.message),
            })
          }
          className="shrink-0 font-bold text-text-accent underline underline-offset-4 disabled:opacity-60"
        >
          Remover
        </button>
      </div>
    )
  }

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        const raw = new FormData(event.currentTarget).get('code')
        const parsed = couponCodeSchema.safeParse(raw)
        if (!parsed.success) {
          setError(parsed.error.issues[0]?.message)
          return
        }
        setError(undefined)
        apply.mutate(parsed.data, {
          onSuccess: () => toast.success(`Cupom ${parsed.data} aplicado.`),
          onError: (e) => setError(e.message),
        })
      }}
      className="flex flex-col gap-2"
    >
      <label
        htmlFor={`${id}-code`}
        className={cn('text-sm leading-4 font-bold text-foreground', mobile && 'sr-only')}
      >
        Código promocional
      </label>
      <div
        className={cn(
          'flex h-10 items-center',
          mobile
            ? 'h-[50px] rounded-full border border-border bg-surface-raised pl-4'
            : 'rounded-[3px] border pl-2',
          error ? 'border-destructive' : !mobile && 'border-primary',
          'focus-within:ring-2 focus-within:ring-ring',
        )}
      >
        <input
          id={`${id}-code`}
          name="code"
          autoComplete="off"
          placeholder="Digite o código promocional..."
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className="min-w-0 flex-1 bg-transparent text-xs leading-4 text-foreground uppercase placeholder:text-brand-secondary placeholder:normal-case focus:outline-none"
        />
        <button
          type="submit"
          disabled={apply.isPending}
          className={cn(
            'h-full shrink-0 font-bold text-ink disabled:opacity-70',
            mobile
              ? 'm-1 h-[42px] rounded-full bg-linear-[100deg] from-primary to-primary/80 px-4 text-[15px]'
              : 'w-[102px] rounded-r-[3px] bg-primary text-[15px] leading-4',
          )}
        >
          {apply.isPending ? 'Aplicando...' : 'Aplicar'}
        </button>
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </form>
  )
}

function SummarySkeleton() {
  return (
    <div aria-label="Calculando total" className="flex flex-col gap-3">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="flex justify-between">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
      <div className="mt-3 flex justify-between">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  )
}
