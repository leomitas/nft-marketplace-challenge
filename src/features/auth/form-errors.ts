import type { z } from 'zod'
import { ApiError } from '@/api/client'

export type FieldErrors = Record<string, string>

/** First message per field from a failed zod parse. */
export function zodFieldErrors(error: z.ZodError): FieldErrors {
  const fields: FieldErrors = {}
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form')
    fields[key] ??= issue.message
  }
  return fields
}

/** Splits an API error into field messages (422/409) and a form-level message. */
export function apiFormErrors(error: unknown): { fields: FieldErrors; form?: string } {
  if (error instanceof ApiError) {
    if (error.fields && Object.keys(error.fields).length) {
      return { fields: error.fields, form: error.message }
    }
    return { fields: {}, form: error.message }
  }
  return { fields: {}, form: 'Algo deu errado. Tente novamente.' }
}

/** Moves focus to the first invalid field, so keyboard and screen-reader users land on it. */
export function focusFirstError(form: HTMLFormElement, fields: FieldErrors) {
  const first = Object.keys(fields)[0]
  if (!first) return
  const input = form.elements.namedItem(first)
  if (input instanceof HTMLElement) input.focus()
}
