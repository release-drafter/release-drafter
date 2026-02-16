import { c as coreExports } from "../../../core.js";
import { configSchema } from "./schemas/config.schema.js";
import { composeConfigGet } from "../../../common/config/index.js";
import "../../../index.js";
import { c as context } from "../../../github.js";
import "../../../lodash.js";
import "../../../common/shared-input.schema.js";
const getConfig = async (configName) => {
  const { config, contexts } = await composeConfigGet(configName, context);
  if (contexts.length) {
    coreExports.info(`Config was fetched from ${contexts.length} different contexts.`);
  } else {
    coreExports.info(
      `Config fetched ${contexts[0].scheme === "file" ? "locally." : `on remote "${contexts[0].repo.owner}/${contexts[0].repo.repo}${contexts[0].ref ? `@${contexts[0].ref}` : ""}"${!contexts[0].ref ? " on the default branch" : ""}`}.`
    );
  }
  return configSchema.parse(config);
};
export {
  getConfig
};
