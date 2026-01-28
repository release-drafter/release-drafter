import "path";
import "fs";
import "../../../index.js";
import "../../../github.js";
import "../../../core.js";
import "../../../lodash.js";
import { commonInputSchema } from "../../../common/common-input.schema.js";
import { z } from "../../../external.js";
const actionInputSchema = z.object({
  /**
   * If your workflow requires multiple release-drafter configs it be helpful to override the config-name.
   * The config should still be located inside `.github` as that's where we are looking for config files.
   * @default 'autolabeler.yml'
   */
  "config-name": z.string().optional().default("autolabeler.yml")
}).and(commonInputSchema);
export {
  actionInputSchema
};
