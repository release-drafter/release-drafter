import { c as coreExports } from "../../core.js";
import { main } from "./main.js";
import { loadConfigFile } from "../../common/load-config-file.js";
import "../../index.js";
import "../../github.js";
import "../../lodash.js";
import "../../common/common-input.schema.js";
import "./config/config.schema.js";
import "./config/action-input.schema.js";
import { getActionInput } from "./config/get-action-inputs.js";
import { parseConfigFile } from "./config/parse-config-file.js";
async function run() {
  try {
    const input = getActionInput();
    const config = await parseConfigFile(loadConfigFile(input["config-name"]));
    const { labels, pr_number } = await main({ config });
    if (pr_number) coreExports.setOutput("number", pr_number);
    if (labels) coreExports.setOutput("labels", labels);
  } catch (error) {
    if (error instanceof Error) coreExports.setFailed(error.message);
  }
}
export {
  run
};
