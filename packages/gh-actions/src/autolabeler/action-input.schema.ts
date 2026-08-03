import type * as z from 'zod'
import { object, string } from 'zod'
import { sharedInputSchema } from '../common/shared-input.schema.ts'

export const actionInputSchema = object({
  'config-name': string().optional().default('release-drafter.yml'),
}).and(sharedInputSchema)
export type ActionInput = z.infer<typeof actionInputSchema>
