import { commonInputSchema } from 'src/common'
import z from 'zod'

export const actionInputSchema = z
  .object({
    /**
     * If your workflow requires multiple release-drafter configs it be helpful to override the config-name.
     * The config should still be located inside `.github` as that's where we are looking for config files.
     * @default 'autolabeler.yml'
     */
    'config-name': z.string().optional().default('autolabeler.yml')
  })
  .and(commonInputSchema)

/**
 * Full action inputs
 */
export type ActionInput = z.infer<typeof actionInputSchema>
