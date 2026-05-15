import type * as z from 'zod'
import { object, string } from 'zod'
import { sharedInputSchema } from '#src/common/index.ts'

export const actionInputSchema = object({
  /**
   * If your workflow requires multiple release-drafter configs it be helpful to override the config-name.
   * The config should still be located inside `.github` as that's where we are looking for config files.
   * @default 'release-drafter.yml'
   */
  'config-name': string().optional().default('release-drafter.yml'),
}).and(sharedInputSchema)

/**
 * Full action inputs
 */
export type ActionInput = z.infer<typeof actionInputSchema>
