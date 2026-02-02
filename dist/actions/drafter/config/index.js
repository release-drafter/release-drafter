import { setActionOutput } from "./set-action-output.js";
import { configSchema, replacersSchema } from "./config.schema.js";
import { actionInputSchema, configOverridesInputSchema, exclusiveInputSchema } from "./action-input.schema.js";
import { getActionInput } from "./get-action-inputs.js";
import { mergeInputAndConfig } from "./merge-input-and-config.js";
import { getConfig } from "./get-config.js";
export {
  actionInputSchema,
  configOverridesInputSchema,
  configSchema,
  exclusiveInputSchema,
  getActionInput,
  getConfig,
  mergeInputAndConfig,
  replacersSchema,
  setActionOutput
};
