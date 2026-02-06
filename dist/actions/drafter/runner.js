import { c as coreExports } from "../../core.js";
import { main } from "./main.js";
import { setActionOutput } from "./config/set-action-output.js";
import "./config/schemas/action-input.schema.js";
import "./config/schemas/common-config.schema.js";
import "./config/schemas/config.schema.js";
import { getActionInput } from "./config/get-action-inputs.js";
import { mergeInputAndConfig } from "./config/merge-input-and-config.js";
import { getConfig } from "./config/get-config.js";
async function run() {
  try {
    coreExports.info("Parsing inputs and configuration...");
    const input = getActionInput();
    const config = mergeInputAndConfig({
      config: await getConfig(input["config-name"]),
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
