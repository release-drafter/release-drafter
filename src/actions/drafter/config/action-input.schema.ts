import { context } from '@actions/github'
import { commonInputSchema } from 'src/common'
import z from 'zod'

export const exclusiveInputSchema = z
  .object({
    /**
     * If your workflow requires multiple release-drafter configs it be helpful to override the config-name.
     * The config should still be located inside `.github` as that's where we are looking for config files.
     * @default 'release-drafter.yml'
     */
    'config-name': z.string().optional().default('release-drafter.yml'),
    /**
     * The name that will be used in the GitHub release that's created or updated.
     * This will override any `name-template` specified in your `release-drafter.yml` if defined.
     */
    name: z.string().optional(),
    /**
     * The tag name to be associated with the GitHub release that's created or updated.
     * This will override any `tag-template` specified in your `release-drafter.yml` if defined.
     */
    tag: z.string().optional(),
    /**
     * The version to be associated with the GitHub release that's created or updated.
     * This will override any version calculated by the release-drafter.
     */
    version: z.string().optional(),
    /**
     * A boolean indicating whether the release being created or updated should be immediately published.
     */
    publish: z.stringbool().optional().default(false)
  })
  .and(commonInputSchema)

export const configOverridesInputSchema = z.object({
  /**
   * A boolean indicating whether the release being created or updated should be marked as latest.
   */
  latest: z.stringbool().optional().default(true),
  /**
   * A boolean indicating whether the release being created or updated is a prerelease.
   */
  prerelease: z.stringbool().optional().default(false),
  /**
   * When drafting your first release, limit the amount of scanned commits. Expects an ISO 8601 date. Default: undefined (scan all commits).
   * @see https://zod.dev/api?id=iso-dates#iso-datetimes
   */
  'initial-commits-since': z.iso.datetime().optional(),
  /**
   * A string indicating an identifier (alpha, beta, rc, etc), to increment the prerelease version.
   */
  'prerelease-identifier': z.string().optional(),
  /**
   * A string specifying the target branch for the release being created.
   */
  commitish: z
    .string()
    .optional()
    .default(context.ref || context.payload.ref),
  /**
   * A string that would be added before the template body.
   */
  header: z.string().optional(),
  /**
   * A string that would be added after the template body.
   */
  footer: z.string().optional()
})

export const actionInputSchema = exclusiveInputSchema.and(
  configOverridesInputSchema
)

/**
 * Full action inputs
 *
 * For the action inputs exclusive to the action input, see `ExclusiveInput`
 *
 * For the action inputs that override configurations from the config-file, see `ConfigOverridesInput`
 */
export type ActionInput = z.infer<typeof actionInputSchema>

/**
 * Inputs exclusive to the action input
 *
 * For the full action inputs, see `ActionInput`
 *
 * For the action inputs that override configurations from the config-file, see `ConfigOverridesInput`
 */
export type ExclusiveInput = z.infer<typeof exclusiveInputSchema>

/**
 * Inputs that override configurations from the config-file
 *
 * For the full action inputs, see `ActionInput`
 *
 * For the action inputs exclusive to the action input, see `ExclusiveInput`
 */
export type ConfigOverridesInput = z.infer<typeof configOverridesInputSchema>
