import { sharedInputSchema } from 'src/common'
import type * as z from 'zod'
import { boolean, object, string, stringbool } from 'zod'

export const actionInputSchema = object({
  /**
   * If your workflow requires multiple release-drafter configs it be helpful to override the config-name.
   * The config should still be located inside `.github` as that's where we are looking for config files.
   * @default 'release-drafter.yml'
   */
  'config-name': string().optional().default('release-drafter.yml'),
  /**
   * A boolean indicating whether the autolabeler mode is disabled.
   * When true, the autolabeler will skip labeling entirely.
   */
  'disable-autolabeler': stringbool().or(boolean()).optional(),
}).and(sharedInputSchema)

/**
 * Full action inputs
 */
export type ActionInput = z.infer<typeof actionInputSchema>
