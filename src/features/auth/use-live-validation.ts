import { useRef, useState, type FocusEvent, type FormEvent } from 'react'
import type { z } from 'zod'
import { zodFieldErrors, type FieldErrors } from './form-errors'

type Parsed<T> = { success: true; data: T } | { success: false; fields: FieldErrors }

/**
 * Form validation that stays in sync with what the user types. A field is validated once the
 * form is submitted, or when the user leaves it after typing something; from then on every
 * change revalidates it, so the message updates (e.g. the password's missing requirement) or
 * disappears as soon as the value is fixed.
 *
 * Errors set from the API (conflicts, wrong password) belong to the value that was sent: they
 * are cleared when that field changes, but are not recomputed from the schema.
 *
 * Attach `onChange`/`onBlur` to the <form> (both bubble from its fields) and call `submit` in
 * `onSubmit`.
 */
export function useLiveValidation<T>(
  schema: z.ZodType<T>,
  // Values to validate; defaults to the form's named fields
  read: (form: HTMLFormElement) => unknown = (form) => Object.fromEntries(new FormData(form)),
) {
  const [errors, setErrors] = useState<FieldErrors>({})
  const submitted = useRef(false)
  const touched = useRef(new Set<string>())
  // Errors not derived from the schema (API answers, external checks): never recomputed here
  const fromApi = useRef(new Set<string>())

  const isLive = (name: string) => submitted.current || touched.current.has(name)

  function check(form: HTMLFormElement): Parsed<T> {
    const parsed = schema.safeParse(read(form))
    return parsed.success
      ? { success: true, data: parsed.data }
      : { success: false, fields: zodFieldErrors(parsed.error) }
  }

  /** Recomputes the live fields (the edited one, plus dependants like "confirm password"). */
  function revalidate(form: HTMLFormElement, edited: string) {
    fromApi.current.delete(edited)
    const result = check(form)
    const fields = result.success ? {} : result.fields
    setErrors((prev) => {
      const next = { ...prev }
      const names = new Set([edited, ...Object.keys(prev), ...Object.keys(fields)])
      for (const name of names) {
        if (!isLive(name) || fromApi.current.has(name)) continue
        if (fields[name]) next[name] = fields[name]
        else delete next[name]
      }
      return next
    })
  }

  function fieldName(event: FormEvent<HTMLFormElement>) {
    const target = event.target as Partial<HTMLInputElement>
    return typeof target.name === 'string' && target.name ? target.name : null
  }

  return {
    errors,
    onChange(event: FormEvent<HTMLFormElement>) {
      const name = fieldName(event)
      if (name && (isLive(name) || errors[name])) revalidate(event.currentTarget, name)
    },
    onBlur(event: FocusEvent<HTMLFormElement>) {
      const name = fieldName(event)
      const value = (event.target as Partial<HTMLInputElement>).value
      // Leaving an untouched empty field is not an error yet; leaving one with content is
      if (!name || touched.current.has(name) || !value) return
      // Focus going to this form's submit button: the submit validates everything anyway, and
      // showing the message now would shift the layout between mousedown and mouseup, so the
      // click could miss the button
      const next = event.relatedTarget
      if (
        next instanceof HTMLButtonElement &&
        next.type === 'submit' &&
        event.currentTarget.contains(next)
      ) {
        return
      }
      touched.current.add(name)
      revalidate(event.currentTarget, name)
    },
    /** Validates the whole form; from now on every field revalidates as the user types. */
    submit(form: HTMLFormElement): Parsed<T> {
      submitted.current = true
      fromApi.current.clear()
      const result = check(form)
      setErrors(result.success ? {} : result.fields)
      return result
    },
    /** Back to the pristine state (e.g. after the form was saved and cleared). */
    reset() {
      submitted.current = false
      touched.current.clear()
      fromApi.current.clear()
      setErrors({})
    },
    /** Field errors returned by the API for the values just sent. */
    setApiErrors(fields: FieldErrors) {
      fromApi.current = new Set(Object.keys(fields))
      setErrors(fields)
    },
    /** Errors that don't come from the schema (e.g. wallet not connected); kept until cleared. */
    setError(name: string, message?: string) {
      if (message) fromApi.current.add(name)
      else fromApi.current.delete(name)
      setErrors((prev) => {
        const next = { ...prev }
        if (message) next[name] = message
        else delete next[name]
        return next
      })
    },
  }
}
