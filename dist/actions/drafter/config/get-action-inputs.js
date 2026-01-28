import { c as coreExports } from "../../../core.js";
import { actionInputSchema } from "./action-input.schema.js";
const getActionInput = () => {
  const getInput = (name) => coreExports.getInput(name) || void 0;
  return actionInputSchema.parse({
    // exclusive to action input
    "config-name": getInput("config-name"),
    name: getInput("name"),
    tag: getInput("tag"),
    version: getInput("version"),
    publish: getInput("publish"),
    token: getInput("token"),
    // can override the config
    latest: getInput("latest"),
    prerelease: getInput("prerelease"),
    "initial-commits-since": getInput("initial-commits-since"),
    "prerelease-identifier": getInput("prerelease-identifier"),
    commitish: getInput("commitish"),
    header: getInput("header"),
    footer: getInput("footer")
  });
};
export {
  getActionInput
};
