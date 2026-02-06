import { setActionOutput } from "./set-action-output.js";
import { actionInputSchema, exclusiveInputSchema } from "./schemas/action-input.schema.js";
import { commonConfigSchema } from "./schemas/common-config.schema.js";
import { configSchema, exclusiveConfigSchema, replacersSchema } from "./schemas/config.schema.js";
import { getActionInput } from "./get-action-inputs.js";
import { mergeInputAndConfig } from "./merge-input-and-config.js";
import { getConfig } from "./get-config.js";
export {
  actionInputSchema,
  commonConfigSchema,
  configSchema,
  exclusiveConfigSchema,
  exclusiveInputSchema,
  getActionInput,
  getConfig,
  mergeInputAndConfig,
  replacersSchema,
  setActionOutput
};
