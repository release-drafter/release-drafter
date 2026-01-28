import { c as coreExports } from "../../core.js";
import { main } from "./main.js";
import { loadConfigFile } from "../../common/load-config-file.js";
import "../../index.js";
import "../../github.js";
import "../../lodash.js";
import "../../common/common-input.schema.js";
import { setActionOutput } from "./config/set-action-output.js";
import "./config/config.schema.js";
import "./config/action-input.schema.js";
import { getActionInput } from "./config/get-action-inputs.js";
import { mergeInputAndConfig } from "./config/merge-input-and-config.js";
import { parseConfigFile } from "./config/parse-config-file.js";
async function run() {
  try {
    coreExports.info("Parsing inputs and configuration...");
    const input = getActionInput();
    const config = mergeInputAndConfig({
      config: await parseConfigFile(loadConfigFile(input["config-name"])),
      input
    });
    const { upsertedRelease, releasePayload } = await main({ input, config });
    setActionOutput({
      upsertedRelease,
      releasePayload
    });
  } catch (error) {
    if (error instanceof Error) coreExports.setFailed(error.message);
  }
}
export {
  run
};
