import { c as coreExports } from "../../core.js";
import { main } from "./main.js";
import { getActionInput } from "../../common/get-action-inputs.js";
import { loadConfigFile } from "../../common/load-config-file.js";
import { mergeInputAndConfig } from "../../common/merge-input-and-config.js";
import { parseConfigFile } from "../../common/parse-config-file.js";
import "../../common/string-to-regex.js";
import "../../github.js";
import "../../lodash.js";
async function run() {
  try {
    const input = getActionInput();
    const config = mergeInputAndConfig({
      config: await parseConfigFile(loadConfigFile(input["config-name"])),
      input
    });
    await main({ input, config });
  } catch (error) {
    if (error instanceof Error) coreExports.setFailed(error.message);
  }
}
export {
  run
};
//# sourceMappingURL=runner.js.map
