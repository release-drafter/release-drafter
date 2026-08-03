import type * as z from 'zod'
import { object, string } from 'zod'
import { tokenInputSchema } from '../common/shared-input.schema.ts'

export const actionInputSchema = object({
  'config-name': string().optional().default('release-drafter.yml'),
}).and(tokenInputSchema)

export type ActionInput = z.infer<typeof actionInputSchema>
