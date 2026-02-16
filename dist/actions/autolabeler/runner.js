import { c as coreExports } from "../../core.js";
import { main } from "./main.js";
import "./config/config.schema.js";
import "./config/action-input.schema.js";
import { getActionInput } from "./config/get-action-inputs.js";
import "../../lexer.js";
import { getConfig } from "./config/get-config.js";
import "../../lodash.js";
import "path";
import "fs";
import "../../github.js";
import "../../index.js";
import "../../common/shared-input.schema.js";
async function run() {
  try {
    const input = getActionInput();
    const config = await getConfig(input["config-name"]);
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
