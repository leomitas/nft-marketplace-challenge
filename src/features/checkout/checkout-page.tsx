import { Link } from '@tanstack/react-router'
import { cn } from 'cn'
import { useId, useRef, useState } from 'react'
import type { User } from '@/api/contracts/auth'
import type { Cart, Quote } from '@/api/contracts/cart'
import { NETWORKS, type NetworkId } from '@/api/contracts/catalog'
import { collectorSchema, type Collector } from '@/api/contracts/orders'
import {
  WALLET_PROVIDERS,
  type Wallet,
  type WalletConnection,
  type WalletProvider,
} from '@/api/contracts/wallets'
import { TextField } from '@/components/form/text-field'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/toaster'
import { zodFieldErrors, type FieldErrors } from '@/features/auth/form-errors'
import { CartIssues } from '@/features/cart/cart-issues'
import { Totals } from '@/features/cart/cart-summary'
import { useCart, useQuote } from '@/features/cart/use-cart'
import { formatEth } from '@/lib/money'
import { checkoutDraft, type CheckoutDraft } from './draft'
import { shortHex } from './format'
import { ReviewDialog, type ReviewPayload } from './review-dialog'
import {
  useConnectWallet,
  useDisconnectWallet,
  useWalletConnection,
  useWallets,
} from './use-checkout'

const PROVIDER_BADGE: Record<WalletProvider, string> = {
  walletconnect: 'W',
  metamask: 'M',
  coinbase: 'C',
}

export function CheckoutPage({ user }: { user: User }) {
  const cart = useCart()
  const quote = useQuote()
  const wallets = useWallets()
  const connection = useWalletConnection()

  if (cart.isPending || quote.isPending || wallets.isPending || connection.isPending) {
    return <CheckoutSkeleton />
  }
  if (cart.isError || quote.isError || wallets.isError || connection.isError) {
    return (
      <div role="alert" className="flex flex-col items-start gap-4 rounded-lg bg-surface-card p-8">
        <p>Não foi possível carregar o pagamento.</p>
        <button
          type="button"
          onClick={() => {
            void cart.refetch()
            void quote.refetch()
            void wallets.refetch()
            void connection.refetch()
          }}
          className="rounded-[6px] bg-primary px-4 py-2 font-bold text-ink"
        >
          Tentar novamente
        </button>
      </div>
    )
  }
  if (!cart.data.lines.length) {
    return (
      <div role="status" className="flex flex-col items-start gap-4 rounded-lg bg-surface-card p-8">
        <p className="text-lg font-bold">Seu carrinho está vazio</p>
        <p className="text-sm text-text-secondary">
          Adicione NFTs ao carrinho para seguir para o pagamento.
        </p>
        <Link
          to="/"
          hash="catalogo"
          className="rounded-[6px] bg-primary px-4 py-2 font-bold text-ink"
        >
          Continuar explorando
        </Link>
      </div>
    )
  }

  return (
    <CheckoutForm
      user={user}
      cart={cart.data}
      quote={quote.data}
      wallets={wallets.data}
      connection={connection.data}
    />
  )
}

