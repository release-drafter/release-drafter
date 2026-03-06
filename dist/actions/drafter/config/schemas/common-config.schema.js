import { z } from "../../../../external.js";
const commonConfigSchema = z.object({
  /**
   * A boolean indicating whether the release being created or updated should be marked as latest.
   */
  latest: z.stringbool().or(z.boolean()).optional(),
  /**
   * Whether to draft a prerelease, with changes since another prerelease (if applicable). Default `false`.
   */
  prerelease: z.stringbool().or(z.boolean()).optional(),
  /**
   * When drafting your first release, limit the amount of scanned commits. Expects an ISO 8601 date. Default: undefined (scan all commits).
   * @see https://zod.dev/api?id=iso-dates#iso-datetimes
   */
  "initial-commits-since": z.iso.datetime().optional(),
  /**
   * A string indicating an identifier (alpha, beta, rc, etc), to increment the prerelease version. This automatically enables `prerelease` if not already set to `true`. Default `''`.
   */
  "prerelease-identifier": z.string().optional(),
  /**
   * The release target, i.e. branch or commit it should point to. Default: the ref that release-drafter runs for, e.g. `refs/heads/master` if configured to run on pushes to `master`.
   */
  commitish: z.string().optional(),
  /**
   * A string that would be added before the template body.
   */
  header: z.string().optional(),
  /**
   * A string that would be added after the template body.
   */
  footer: z.string().optional()
});
export {
  commonConfigSchema
};
