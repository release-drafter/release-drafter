import { c as coreExports } from "../../../core.js";
import { actionInputSchema } from "./action-input.schema.js";
const getActionInput = () => {
  const getInput = (name) => coreExports.getInput(name) || void 0;
  return actionInputSchema.parse({
    "config-name": getInput("config-name"),
    token: getInput("token")
  });
};
export {
  getActionInput
};