function CheckoutForm({
  user,
  cart,
  quote,
  wallets,
  connection,
}: {
  user: User
  cart: Cart
  quote: Quote
  wallets: Wallet[]
  connection: WalletConnection | null
}) {
  const id = useId()
  const formRef = useRef<HTMLFormElement>(null)
  const connectRef = useRef<HTMLButtonElement>(null)
  const [draft, setDraft] = useState<CheckoutDraft>(() => checkoutDraft.load(user.id))
  const [errors, setErrors] = useState<FieldErrors>({})
  const [review, setReview] = useState<ReviewPayload | null>(null)
  const connect = useConnectWallet()
  const disconnect = useDisconnectWallet()

  const collector: Collector = {
    displayName: draft.collector.displayName ?? user.name,
    username: draft.collector.username ?? user.username,
    email: draft.collector.email ?? user.email,
    referralCode: draft.collector.referralCode ?? '',
    note: draft.collector.note ?? '',
  }
  const wallet = wallets.find((w) => w.id === draft.walletId) ?? wallets[0]
  const network: NetworkId | undefined = draft.network ?? wallet?.network
  const provider: WalletProvider | undefined = draft.provider ?? wallet?.provider
  const connected = Boolean(
    wallet &&
    connection &&
    connection.walletId === wallet.id &&
    connection.provider === provider &&
    connection.network === network,
  )

  const update = (patch: Partial<CheckoutDraft>) => {
    const next = { ...draft, ...patch, collector: { ...draft.collector, ...patch.collector } }
    setDraft(next)
    checkoutDraft.save(user.id, next)
  }
  const setField = (name: keyof Collector) => (value: string) => {
    update({ collector: { [name]: value } })
    if (errors[name]) setErrors(({ [name]: _removed, ...rest }) => rest)
  }

  const onConnect = () => {
    if (!wallet || !provider || !network) return
    setErrors(({ connection: _removed, ...rest }) => rest)
    connect.mutate(
      { walletId: wallet.id, provider, network },
      {
        onSuccess: () => toast.success(`${WALLET_PROVIDERS[provider]} conectada.`),
        onError: (error) => setErrors((prev) => ({ ...prev, connection: error.message })),
      },
    )
  }

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const parsed = collectorSchema.safeParse(collector)
    const fields: FieldErrors = parsed.success ? {} : zodFieldErrors(parsed.error)
    if (!wallet) fields.wallet = 'Cadastre uma carteira para pagar.'
    else if (!connected) fields.connection = 'Conecte a carteira selecionada para continuar.'
    setErrors(fields)
    const first = Object.keys(fields)[0]
    if (first === 'connection') {
      connectRef.current?.focus()
      return
    }
    if (first) {
      const input = formRef.current?.elements.namedItem(first)
      if (input instanceof HTMLElement) input.focus()
      return
    }
    if (!parsed.success || !wallet || !provider || !network) return
    setReview({ collector: parsed.data, wallet, provider, network, quoteId: quote.id })
  }

  const fieldClass = 'md:[&_input]:h-[34px] md:[&_input]:rounded-[3px] [&_label]:font-medium'

  return (
    <>
      <form
        ref={formRef}
        noValidate
        onSubmit={onSubmit}
        aria-label="Pagamento"
        className="grid gap-8 pb-28 md:grid-cols-[minmax(0,1fr)_352px] md:gap-7 md:pb-0"
      >
        <div className="flex min-w-0 flex-col gap-8">
          <section aria-labelledby={`${id}-collector`} className="flex flex-col gap-4">
            <h2 id={`${id}-collector`} className="text-lg leading-4 font-bold">
              Perfil do colecionador
            </h2>
            <div className="grid gap-x-5 gap-y-4 md:grid-cols-2">
              <TextField
                name="displayName"
                label="Nome de exibição *"
                autoComplete="name"
                value={collector.displayName}
                onChange={(e) => setField('displayName')(e.target.value)}
                error={errors.displayName}
                className={fieldClass}
              />
              <TextField
                name="username"
                label="Nome de usuário *"
                autoComplete="username"
                value={collector.username}
                onChange={(e) => setField('username')(e.target.value)}
                error={errors.username}
                className={fieldClass}
              />
              <TextField
                name="email"
                type="email"
                label="E-mail *"
                autoComplete="email"
                value={collector.email}
                onChange={(e) => setField('email')(e.target.value)}
                error={errors.email}
                className={fieldClass}
              />
              <TextField
                name="referralCode"
                label="Código de indicação (opcional)"
                autoComplete="off"
                value={collector.referralCode}
                onChange={(e) => setField('referralCode')(e.target.value)}
                error={errors.referralCode}
                className={fieldClass}
              />
              <NoteField value={collector.note} onChange={setField('note')} error={errors.note} />
            </div>
          </section>

          <WalletPicker
            wallets={wallets}
            selected={wallet}
            error={errors.wallet}
            onSelect={(next) =>
              update({ walletId: next.id, network: next.network, provider: next.provider })
            }
          />

          <div className="flex flex-col gap-1.5 md:max-w-[calc(50%-10px)]">
            <label htmlFor={`${id}-network`} className="text-sm font-medium">
              Rede *
            </label>
            <select
              id={`${id}-network`}
              name="network"
              value={network ?? ''}
              disabled={!wallet}
              onChange={(e) => update({ network: e.target.value as NetworkId })}
              className="h-10 rounded-[5px] border border-border bg-surface-card px-3 text-sm text-foreground focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary focus-visible:outline-none md:h-[34px] md:rounded-[3px]"
            >
              {Object.entries(NETWORKS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <section aria-labelledby={`${id}-items`} className="hidden flex-col gap-3 md:flex">
            <h2 id={`${id}-items`} className="text-lg leading-4 font-bold">
              Seus NFTs
            </h2>
            <div aria-hidden="true" className="flex justify-between text-base leading-4 font-bold">
              <span>NFTs</span>
              <span>Subtotal</span>
            </div>
            <hr className="border-foreground/30" />
            <ul className="flex flex-col gap-3">
              {cart.lines.map((line) => (
                <li
                  key={line.id}
                  className="flex items-center gap-3 bg-surface-card p-1 pr-3 text-sm"
                >
                  <img
                    src={line.image.src}
                    alt=""
                    width={56}
                    height={56}
                    className="size-14 shrink-0 rounded-[6px] object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{line.name}</p>
                    <p className="truncate text-xs text-text-secondary">
                      ID do token: {line.tokenId} · {line.editionLabel}
                    </p>
                  </div>
                  <span className="text-xs text-text-secondary">(x {line.quantity})</span>
                  <span className="font-bold text-text-accent">{formatEth(line.lineTotalEth)}</span>
                </li>
              ))}
            </ul>
            <p className="text-center text-sm">
              Tem um código promocional?{' '}
              <Link to="/carrinho" className="text-text-accent underline-offset-4 hover:underline">
                Aplique no carrinho
              </Link>
            </p>
            <Totals quote={quote} updating={false} mobile={false} />
          </section>

          <CartIssues cart={cart} />

          <ProviderPicker
            selected={provider}
            disabled={!wallet}
            onSelect={(next) => update({ provider: next })}
          />

          <div className="flex flex-col gap-2" aria-live="polite">
            {connected && connection ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-[6px] border border-primary/60 bg-primary/10 px-3 py-2 text-sm">
                <p role="status">
                  Conectada: <strong>{WALLET_PROVIDERS[connection.provider]}</strong> ·{' '}
                  {shortHex(connection.address)} · {NETWORKS[connection.network]}
                </p>
                <button
                  type="button"
                  disabled={disconnect.isPending}
                  onClick={() =>
                    disconnect.mutate(undefined, {
                      onSuccess: () => toast.success('Carteira desconectada.'),
                      onError: (e) => toast.error(e.message),
                    })
                  }
                  className="font-bold text-text-accent underline underline-offset-4 disabled:opacity-60"
                >
                  Desconectar
                </button>
              </div>
            ) : (
              <button
                ref={connectRef}
                type="button"
                onClick={onConnect}
                disabled={!wallet || connect.isPending}
                aria-busy={connect.isPending}
                aria-describedby={errors.connection ? `${id}-connection-error` : undefined}
                className="h-10 rounded-[3px] border border-primary text-[15px] font-bold text-text-accent hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-60"
              >
                {connect.isPending ? 'Aguardando a carteira...' : 'Conectar carteira'}
              </button>
            )}
            {errors.connection && (
              <p id={`${id}-connection-error`} role="alert" className="text-sm text-destructive">
                {errors.connection}
              </p>
            )}
          </div>

          <p className="flex items-baseline justify-end gap-6 text-xl font-bold md:hidden">
            Total: <span className="text-text-accent">{formatEth(quote.totalEth)}</span>
          </p>

          <div className="fixed inset-x-0 bottom-0 z-40 bg-background/95 px-6 pt-3 pb-6 md:static md:bg-transparent md:p-0">
            <button
              type="submit"
              className="h-[60px] w-full rounded-full bg-linear-[100deg] from-primary to-primary/80 text-base font-bold text-ink hover:opacity-95 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-ink focus-visible:outline-none md:h-10 md:rounded-[3px] md:bg-primary md:bg-none md:text-[15px]"
            >
              Confirmar compra
            </button>
          </div>
        </div>
      </form>

      {review && (
        <ReviewDialog
          payload={review}
          cart={cart}
          quote={quote}
          onAcceptQuote={(quoteId) => setReview({ ...review, quoteId })}
          onClose={() => setReview(null)}
          onWalletDisconnected={() => {
            setReview(null)
            setErrors({ connection: 'A carteira foi desconectada. Conecte novamente.' })
            connectRef.current?.focus()
          }}
        />
      )}
    </>
  )
}

