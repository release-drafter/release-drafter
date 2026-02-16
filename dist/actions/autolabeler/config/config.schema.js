import { z } from "../../../external.js";
const configSchema = z.object({
  /**
   * You can add automatically a label into a pull request.
   * Available matchers are `files` (glob), `branch` (regex), `title` (regex) and `body` (regex).
   * Matchers are evaluated independently; the label will be set if at least one of the matchers meets the criteria.
   */
  autolabeler: z.array(
    z.object({
      label: z.string().min(1),
      files: z.array(z.string().min(1)).optional().default([]),
      branch: z.array(z.string().min(1)).optional().default([]),
      title: z.array(z.string().min(1)).optional().default([]),
      body: z.array(z.string().min(1)).optional().default([])
    })
  ).min(1)
}).meta({
  title: "JSON schema for Release Drafter's autolabeler action config.",
  id: "https://github.com/release-drafter/release-drafter/blob/master/autolabeler/schema.json"
});
export {
  configSchema
};
