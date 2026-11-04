import { z } from 'zod'

/** `?redirect=` is where to go after authenticating; `?reason=expired` explains why we're here. */
export const authSearchSchema = z.object({
  redirect: z.string().optional().catch(undefined),
  reason: z.enum(['expired']).optional().catch(undefined),
})
