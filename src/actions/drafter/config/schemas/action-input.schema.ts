import type * as z from 'zod'
import { object, string, stringbool } from 'zod'
import { sharedInputSchema } from '#src/common/index.ts'
import { commonConfigSchema } from './common-config.schema.ts'

export const exclusiveInputSchema = object({
  /**
   * If your workflow requires multiple release-drafter configs it be helpful to override the config-name.
   * The config should still be located inside `.github` as that's where we are looking for config files.
   * @default 'release-drafter.yml'
   */
  'config-name': string().optional().default('release-drafter.yml'),
  /**
   * The name that will be used in the GitHub release that's created or updated.
   * This will override any `name-template` specified in your `release-drafter.yml` if defined.
   */
  name: string().optional(),
  /**
   * The tag name to be associated with the GitHub release that's created or updated.
   * This will override any `tag-template` specified in your `release-drafter.yml` if defined.
   */
  tag: string().optional(),
  /**
   * The version to be associated with the GitHub release that's created or updated.
   * This will override any version calculated by the release-drafter.
   */
  version: string().optional(),
  /**
   * A boolean indicating whether the release being created or updated should be immediately published.
   */
  publish: stringbool().optional().default(false),
}).and(sharedInputSchema)

export const actionInputSchema = exclusiveInputSchema.and(commonConfigSchema)

/**
 * Full action inputs
 *
 * For the action inputs exclusive to the action input, see `ExclusiveInput`
 *
 * For the action inputs that override configurations from the config-file, see `CommonConfig`
 */
export type ActionInput = z.infer<typeof actionInputSchema>

/**
 * Inputs exclusive to the action input
 *
 * For the full action inputs, see `ActionInput`
 *
 * For the action inputs that override configurations from the config-file, see `CommonConfig`
 */
export type ExclusiveInput = z.infer<typeof exclusiveInputSchema>
