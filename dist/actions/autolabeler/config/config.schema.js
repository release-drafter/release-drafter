import { z } from "../../../external.js";
import { c as coreExports } from "../../../core.js";
import { stringToRegex } from "../../../common/string-to-regex.js";
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
  ).min(1).transform(
    (autolabels) => (
      // convert 'branch', 'title' and 'body' to regex and remove invalid entries
      autolabels.map((autolabel) => {
        try {
          return {
            ...autolabel,
            branch: autolabel.branch.map((reg) => {
              return stringToRegex(reg);
            }),
            title: autolabel.title.map((reg) => {
              return stringToRegex(reg);
            }),
            body: autolabel.body.map((reg) => {
              return stringToRegex(reg);
            })
          };
        } catch {
          coreExports.warning(
            `Bad autolabeler regex: '${autolabel.branch}', '${autolabel.title}' or '${autolabel.body}'`
          );
          return false;
        }
      }).filter((a) => !!a)
    )
  )
});
export {
  configSchema
};
