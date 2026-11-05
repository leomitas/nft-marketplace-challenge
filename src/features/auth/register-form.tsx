import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { z } from 'zod'
import { registerRequestSchema } from '@/api/contracts/auth'
import { TextField } from '@/components/form/text-field'
import { apiFormErrors, focusFirstError } from './form-errors'
import { useLiveValidation } from './use-live-validation'
import { useRegister } from './use-session'

// The API contract plus the confirmation field, which only exists in the form
const registerFormSchema = registerRequestSchema
  .extend({ confirmPassword: z.string().min(1, 'Confirme sua senha.') })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas não coincidem.',
  })

const fieldClass = 'md:[&_input]:h-10 md:[&_input]:rounded-[5px]'

export function RegisterForm({ redirect }: { redirect: string }) {
  const register = useRegister()
  const navigate = useNavigate()
  const validation = useLiveValidation(registerFormSchema)
  const errors = validation.errors
  const [formError, setFormError] = useState<string>()

  return (
    <form
      noValidate
      onChange={validation.onChange}
      onBlur={validation.onBlur}
      onSubmit={(event) => {
        event.preventDefault()
        if (register.isPending) return
        const form = event.currentTarget
        const parsed = validation.submit(form)
        setFormError(undefined)
        if (!parsed.success) {
          focusFirstError(form, parsed.fields)
          return
        }
        const { confirmPassword: _confirm, ...body } = parsed.data
        register.mutate(body, {
          onSuccess: () => void navigate({ href: redirect, replace: true }),
          onError: (error) => {
            const result = apiFormErrors(error)
            validation.setApiErrors(result.fields)
            setFormError(result.form)
            focusFirstError(form, result.fields)
          },
        })
      }}
      className="flex flex-col gap-3 md:pt-6"
    >
      <TextField
        name="username"
        label="Nome de usuário"
        hideLabel
        placeholder="Nome de usuário"
        autoComplete="username"
        error={errors.username}
        hint="De 3 a 24 caracteres: letras, números, ponto ou sublinhado."
        size="lg"
        className={fieldClass}
      />
      <TextField
        name="email"
        type="email"
        label="E-mail"
        hideLabel
        placeholder="Digite seu e-mail"
        autoComplete="email"
        error={errors.email}
        size="lg"
        className={fieldClass}
      />
      <TextField
        name="password"
        type="password"
        label="Senha"
        hideLabel
        placeholder="Senha"
        autoComplete="new-password"
        error={errors.password}
        hint="Ao menos 8 caracteres, com letras e números."
        size="lg"
        className={fieldClass}
      />
      <TextField
        name="confirmPassword"
        type="password"
        label="Confirmar senha"
        hideLabel
        placeholder="Confirmar senha"
        autoComplete="new-password"
        error={errors.confirmPassword}
        size="lg"
        className={fieldClass}
      />

      <p role="alert" className="text-center text-sm text-destructive empty:hidden">
        {formError}
      </p>

      <button
        type="submit"
        disabled={register.isPending}
        aria-busy={register.isPending}
        className="mt-5 h-[60px] rounded-[10px] bg-primary text-base leading-4 font-bold text-ink hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-ink focus-visible:outline-none disabled:opacity-70 md:mt-3 md:h-[45px] md:rounded-[5px] md:focus-visible:ring-offset-surface-card"
      >
        <span className="md:hidden">{register.isPending ? 'Criando...' : 'Criar perfil'}</span>
        <span className="hidden md:inline">
          {register.isPending ? 'Criando...' : 'Criar conta'}
        </span>
      </button>
    </form>
  )
}