function NoteField({
  value,
  onChange,
  error,
}: {
  value: string
  onChange: (value: string) => void
  error?: string
}) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1.5 md:col-span-2 md:max-w-[calc(50%-10px)]">
      <label htmlFor={id} className="text-sm font-medium">
        Observação do colecionador (opcional)
      </label>
      <textarea
        id={id}
        name="note"
        rows={4}
        maxLength={300}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(
          'resize-y rounded-[3px] border bg-transparent p-3 text-sm focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary focus-visible:outline-none',
          error ? 'border-destructive' : 'border-border',
        )}
      />
      {error && (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

function WalletPicker({
  wallets,
  selected,
  error,
  onSelect,
}: {
  wallets: Wallet[]
  selected?: Wallet
  error?: string
  onSelect: (wallet: Wallet) => void
}) {
  const id = useId()
  return (
    <fieldset className="flex flex-col gap-3" aria-describedby={error ? `${id}-error` : undefined}>
      <legend className="mb-3 text-lg leading-4 font-bold">Carteira cadastrada</legend>
      {wallets.length === 0 && (
        <p id={`${id}-error`} role="alert" className="text-sm text-destructive">
          {error ?? 'Você ainda não tem carteiras cadastradas.'}{' '}
          <Link to="/carteiras" className="font-bold text-text-accent underline underline-offset-4">
            Cadastrar carteira
          </Link>
        </p>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        {wallets.map((wallet) => (
          <label
            key={wallet.id}
            className="flex cursor-pointer items-start gap-4 rounded-[10px] bg-surface-card p-4 ring-primary has-checked:ring-1 has-focus-visible:ring-2 has-focus-visible:ring-ring"
          >
            <input
              type="radio"
              name="wallet"
              value={wallet.id}
              checked={selected?.id === wallet.id}
              onChange={() => onSelect(wallet)}
              className="mt-1 size-4 accent-primary"
            />
            <span className="flex min-w-0 flex-col gap-1 text-sm">
              <span className="text-base font-bold">{wallet.label}</span>
              <span className="truncate text-text-secondary">
                {wallet.ens ?? shortHex(wallet.address)}
              </span>
              <span className="text-text-secondary">Rede {NETWORKS[wallet.network]}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

function ProviderPicker({
  selected,
  disabled,
  onSelect,
}: {
  selected?: WalletProvider
  disabled: boolean
  onSelect: (provider: WalletProvider) => void
}) {
  return (
    <fieldset disabled={disabled} className="flex flex-col gap-3">
      <legend className="mb-3 text-lg leading-4 font-bold">Carteira e rede</legend>
      {(Object.keys(WALLET_PROVIDERS) as WalletProvider[]).map((provider) => (
        <label
          key={provider}
          className="flex cursor-pointer items-center gap-3 rounded-[10px] border border-transparent bg-surface-card p-3 has-checked:border-primary has-focus-visible:ring-2 has-focus-visible:ring-ring md:rounded-[3px] md:border-border/60"
        >
          <span
            aria-hidden="true"
            className="flex size-10 items-center justify-center rounded-full bg-surface-raised font-bold text-text-accent"
          >
            {PROVIDER_BADGE[provider]}
          </span>
          <span className="flex-1 text-[15px]">{WALLET_PROVIDERS[provider]}</span>
          <input
            type="radio"
            name="provider"
            value={provider}
            checked={selected === provider}
            onChange={() => onSelect(provider)}
            className="size-4 accent-primary"
          />
        </label>
      ))}
    </fieldset>
  )
}

function CheckoutSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Carregando pagamento"
      className="grid gap-8 md:grid-cols-[minmax(0,1fr)_352px] md:gap-7"
    >
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-[58px] w-full" />
        ))}
      </div>
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  )
}
