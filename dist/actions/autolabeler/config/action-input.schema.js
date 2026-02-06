import "../../../lodash.js";
import "../../../lexer.js";
import "path";
import "fs";
import "../../../core.js";
import "../../../github.js";
import "../../../index.js";
import { sharedInputSchema } from "../../../common/shared-input.schema.js";
import { z } from "../../../external.js";
const actionInputSchema = z.object({
  /**
   * If your workflow requires multiple release-drafter configs it be helpful to override the config-name.
   * The config should still be located inside `.github` as that's where we are looking for config files.
   * @default 'autolabeler.yml'
   */
  "config-name": z.string().optional().default("autolabeler.yml")
}).and(sharedInputSchema);
export {
  actionInputSchema
};
