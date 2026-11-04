import { useId, useRef, useState } from 'react'
import { z } from 'zod'
import type { User } from '@/api/contracts/auth'
import {
  AVATAR_MAX_BYTES,
  AVATAR_TYPES,
  passwordChangeSchema,
  profileUpdateSchema,
} from '@/api/contracts/profile'
import { TextField } from '@/components/form/text-field'
import { toast } from '@/components/ui/toaster'
import {
  apiFormErrors,
  focusFirstError,
  zodFieldErrors,
  type FieldErrors,
} from '@/features/auth/form-errors'
import {
  useChangePassword,
  useRemoveAvatar,
  useUpdateProfile,
  useUploadAvatar,
} from './use-profile'

export const sectionClass = 'flex flex-col gap-4 rounded-[10px] bg-surface-card p-5 md:p-6'
export const submitClass =
  'self-start rounded-[3px] bg-primary px-5 py-2.5 text-[15px] font-bold text-ink hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface-card focus-visible:outline-none disabled:opacity-60'

/** Form-level message under a section (API errors that are not tied to one field). */
export function FormMessage({ id, message }: { id: string; message?: string }) {
  return (
    <p id={id} role="alert" className="text-sm text-destructive empty:hidden">
      {message}
    </p>
  )
}

export function ProfileForm({ user }: { user: User }) {
  const id = useId()
  const update = useUpdateProfile()
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string>()

  return (
    <section aria-labelledby={`${id}-title`} className={sectionClass}>
      <h2 id={`${id}-title`} className="text-lg font-bold">
        Dados do colecionador
      </h2>
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          if (update.isPending) return
          const form = event.currentTarget
          const parsed = profileUpdateSchema.safeParse(Object.fromEntries(new FormData(form)))
          setFormError(undefined)
          if (!parsed.success) {
            const fields = zodFieldErrors(parsed.error)
            setErrors(fields)
            focusFirstError(form, fields)
            return
          }
          setErrors({})
          update.mutate(parsed.data, {
            onSuccess: () => toast.success('Perfil atualizado.'),
            onError: (error) => {
              const result = apiFormErrors(error)
              setErrors(result.fields)
              // Field messages already explain the problem; the form message is for the rest
              setFormError(Object.keys(result.fields).length ? undefined : result.form)
              focusFirstError(form, result.fields)
            },
          })
        }}
        className="grid gap-4 md:grid-cols-2"
      >
        <TextField
          name="name"
          label="Nome de exibição"
          autoComplete="name"
          defaultValue={user.name}
          error={errors.name}
        />
        <TextField
          name="username"
          label="Nome de usuário"
          autoComplete="username"
          defaultValue={user.username}
          error={errors.username}
        />
        <TextField
          name="email"
          type="email"
          label="E-mail"
          autoComplete="email"
          defaultValue={user.email}
          error={errors.email}
          className="md:col-span-2"
        />
        <div className="flex flex-col gap-2 md:col-span-2">
          <FormMessage id={`${id}-error`} message={formError} />
          <button type="submit" disabled={update.isPending} className={submitClass}>
            {update.isPending ? 'Salvando...' : 'Salvar dados'}
          </button>
        </div>
      </form>
    </section>
  )
}

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export function AvatarField({ user }: { user: User }) {
  const id = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const upload = useUploadAvatar()
  const remove = useRemoveAvatar()
  const [error, setError] = useState<string>()
  const busy = upload.isPending || remove.isPending

  return (
    <section aria-labelledby={`${id}-title`} className={sectionClass}>
      <h2 id={`${id}-title`} className="text-lg font-bold">
        Avatar
      </h2>
      <div className="flex flex-wrap items-center gap-5">
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={`Avatar de ${user.name}`}
            width={88}
            height={88}
            className="size-22 rounded-full object-cover"
          />
        ) : (
          <span
            role="img"
            aria-label={`Sem avatar; iniciais de ${user.name}`}
            className="flex size-22 items-center justify-center rounded-full bg-primary text-3xl font-bold text-ink"
          >
            {user.name.charAt(0).toUpperCase()}
          </span>
        )}
        <div className="flex flex-col gap-2">
          <label
            htmlFor={`${id}-file`}
            className="w-fit cursor-pointer rounded-[3px] border border-primary px-4 py-2 text-sm font-bold text-text-accent has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
          >
            {upload.isPending ? 'Enviando...' : 'Escolher imagem'}
            <input
              ref={inputRef}
              id={`${id}-file`}
              type="file"
              accept={AVATAR_TYPES.join(',')}
              disabled={busy}
              aria-describedby={`${id}-hint${error ? ` ${id}-error` : ''}`}
              aria-invalid={error ? true : undefined}
              className="sr-only"
              onChange={async (event) => {
                const file = event.target.files?.[0]
                event.target.value = ''
                if (!file) return
                if (!AVATAR_TYPES.includes(file.type)) {
                  setError('Use uma imagem PNG, JPG ou WebP.')
                  return
                }
                if (file.size > AVATAR_MAX_BYTES) {
                  setError('A imagem deve ter no máximo 200 KB.')
                  return
                }
                setError(undefined)
                upload.mutate(await readAsDataUrl(file), {
                  onSuccess: () => toast.success('Avatar atualizado.'),
                  onError: (e) => setError(apiFormErrors(e).fields.avatar ?? e.message),
                })
              }}
            />
          </label>
          <p id={`${id}-hint`} className="text-xs text-text-secondary">
            PNG, JPG ou WebP, até 200 KB.
          </p>
          {user.avatarUrl && (
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                remove.mutate(undefined, {
                  onSuccess: () => toast.success('Avatar removido.'),
                  onError: (e) => setError(e.message),
                })
              }
              className="w-fit text-sm font-bold text-text-accent underline underline-offset-4 disabled:opacity-60"
            >
              Remover avatar
            </button>
          )}
          {error && (
            <p id={`${id}-error`} role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

const passwordFormSchema = passwordChangeSchema
  .extend({ confirmPassword: z.string().min(1, 'Confirme a nova senha.') })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas não coincidem.',
  })

