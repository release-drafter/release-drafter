import type * as z from 'zod'
import { boolean, iso, object, string, stringbool } from 'zod'

/**
 * Configuration parameters that can be specified in both
 * the config file or the action input.
 *
 * Default values cannot be defined here,
 * as action inputs may override config file values.
 *
 * @see merge-input-and-config.ts for how the merging of config and input is handled, including default values.
 */
export const commonConfigSchema = object({
  /**
   * A boolean indicating whether the release being created or updated should be marked as latest.
   */
  latest: stringbool().or(boolean()).optional(),
  /**
   * Whether to draft a prerelease, with changes since another prerelease (if applicable). Default `false`.
   */
  prerelease: stringbool().or(boolean()).optional(),
  /**
   * A string indicating an identifier (alpha, beta, rc, etc), to increment the prerelease version. This automatically enables `prerelease` if not already set to `true`. Default `''`.
   */
  'prerelease-identifier': string().optional(),
  /**
   * When looking for the last published release to scan changes up-to, include pre-releases. Has no effect if using `prerelease: true` (already enabled). Default `false`.
   */
  'include-pre-releases': stringbool().or(boolean()).optional(),
  /**
   * The release target, i.e. branch or commit it should point to. Default: the ref that release-drafter runs for, e.g. `refs/heads/master` if configured to run on pushes to `master`.
   */
  commitish: string().optional(),
  /**
   * A string that would be added before the template body.
   */
  header: string().optional(),
  /**
   * A string that would be added after the template body.
   */
  footer: string().optional(),
  /**
   * Filter releases that satisfies this semver range. Evaluates the tag name againts node's semver.satisfies().
   */
  'filter-by-range': string().optional(),
})

/**
 * Configuration parameters that can be specified in both
 * the config file or the action input.
 */
export type CommonConfig = z.infer<typeof commonConfigSchema>
