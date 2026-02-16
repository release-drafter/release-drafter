import { c as coreExports } from "../../core.js";
import { main } from "./main.js";
import "./config/config.schema.js";
import "./config/action-input.schema.js";
import { getActionInput } from "./config/get-action-inputs.js";
import "../../lexer.js";
import { getConfig } from "./config/get-config.js";
import { parseConfig } from "./config/parse-config.js";
async function run() {
  try {
    const input = getActionInput();
    const config = parseConfig({
      config: await getConfig(input["config-name"])
    });
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
