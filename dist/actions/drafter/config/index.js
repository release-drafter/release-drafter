import { setActionOutput } from "./set-action-output.js";
import { configSchema, replacersSchema } from "./config.schema.js";
import { actionInputSchema, configOverridesInputSchema, exclusiveInputSchema } from "./action-input.schema.js";
import { getActionInput } from "./get-action-inputs.js";
import { mergeInputAndConfig } from "./merge-input-and-config.js";
import { parseConfigFile } from "./parse-config-file.js";
export {
  actionInputSchema,
  configOverridesInputSchema,
  configSchema,
  exclusiveInputSchema,
  getActionInput,
  mergeInputAndConfig,
  parseConfigFile,
  replacersSchema,
  setActionOutput
};