export function PasswordForm() {
  const id = useId()
  const change = useChangePassword()
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string>()

  return (
    <section aria-labelledby={`${id}-title`} className={sectionClass}>
      <h2 id={`${id}-title`} className="text-lg font-bold">
        Alterar senha
      </h2>
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          if (change.isPending) return
          const form = event.currentTarget
          const parsed = passwordFormSchema.safeParse(Object.fromEntries(new FormData(form)))
          setFormError(undefined)
          if (!parsed.success) {
            const fields = zodFieldErrors(parsed.error)
            setErrors(fields)
            focusFirstError(form, fields)
            return
          }
          setErrors({})
          const { confirmPassword: _confirm, ...body } = parsed.data
          change.mutate(body, {
            onSuccess: () => {
              form.reset()
              toast.success('Senha alterada.')
            },
            onError: (error) => {
              const result = apiFormErrors(error)
              setErrors(result.fields)
              setFormError(Object.keys(result.fields).length ? undefined : result.form)
              focusFirstError(form, result.fields)
            },
          })
        }}
        className="grid gap-4 md:grid-cols-3"
      >
        <TextField
          name="currentPassword"
          type="password"
          label="Senha atual"
          autoComplete="current-password"
          error={errors.currentPassword}
        />
        <TextField
          name="newPassword"
          type="password"
          label="Nova senha"
          autoComplete="new-password"
          hint="Ao menos 8 caracteres, com letras e números."
          error={errors.newPassword}
        />
        <TextField
          name="confirmPassword"
          type="password"
          label="Confirmar nova senha"
          autoComplete="new-password"
          error={errors.confirmPassword}
        />
        <div className="flex flex-col gap-2 md:col-span-3">
          <FormMessage id={`${id}-error`} message={formError} />
          <button type="submit" disabled={change.isPending} className={submitClass}>
            {change.isPending ? 'Alterando...' : 'Alterar senha'}
          </button>
        </div>
      </form>
    </section>
  )
}
