import "../../../../lodash.js";
import "../../../../lexer.js";
import "path";
import "fs";
import "../../../../core.js";
import "../../../../github.js";
import "../../../../index.js";
import { sharedInputSchema } from "../../../../common/shared-input.schema.js";
import { z } from "../../../../external.js";
import { commonConfigSchema } from "./common-config.schema.js";
const exclusiveInputSchema = z.object({
  /**
   * If your workflow requires multiple release-drafter configs it be helpful to override the config-name.
   * The config should still be located inside `.github` as that's where we are looking for config files.
   * @default 'release-drafter.yml'
   */
  "config-name": z.string().optional().default("release-drafter.yml"),
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
}).and(sharedInputSchema);
const actionInputSchema = exclusiveInputSchema.and(commonConfigSchema);
export {
  actionInputSchema,
  exclusiveInputSchema
};
