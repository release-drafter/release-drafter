import { c as coreExports } from "../../../core.js";
import "../../../lodash.js";
import "../../../lexer.js";
import "path";
import "fs";
import "../../../github.js";
import { stringToRegex } from "../../../common/string-to-regex.js";
import "../../../common/shared-input.schema.js";
const parseConfig = ({ config: originalConfig }) => {
  const config = structuredClone(originalConfig);
  const autolabeler = config.autolabeler.map((autolabel) => {
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
  }).filter((a) => !!a);
  const parsedConfig = {
    ...config,
    autolabeler
  };
  return parsedConfig;
};
export {
  parseConfig
};
