import { c as coreExports } from "../core.js";
import { actionInputSchema } from "../types/action-input.schema.js";
import "../types/config.schema.js";
const getActionInput = () => {
  const getInput = (name) => coreExports.getInput(name) || void 0;
  return actionInputSchema.parse({
    "config-name": getInput("config-name"),
    token: getInput("token"),
    name: getInput("name"),
    tag: getInput("tag"),
    version: getInput("version"),
    publish: getInput("publish"),
    latest: getInput("latest"),
    prerelease: getInput("prerelease"),
    "prerelease-identifier": getInput("prerelease-identifier"),
    commitish: getInput("commitish"),
    header: getInput("header"),
    footer: getInput("footer"),
    "initial-commits-since": getInput("initial-commits-since"),
    "disable-releaser": getInput("disable-releaser"),
    "disable-autolabeler": getInput("disable-autolabeler")
  });
};
export {
  getActionInput
};
//# sourceMappingURL=get-action-inputs.js.map
