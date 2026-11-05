import { useId, useState } from 'react'
import { NETWORKS } from '@/api/contracts/catalog'
import { walletInputSchema } from '@/api/contracts/profile'
import {
  WALLET_PROVIDERS,
  WALLET_ROLES,
  type Wallet,
  type WalletRole,
} from '@/api/contracts/wallets'
import { TextField } from '@/components/form/text-field'
import { toast } from '@/components/ui/toaster'
import { apiFormErrors, focusFirstError } from '@/features/auth/form-errors'
import { useLiveValidation } from '@/features/auth/use-live-validation'
import { FormMessage, sectionClass, submitClass } from './profile-forms'
import { useSaveWallet } from './use-profile'

const selectClass =
  'h-10 rounded-[5px] border border-border bg-surface-card px-3 text-sm text-foreground focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary focus-visible:outline-none'

/** Create or edit the primary or secondary wallet. */
export function WalletForm({ role, wallet }: { role: WalletRole; wallet?: Wallet }) {
  const id = useId()
  const save = useSaveWallet()
  const validation = useLiveValidation(walletInputSchema)
  const errors = validation.errors
  const [formError, setFormError] = useState<string>()
  const title = `Carteira ${WALLET_ROLES[role].toLowerCase()}`

  return (
    <section aria-labelledby={`${id}-title`} className={sectionClass}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id={`${id}-title`} className="text-lg font-bold">
          {title}
        </h2>
        {!wallet && <span className="text-sm text-text-secondary">Não cadastrada</span>}
      </div>
      <form
        noValidate
        aria-labelledby={`${id}-title`}
        onChange={validation.onChange}
        onBlur={validation.onBlur}
        onSubmit={(event) => {
          event.preventDefault()
          if (save.isPending) return
          const form = event.currentTarget
          const parsed = validation.submit(form)
          setFormError(undefined)
          if (!parsed.success) {
            focusFirstError(form, parsed.fields)
            return
          }
          save.mutate(
            { role, body: parsed.data },
            {
              onSuccess: () => toast.success(`${title} salva.`),
              onError: (error) => {
                const result = apiFormErrors(error)
                validation.setApiErrors(result.fields)
                // Field messages already explain the problem; the form message is for the rest
                setFormError(Object.keys(result.fields).length ? undefined : result.form)
                focusFirstError(form, result.fields)
              },
            },
          )
        }}
        className="grid gap-4 md:grid-cols-2"
      >
        <TextField
          name="label"
          label="Nome da carteira"
          defaultValue={wallet?.label ?? (role === 'primary' ? 'Principal' : 'Reserva')}
          error={errors.label}
        />
        <TextField
          name="address"
          label="Endereço 0x"
          autoComplete="off"
          spellCheck={false}
          placeholder="0x..."
          defaultValue={wallet?.address}
          error={errors.address}
        />
        <TextField
          name="ens"
          label="Nome ENS (opcional)"
          autoComplete="off"
          placeholder="nome.eth"
          defaultValue={wallet?.ens ?? ''}
          error={errors.ens}
        />
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${id}-network`} className="text-sm">
            Rede
          </label>
          <select
            id={`${id}-network`}
            name="network"
            defaultValue={wallet?.network ?? 'ethereum'}
            className={selectClass}
          >
            {Object.entries(NETWORKS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${id}-provider`} className="text-sm">
            App da carteira
          </label>
          <select
            id={`${id}-provider`}
            name="provider"
            defaultValue={wallet?.provider ?? 'metamask'}
            className={selectClass}
          >
            {Object.entries(WALLET_PROVIDERS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2 md:col-span-2">
          <FormMessage id={`${id}-error`} message={formError} />
          <button type="submit" disabled={save.isPending} className={submitClass}>
            {save.isPending ? 'Salvando...' : wallet ? 'Salvar alterações' : 'Cadastrar carteira'}
          </button>
        </div>
      </form>
    </section>
  )
}
