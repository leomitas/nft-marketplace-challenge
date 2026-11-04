import { z } from 'zod'

/** Non-negative decimal string, e.g. "1.19". Never a JS number. */
export const ethAmountSchema = z.string().regex(/^\d+(\.\d{1,18})?$/, 'Valor em ETH inválido')

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    fields: z.record(z.string(), z.string()).optional(),
  }),
})
export type ApiErrorBody = z.infer<typeof apiErrorSchema>
