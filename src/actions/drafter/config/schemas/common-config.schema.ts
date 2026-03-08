import type * as z from 'zod'
import { object, string, stringbool, boolean, iso } from 'zod'

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
   * A boolean indicating whether the release being created or updated is a prerelease.
   */
  prerelease: stringbool().or(boolean()).optional(),
  /**
   * When drafting your first release, limit the amount of scanned commits. Expects an ISO 8601 date. Default: undefined (scan all commits).
   * @see https://zod.dev/api?id=iso-dates#iso-datetimes
   */
  'initial-commits-since': iso.datetime().optional(),
  /**
   * A string indicating an identifier (alpha, beta, rc, etc), to increment the prerelease version.
   */
  'prerelease-identifier': string().optional(),
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
  footer: string().optional()
})

/**
 * Configuration parameters that can be specified in both
 * the config file or the action input.
 */
export type CommonConfig = z.infer<typeof commonConfigSchema>
