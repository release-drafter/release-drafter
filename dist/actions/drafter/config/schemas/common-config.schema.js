import { z } from "../../../../external.js";
import { g as githubExports } from "../../../../github.js";
const commonConfigSchema = z.object({
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
  "initial-commits-since": z.iso.datetime().optional(),
  /**
   * A string indicating an identifier (alpha, beta, rc, etc), to increment the prerelease version.
   */
  "prerelease-identifier": z.string().optional(),
  /**
   * The release target, i.e. branch or commit it should point to. Default: the ref that release-drafter runs for, e.g. `refs/heads/master` if configured to run on pushes to `master`.
   */
  commitish: z.string().optional().default(() => githubExports.context.ref || githubExports.context.payload.ref),
  /**
   * A string that would be added before the template body.
   */
  header: z.string().optional(),
  /**
   * A string that would be added after the template body.
   */
  footer: z.string().optional()
}).superRefine((config, ctx) => {
  if (config.latest && config.prerelease) {
    ctx.addIssue({
      code: "custom",
      message: "'prerelease' and 'latest' cannot both be truthy."
    });
  }
});
export {
  commonConfigSchema
};
