import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { loginRequestSchema } from '@/api/contracts/auth'
import { TextField } from '@/components/form/text-field'
import { apiFormErrors, focusFirstError } from './form-errors'
import { useLiveValidation } from './use-live-validation'
import { useLogin } from './use-session'

export function LoginForm({ redirect }: { redirect: string }) {
  const login = useLogin()
  const navigate = useNavigate()
  const validation = useLiveValidation(loginRequestSchema)
  const errors = validation.errors
  const [formError, setFormError] = useState<string>()

  return (
    <form
      noValidate
      aria-describedby={formError ? 'login-error' : undefined}
      onChange={validation.onChange}
      onBlur={validation.onBlur}
      onSubmit={(event) => {
        event.preventDefault()
        if (login.isPending) return
        const form = event.currentTarget
        const parsed = validation.submit(form)
        setFormError(undefined)
        if (!parsed.success) {
          focusFirstError(form, parsed.fields)
          return
        }
        login.mutate(parsed.data, {
          // Back to where the user was (e.g. the NFT they tried to favorite)
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
        name="email"
        type="email"
        label="E-mail"
        hideLabel
        placeholder="contato@email.com"
        autoComplete="email"
        error={errors.email}
        size="lg"
        className="md:[&_input]:h-10 md:[&_input]:rounded-[5px]"
      />
      <TextField
        name="password"
        type="password"
        label="Senha"
        hideLabel
        placeholder="Senha"
        autoComplete="current-password"
        error={errors.password}
        size="lg"
        className="md:[&_input]:h-10 md:[&_input]:rounded-[5px]"
      />
      <p className="text-right text-sm leading-4 text-text-accent" title="Disponível em breve">
        Esqueceu a senha?
        <span className="sr-only"> (disponível em breve)</span>
      </p>

      <p
        id="login-error"
        role="alert"
        className="text-center text-sm text-destructive empty:hidden"
      >
        {formError}
      </p>

      <button
        type="submit"
        disabled={login.isPending}
        aria-busy={login.isPending}
        className="mt-5 h-[60px] rounded-[10px] bg-primary text-base leading-4 font-bold text-ink hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-ink focus-visible:outline-none disabled:opacity-70 md:mt-3 md:h-[45px] md:rounded-[5px] md:focus-visible:ring-offset-surface-card"
      >
        {login.isPending ? 'Entrando...' : 'Entrar'}
      </button>
    </form>
  )
}
